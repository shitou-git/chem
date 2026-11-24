/**
 * AI 解释代理 Worker
 *
 * 职责：
 * 1. 隐藏 API Key，转发请求到上游模型服务
 * 2. 按客户端做基础限流（修复了原 Retry-After 恒为 0 的问题）
 * 3. 可选：用 KV 缓存相同问题的结果，减少上游调用（对 Cloudflare 1015 限流很关键）
 * 4. 把上游 429/1015 转成结构化 JSON，方便前端做本地资料兜底
 *
 * 绑定（Cloudflare Worker 设置 → 变量和机密）：
 * - API_KEY（机密）：上游 API Key
 * - AI_CACHE（可选 KV 命名空间）：缓存解释结果
 * - UPSTREAM_API（可选变量）：自定义上游地址
 */

const DEFAULT_UPSTREAM_API = "https://apihub.agnes-ai.com/v1/chat/completions";
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
  const headers = new Headers(upstreamResponse.headers);
  addCorsHeaders(headers);
  headers.delete("content-encoding");
  headers.delete("content-length");
  headers.delete("set-cookie");
  headers.set("X-Accel-Buffering", "no");
  headers.set("Cache-Control", "no-cache");
  headers.set("X-RateLimit-Limit", String(RATE_LIMIT));
  headers.set("X-RateLimit-Remaining", String(rateLimit.remaining));
  for (const [key, value] of Object.entries(extra)) {
    headers.set(key, String(value));
  }
  return headers;
}

async function handleRequest(event, request) {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: (() => {
      const headers = new Headers();
      addCorsHeaders(headers);
      return headers;
    })() });
  }

  const apiKey = typeof API_KEY !== "undefined" ? API_KEY : "";
  if (!apiKey) {
    return jsonResponse({ error: "API_KEY 未配置" }, 500);
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

  try {
    const upstreamResponse = await fetch(getUpstreamApi(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: bodyText,
      cf: { cacheTtl: 0, cacheEverything: false },
    });

    // 上游限流（Cloudflare 1015 等）：转成可读 JSON，并透传 Retry-After
    if (upstreamResponse.status === 429) {
      const retryAfterRaw = upstreamResponse.headers.get("Retry-After");
      const retryAfter = Number(retryAfterRaw);
      const seconds = Number.isFinite(retryAfter) && retryAfter > 0 ? Math.ceil(retryAfter) : undefined;
      const headers = new Headers();
      addCorsHeaders(headers);
      headers.set("X-Upstream-Error", "rate-limited");
      if (seconds) headers.set("Retry-After", String(seconds));
      return jsonResponse(
        {
          error: seconds
            ? `上游 AI 服务限流，约 ${seconds} 秒后可重试`
            : "上游 AI 服务限流，请稍后再试",
          retryAfter: seconds,
        },
        429,
        Object.fromEntries(headers.entries())
      );
    }

    if (!upstreamResponse.ok) {
      const errorText = await upstreamResponse.text();
      return jsonResponse(
        { error: `上游 AI 服务返回 ${upstreamResponse.status}`, detail: errorText.slice(0, 200) },
        upstreamResponse.status
      );
    }

    const headers = decorateResponse(upstreamResponse, rateLimit, { "X-Cache": "MISS" });

    // 流式透传，同时后台写入 KV；不阻塞用户收到首字节
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
  } catch (error) {
    return jsonResponse({ error: error && error.message ? error.message : String(error) }, 500);
  }
}

addEventListener("fetch", (event) => {
  event.respondWith(handleRequest(event, event.request));
});
