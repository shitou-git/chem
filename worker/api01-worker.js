/**
 * AI 解释代理 Worker
 *
 * 双通道：
 * 1. 主通道：Agnes（API_KEY secret），质量好
 * 2. 兜底通道：Cloudflare Workers AI（CF_TOKEN secret），不经过 Agnes，避免出口 IP 限流
 *
 * 当 Agnes 返回 429（限流）或网络失败时，自动切换到 Workers AI，
 * 前端无感知，不需要填 key，也不会看到「AI 服务限流」。
 *
 * 绑定：
 * - API_KEY（机密）：Agnes 上游 API Key
 * - CF_TOKEN（机密）：Cloudflare API Token，需包含 Workers AI 权限
 * - CF_ACCOUNT_ID（机密）：Cloudflare 账户 ID
 * - AI_CACHE（可选 KV）：缓存成功结果，减少上游调用
 */

const DEFAULT_UPSTREAM_API = "https://apihub.agnes-ai.com/v1/chat/completions";
const WORKERS_AI_MODEL = "@cf/zai-org/glm-4.7-flash";
const RATE_LIMIT = 30;
const RATE_LIMIT_WINDOW = 60;
const CACHE_TTL_SECONDS = 60 * 60 * 24;

const rateLimitStore = new Map();

function getUpstreamApi() {
  return typeof UPSTREAM_API !== "undefined" && UPSTREAM_API
    ? UPSTREAM_API
    : DEFAULT_UPSTREAM_API;
}

function getCache() {
  return typeof AI_CACHE !== "undefined" && AI_CACHE ? AI_CACHE : null;
}

function getClientKey(request) {
  const ip = request.headers.get("CF-Connecting-IP") || "unknown-ip";
  const origin = request.headers.get("Origin") || request.headers.get("Referer") || "unknown-origin";
  return `${ip}:${origin}`;
}

function checkRateLimit(clientKey) {
  const now = Date.now();
  const windowMs = RATE_LIMIT_WINDOW * 1000;
  const entry = rateLimitStore.get(clientKey) || { count: 0, windowStart: now };

  if (now - entry.windowStart >= windowMs) {
    entry.count = 0;
    entry.windowStart = now;
  }

  if (entry.count >= RATE_LIMIT) {
    const retryAfter = Math.max(1, Math.ceil((entry.windowStart + windowMs - now) / 1000));
    return { allowed: false, remaining: 0, retryAfter };
  }

  entry.count++;
  rateLimitStore.set(clientKey, entry);
  return { allowed: true, remaining: RATE_LIMIT - entry.count, retryAfter: 0 };
}

function hashText(text) {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function addCorsHeaders(headers) {
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  headers.set("Access-Control-Max-Age", "86400");
}

function jsonResponse(data, status = 200, extraHeaders = {}) {
  const headers = new Headers();
  headers.set("Content-Type", "application/json; charset=utf-8");
  addCorsHeaders(headers);
  for (const [key, value] of Object.entries(extraHeaders)) {
    headers.set(key, String(value));
  }
  return new Response(JSON.stringify(data), { status, headers });
}

function decorateResponse(upstreamResponse, rateLimit, extra = {}) {
  const headers = new Headers();
  addCorsHeaders(headers);
  headers.set("Content-Type", upstreamResponse.headers.get("Content-Type") || "text/event-stream; charset=utf-8");
  headers.set("X-Accel-Buffering", "no");
  headers.set("Cache-Control", "no-cache");
  headers.set("X-RateLimit-Limit", String(RATE_LIMIT));
  headers.set("X-RateLimit-Remaining", String(rateLimit.remaining));
  for (const [key, value] of Object.entries(extra)) {
    headers.set(key, String(value));
  }
  return headers;
}

/** 调用 Cloudflare Workers AI（不经过 Agnes，不受其出口 IP 限流影响） */
async function callWorkersAI(bodyText) {
  const token = typeof CF_TOKEN !== "undefined" ? CF_TOKEN : "";
  const accountId = typeof CF_ACCOUNT_ID !== "undefined" ? CF_ACCOUNT_ID : "";
  if (!token || !accountId) return null;

  let body;
  try {
    body = JSON.parse(bodyText);
  } catch {
    return null;
  }
  body.model = WORKERS_AI_MODEL;

  try {
    return await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/v1/chat/completions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      }
    );
  } catch (e) {
    console.warn("Workers AI 兜底请求失败:", e);
    return null;
  }
}

/** 透传流式响应，同时后台写 KV 缓存 */
function streamWithCache(event, upstreamResponse, rateLimit, cacheKey, cache, extra) {
  const headers = decorateResponse(upstreamResponse, rateLimit, extra);
  if (cache && upstreamResponse.body) {
    const [toClient, toCache] = upstreamResponse.body.tee();
    event.waitUntil(
      (async () => {
        try {
          const text = await new Response(toCache).text();
          if (text.length > 0 && text.length < 1024 * 1024) {
            await cache.put(cacheKey, text, { expirationTtl: CACHE_TTL_SECONDS });
          }
        } catch (e) {
          console.warn("写入 AI 缓存失败:", e);
        }
      })()
    );
    return new Response(toClient, { status: 200, headers });
  }
  return new Response(upstreamResponse.body, { status: 200, headers });
}

async function handleRequest(event, request) {
  if (request.method === "OPTIONS") {
    const headers = new Headers();
    addCorsHeaders(headers);
    return new Response(null, { status: 204, headers });
  }

  const rateLimit = checkRateLimit(getClientKey(request));
  if (!rateLimit.allowed) {
    return jsonResponse(
      { error: "请求过于频繁，请稍后再试", retryAfter: rateLimit.retryAfter },
      429,
      { "Retry-After": String(rateLimit.retryAfter) }
    );
  }

  const bodyText = await request.text();
  const cache = getCache();
  const cacheKey = `ai:${hashText(bodyText)}`;

  if (cache) {
    try {
      const cached = await cache.get(cacheKey);
      if (cached) {
        const headers = new Headers({
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache",
          "X-Accel-Buffering": "no",
          "X-Cache": "HIT",
        });
        addCorsHeaders(headers);
        headers.set("X-RateLimit-Remaining", String(rateLimit.remaining));
        return new Response(cached, { status: 200, headers });
      }
    } catch (e) {
      console.warn("读取 AI 缓存失败:", e);
    }
  }

  const apiKey = typeof API_KEY !== "undefined" ? API_KEY : "";
  let upstreamResponse = null;

  // 主通道：Agnes
  if (apiKey) {
    try {
      upstreamResponse = await fetch(getUpstreamApi(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: bodyText,
        cf: { cacheTtl: 0, cacheEverything: false },
      });
    } catch (e) {
      console.warn("Agnes 请求失败，尝试 Workers AI:", e);
      upstreamResponse = null;
    }
  }

  const agnesOk = upstreamResponse && upstreamResponse.ok;
  const agnesLimited = upstreamResponse && upstreamResponse.status === 429;

  if (agnesOk) {
    return streamWithCache(event, upstreamResponse, rateLimit, cacheKey, cache, {
      "X-AI-Provider": "agnes",
      "X-Cache": "MISS",
    });
  }

  // 兜底通道：Workers AI（Agnes 限流、失败或未配置时）
  const fallback = await callWorkersAI(bodyText);
  if (fallback && fallback.ok) {
    return streamWithCache(event, fallback, rateLimit, cacheKey, cache, {
      "X-AI-Provider": "workers-ai",
      "X-Cache": "MISS",
    });
  }

  // 两条通道都不可用：返回结构化错误，前端走本地资料兜底
  if (agnesLimited) {
    const retryAfterRaw = upstreamResponse.headers.get("Retry-After");
    const retryAfter = Number(retryAfterRaw);
    const seconds = Number.isFinite(retryAfter) && retryAfter > 0 ? Math.ceil(retryAfter) : undefined;
    return jsonResponse(
      {
        error: seconds
          ? `AI 服务限流，约 ${seconds} 秒后可重试`
          : "AI 服务限流，请稍后再试",
        retryAfter: seconds,
      },
      429,
      { "X-Upstream-Error": "rate-limited" }
    );
  }

  if (upstreamResponse && !upstreamResponse.ok) {
    const errorText = await upstreamResponse.text();
    return jsonResponse(
      { error: `AI 服务返回 ${upstreamResponse.status}`, detail: errorText.slice(0, 200) },
      upstreamResponse.status
    );
  }

  return jsonResponse({ error: "AI 服务暂时不可用，请稍后重试" }, 503);
}

addEventListener("fetch", (event) => {
  event.respondWith(handleRequest(event, event.request));
});
