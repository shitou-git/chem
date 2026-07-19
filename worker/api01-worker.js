const UPSTREAM_API = "https://apihub.agnes-ai.com/v1/chat/completions";

const RATE_LIMIT = 30;
const RATE_LIMIT_WINDOW = 60;

const cache = new Map();

function getClientKey(request) {
  const ip = request.headers.get("CF-Connecting-IP");
  const origin = request.headers.get("Origin") || request.headers.get("Referer") || "unknown";
  return `${ip}:${origin}`;
}

function checkRateLimit(clientKey) {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW * 1000;
  
  const entry = cache.get(clientKey) || { count: 0, windowStart };
  
  if (entry.windowStart < windowStart) {
    entry.count = 0;
    entry.windowStart = windowStart;
  }
  
  if (entry.count >= RATE_LIMIT) {
    return { allowed: false, remaining: 0, retryAfter: Math.ceil((windowStart + RATE_LIMIT_WINDOW * 1000 - now) / 1000) };
  }
  
  entry.count++;
  cache.set(clientKey, entry);
  
  return { allowed: true, remaining: RATE_LIMIT - entry.count, retryAfter: 0 };
}

async function handleRequest(request) {
  if (request.method === "OPTIONS") {
    return handleCors();
  }

  const apiKey = API_KEY;
  if (!apiKey) {
    return jsonResponse({ error: "API_KEY 未配置" }, 500);
  }

  const clientKey = getClientKey(request);
  const rateLimit = checkRateLimit(clientKey);
  
  if (!rateLimit.allowed) {
    const headers = new Headers();
    addCorsHeaders(headers);
    headers.set("Retry-After", String(rateLimit.retryAfter));
    return new Response(JSON.stringify({ error: "请求过于频繁，请稍后再试" }), {
      status: 429,
      headers,
    });
  }

  try {
    const upstreamResponse = await fetch(UPSTREAM_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + apiKey,
      },
      body: request.body,
      cf: {
        cacheTtl: 0,
        cacheEverything: false,
      },
    });

    const newHeaders = new Headers(upstreamResponse.headers);
    addCorsHeaders(newHeaders);
    newHeaders.delete("content-encoding");
    newHeaders.set("X-Accel-Buffering", "no");
    newHeaders.set("Cache-Control", "no-cache");
    newHeaders.set("X-RateLimit-Remaining", String(rateLimit.remaining));
    newHeaders.set("X-RateLimit-Limit", String(RATE_LIMIT));

    return new Response(upstreamResponse.body, {
      status: upstreamResponse.status,
      headers: newHeaders,
    });
  } catch (error) {
    return jsonResponse({ error: error.message }, 500);
  }
}

function handleCors() {
  const headers = new Headers();
  addCorsHeaders(headers);
  return new Response(null, { status: 204, headers });
}

function addCorsHeaders(headers) {
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  headers.set("Access-Control-Max-Age", "86400");
}

function jsonResponse(data, status = 200) {
  const headers = new Headers();
  headers.set("Content-Type", "application/json");
  addCorsHeaders(headers);
  return new Response(JSON.stringify(data), { status, headers });
}

addEventListener("fetch", (event) => {
  event.respondWith(handleRequest(event.request));
});
