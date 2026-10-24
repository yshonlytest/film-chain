/**
 * H3 Storyboard Studio - cloudDiagnostics.js
 * 純邏輯：網路請求異常、跨域 (CORS) 阻擋與 API 認證錯誤診斷
 */
(function (root, factory) {
  if (typeof exports === 'object' && typeof module !== 'undefined') {
    module.exports = factory();
  } else if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else {
    root.H3CloudDiagnostics = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  /**
   * 診斷網路請求錯誤並回傳使用者友善的解法引導
   * @param {Error|Object} err - 捕捉到的例外物件
   * @param {{ url?: string, service?: string, status?: number }} [context] - 上下文
   * @returns {{ title: string, reason: string, action: string, isCors: boolean, isComfy: boolean, isAuth: boolean }}
   */
  function diagnoseNetworkError(err, context = {}) {
    const message = (err && err.message) ? String(err.message) : String(err);
    const url = context.url || "";
    const status = context.status || 0;
    const isComfyTarget = url.includes("8188") || context.service === "comfyui";

    // 1. 本地 ComfyUI 連線失敗或 CORS 阻擋
    if (isComfyTarget || (/failed to fetch/i.test(message) && url.includes("127.0.0.1"))) {
      return {
        title: "本地 ComfyUI 無法連線",
        reason: "瀏覽器無法連接到 http://127.0.0.1:8188。通常為服務尚未啟動，或是啟動時未加上跨域 (CORS) 標頭。",
        action: "請雙擊資料夾中的「一鍵啟動_H3分鏡工作坊.command」，或手動在終端機加上 `--listen 127.0.0.1 --port 8188 --enable-cors-header \"*\"` 啟動 ComfyUI。",
        isCors: true,
        isComfy: true,
        isAuth: false
      };
    }

    // 2. 雲端第三方 API CORS 跨域阻擋 (瀏覽器直接呼叫未允許 CORS 的 API)
    if (/failed to fetch/i.test(message) || /networkerror/i.test(message)) {
      return {
        title: "瀏覽器跨域 (CORS) 或網路阻擋",
        reason: "瀏覽器安全政策阻擋了對遠端伺服器的直接請求 (未附帶 Access-Control-Allow-Origin)，或網路斷線。",
        action: "若使用雲端影片 API，請確認該提供商是否支援前端直連；建議使用支援 CORS 的代理，或改用頂部「路線 A 地端工作流」。",
        isCors: true,
        isComfy: false,
        isAuth: false
      };
    }

    // 3. API 金鑰無效或權限不足 (401 / 403)
    if (status === 401 || status === 403 || /401|403|unauthorized|forbidden|invalid_api_key/i.test(message)) {
      return {
        title: "API 金鑰 (API Key) 無效或未授權",
        reason: "遠端伺服器拒絕存取，金鑰可能輸入錯誤、額度已用罄或未啟用對應模型權限。",
        action: "請點擊頂部「🔒 安全與隱私保護」卡片中的「⚙️ 點此重新設定」，檢查並重新儲存有效的 API Key。",
        isCors: false,
        isComfy: false,
        isAuth: true
      };
    }

    // 4. 速率限制或配額超出 (429)
    if (status === 429 || /429|quota|rate limit|too many requests/i.test(message)) {
      return {
        title: "請求次數超出限制 (Rate Limit / Quota Exceeded)",
        reason: "您的 API 金鑰已達到每分鐘請求次數 (RPM) 上限，或免費額度已耗盡。",
        action: "請稍候 30-60 秒後重試，或切換至其他模型 / 金鑰。",
        isCors: false,
        isComfy: false,
        isAuth: false
      };
    }

    // 一般性未知錯誤
    return {
      title: "操作失敗",
      reason: message,
      action: "請檢查終端機日誌或瀏覽器 Console，確認參數是否填寫完整。",
      isCors: false,
      isComfy: false,
      isAuth: false
    };
  }

  return {
    diagnoseNetworkError
  };
});
