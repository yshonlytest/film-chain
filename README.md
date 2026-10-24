# 🎬 Film Chain — 首尾幀無縫連續分鏡影視工作坊

[![Test](https://img.shields.io/badge/tests-14%20passed-brightgreen.svg)]()
[![Architecture](https://img.shields.io/badge/architecture-Matt%20Pocock%20Skills-blue.svg)]()
[![License](https://img.shields.io/badge/license-MIT-purple.svg)]()

> 基於「3×3 九宮格分鏡錨定」與「尾幀無縫接首幀」技術的現代化 AI 影視串接工作坊。  
> 支援本地 ComfyUI (MiniMax-H3) 與雲端模型 (Seedance / ByteDance Ark / fal.ai) 雙軌執行，並具備純前端記憶體無縫影音合成能力。

---

## 🌟 核心特色

1. **分鏡視覺錨定 (3×3 Storyboard Grid)**：
   - 透過 Gemini / OpenAI 自動將故事改寫為無字邊框的 3x3 關鍵畫面九宮格（Panel 1 ~ 9），鎖定角色特徵與光影氛圍。
2. **多段 5 秒首尾連貫提示詞 (Chained Continuity Prompts)**：
   - 嚴格維持尾幀接首幀的運鏡連續性，支援 `<d>[Chinese] 台詞</d>` 真實中文對白與口型同步。
3. **雙軌彈性執行 (Dual Execution Routes)**：
   - **路線 A（地端工作流）**：連線本地 ComfyUI，透過自定義節點與 Metal/CUDA 算力極速渲染。
   - **路線 B（雲端極速流）**：直連雲端首尾幀控制模型，並行生成多段片段。
4. **純前端無縫合成 (In-Browser Canvas & Audio Merge)**：
   - 透過 HTML5 Canvas 與 MediaRecorder 在瀏覽器記憶體直接串接，免經後端伺服器，資料零外洩。
5. **預設基準方案 (Default Preset)**：
   - 內建沖繩風獅爺（Okinawa Shisa）15 秒有聲雜耍完整測試方案，開箱即測。

---

## 📐 架構設計與規範文件

本專案遵循 Matt Pocock 的工程化準則（Real engineering, not vibe coding）打造：
- **[GLOSSARY.md](GLOSSARY.md)**：領域統一辭典（Ubiquitous Language）
- **[SPEC.md](SPEC.md)**：系統架構與介面合約規範書
- **[TICKETS.md](TICKETS.md)**：工程實作工單與驗收紀錄
- **[HANDOFF.md](HANDOFF.md)**：開發交接文件

---

## 🧪 自動化測試

本專案使用 Node.js 內建原生測試執行器，零外部第三方依賴：

```bash
# 執行所有單元測試
npm test
```

---

## 🚀 部署資訊

- **線上測試站**：`https://film-chain.onlytest.dev`
- **GitHub 專案庫**：`https://github.com/yshonlytest/film-chain`
