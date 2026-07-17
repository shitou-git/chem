const UPSTREAM_API = "https://apihub.agnes-ai.com/v1/chat/completions";

async function handleRequest(request) {
  if (request.method === "OPTIONS") {
    return handleCors();
  }

  try {
    const apiKey = API_KEY;
    if (!apiKey) {
      return jsonResponse({ error: "API_KEY 未配置" }, 500);
    }

    // 直接透传 request.body，不要 await request.text()
    // 避免缓冲请求体导致的延迟
    const upstreamResponse = await fetch(UPSTREAM_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + apiKey,
      },
      body: request.body,
      // 禁用 Cloudflare 响应缓冲，确保流式输出逐块传递
      cf: {
        cacheTtl: 0,
        cacheEverything: false,
      },
    });

    const newHeaders = new Headers(upstreamResponse.headers);
    addCorsHeaders(newHeaders);
    newHeaders.delete("content-encoding");
    // 确保流式响应头正确
    newHeaders.set("X-Accel-Buffering", "no");
    newHeaders.set("Cache-Control", "no-cache");

    // 直接透传 response.body，实现真正的流式输出
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
