/**
 * Cloudflare Worker - Agnes API 流式代理
 *
 * 关键：直接透传 response.body（ReadableStream），不要用 await response.json()
 * 否则会缓冲整个响应，导致流式输出失效
 */

const API_BASE = "https://apihub.agnes-ai.com";
const API_KEY = "在此填入你的 API Key";

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const apiUrl = `${API_BASE}${url.pathname}`;

    // 构建转发请求头
    const headers = new Headers(request.headers);
    headers.set("Authorization", `Bearer ${API_KEY}`);
    headers.delete("host");

    const response = await fetch(apiUrl, {
      method: request.method,
      headers,
      body: request.method === "POST" ? request.body : undefined,
    });

    // 关键：直接返回 response.body，实现流式透传
    // 不要使用 await response.json() 或 await response.text()，那会缓冲整个响应
    const responseHeaders = new Headers(response.headers);
    responseHeaders.set("Access-Control-Allow-Origin", "*");
    responseHeaders.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    responseHeaders.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

    return new Response(response.body, {
      status: response.status,
      headers: responseHeaders,
    });
  },
};
