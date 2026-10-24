/**
 * Cloudflare Worker for Film-Chain Studio
 * 1. 提供 /api/proxy 反向代理，徹底解決前端調用雲端影片 API (Seedance / ByteDance / fal.ai) 的跨域 (CORS) 阻擋
 * 2. 靜態檔案自動由 Cloudflare Assets 分發
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // ==================== 1. CORS 反向代理端點 ====================
    if (url.pathname.startsWith("/api/proxy")) {
      // 處理瀏覽器 CORS 預檢請求 (OPTIONS)
      if (request.method === "OPTIONS") {
        return new Response(null, {
          status: 204,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Target-URL, X-Requested-With",
            "Access-Control-Max-Age": "86400",
          },
        });
      }

      // 從 X-Target-URL 或 Query 參數取得目標服務端點
      const targetUrl = request.headers.get("X-Target-URL") || url.searchParams.get("target");
      if (!targetUrl) {
        return new Response(JSON.stringify({ error: "缺少目標 URL (請帶上 X-Target-URL 標頭或 target 參數)" }), {
          status: 400,
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Access-Control-Allow-Origin": "*",
          },
        });
      }

      try {
        // 複製請求標頭並清洗特定內部標頭
        const forwardHeaders = new Headers();
        for (const [key, value] of request.headers.entries()) {
          const lower = key.toLowerCase();
          if (!["host", "cf-connecting-ip", "cf-ray", "cf-visitor", "x-target-url", "origin", "referer"].includes(lower)) {
            forwardHeaders.set(key, value);
          }
        }

        const isBodyAllowed = request.method !== "GET" && request.method !== "HEAD";
        const targetRes = await fetch(targetUrl, {
          method: request.method,
          headers: forwardHeaders,
          body: isBodyAllowed ? request.body : undefined,
        });

        // 複製回應標頭並強制附加寬鬆 CORS 標頭
        const responseHeaders = new Headers(targetRes.headers);
        responseHeaders.set("Access-Control-Allow-Origin", "*");
        responseHeaders.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
        responseHeaders.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Target-URL, X-Requested-With");

        return new Response(targetRes.body, {
          status: targetRes.status,
          statusText: targetRes.statusText,
          headers: responseHeaders,
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: `代理發送失敗: ${err.message}` }), {
          status: 502,
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Access-Control-Allow-Origin": "*",
          },
        });
      }
    }

    // ==================== 2. 靜態前端資源託管 ====================
    if (env && env.ASSETS && typeof env.ASSETS.fetch === "function") {
      return env.ASSETS.fetch(request);
    }

    return new Response("Not Found", { status: 404 });
  },
};
