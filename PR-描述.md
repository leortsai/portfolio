# 作品集網站改版（文件第 0–9 節）

依 `website-fixes-for-claude-code.md` 逐節執行，38 個 commit。
不改動既有文案，只放文件裡寫出的文字；未使用的圖片檔案保留在資料夾裡，只從頁面移除。

## 各節

| 節 | 內容 |
|---|---|
| 0 | 從 Figma 匯出 49 張圖並轉 WebP |
| 1–3 | III Awards／Acer／Michelin 三個 case study 改成九段式 |
| 4 | III Design Studio 改成五段式品牌架構 |
| 4-1 | 新增 `visual-work.html`（10 件平面與品牌作品） |
| 5 | About 自我介紹、經歷大事紀、人像照片 |
| 6 | 首頁作品順序、Open to opportunities、卡片特色文字 |
| 7 | 無障礙（對比、地標、標題層級、focus、點擊範圍）、專案資訊欄內距、側邊目錄、閱讀進度條、lightbox 升級、前後對照滑桿、影片元件、Acer 內嵌 demo、回到頂端 |
| 7-1 | 捲動動態：GSAP 3.12.5 + ScrollTrigger，搭配站上既有的 Lenis |
| 8 | 指向另一份文件，III Awards 上線網站已在它自己的 repo 完成並部署（2026-11-11） |
| 9 | 上線前檢查：404、sitemap、robots、og:image、favicon、連結檢查、Lighthouse／axe |

## 驗收

- [x] 每頁 Lighthouse Accessibility 100、axe 0 錯誤（8 頁 × 390/1440 共 16 次）
- [x] 只用鍵盤走完首頁與一個 case study，焦點一直看得見（首頁 14 個、Acer 37 個停留點）
- [x] 開啟「減少動態效果」後所有動畫停止或靜態
- [x] 寬 320px 無水平捲動；放大 200% 不破版
- [x] 觸控裝置不顯示自訂游標

## Lighthouse（手機版，修改前 → 修改後）

| 頁面 | 效能 | 無障礙 | 最佳做法 | SEO |
|---|---|---|---|---|
| 首頁 | 71 → 73 | 100 | 96 → 100 | 100 |
| About | 86 → 90 | 100 | 96 → 100 | 100 |
| Visual Design | 77 → 73 | 100 | 96 → 100 | 100 |
| III Awards | 81 → 91 | 100 | 96 → 100 | 100 |
| Acer | 77 → 86 | 100 | 96 → 100 | 100 |
| Michelin | 78 → 83 | 100 | 96 → 100 | 100 |
| III Design | 75 → 88 | 100 | 96 → 100 | 100 |

桌機版效能 89–99，無障礙與 SEO 全部 100。

### LCP

Lighthouse 手機版用的是模擬節流（lantern），首頁與 Visual Design 估到 11–12 秒，
但同兩頁的 Speed Index 只有 2.0–2.5 秒，兩個數字互相矛盾。
改用真實節流（4× CPU、1.6Mbps、150ms RTT、390×844）實測：

| 頁面 | 修正前 | 修正後 |
|---|---|---|
| 首頁 | 2.80s | 2.26s |
| About | 2.19s | 2.04s |
| Visual Design | 2.24s | 2.48s |
| III Awards | 2.88s | 1.52s |
| Acer | 2.99s | 1.70s |
| Michelin | 3.56s | 1.88s |
| III Design | 3.11s | 1.49s |

七頁都在 2.5 秒內。三個改動：字型從 base64 抽成 WOFF2（style.css 148KB → 75KB）、
首頁 Hero 逐行進場從 GSAP 改成純 CSS（不必等三支 CDN）、
case hero 情境圖加 srcset（手機抓 800px 版）。

## 第 9 節逐項

已符合：圖片壓縮（141 張全 WebP/SVG、無超過 400KB、都有 width/height）、
圖片 alt（148 張）、前端無金鑰、連結與錨點全部可達、每頁都有 CTA。

本次補上：404.html、sitemap.xml、robots.txt、favicon 三件組、
七張 1200×630 分享圖與 og/twitter meta、四頁過短的 description。

由你自己操作：Enforce HTTPS、Search Console 驗證、GA4。

## 順手修掉的既有問題

- `main.js` 的 Lenis 是區域變數，`menu.js`／`lightbox.js`／`ui.js` 的 `window.lenis.stop()` 從來沒生效過
- `.theme-dark` 的 `--fg-dim` 在純黑底只有 3.83:1（case-hero-num、next-project-label 用它）
- 連結與按鈕沒寫 `cursor: none`，系統手型游標和自製藍點一直同時出現
- 減少動態時 `.reveal` 仍 opacity:0 起步，畫面外的區塊要捲到才出現
- Lenis 每幀寫回捲動位置，蓋掉瀏覽器把焦點捲進畫面的動作，Tab 時焦點會停在看不見的地方
- 跨網域 iframe 在 Tab 順序裡但畫不出焦點框
- 320px 下 About 標題與 nav 連結撐破版面；768px 下圖片進場縮放溢出 5px

## 尚未處理

- 7-1 第 4 項「畫面橫向展示」只套在 Michelin 桌機版七個畫面。
  Acer 第 5 段的桌機圖是分散的單張全寬圖，沒有同性質的圖組可以排成一條。
- 7-1 第 11 項（About 人像 ASCII 淡出）依後續決定改成黑白照片的 clip-path 揭開，ASCII 疊層已移除。
- 第 7 節第 17 項的前後對照滑桿放在 Michelin 第 6 段兩組。
  Acer Decision 06 的前後是併在同一張圖裡，要做滑桿需要分別匯出兩張。

🤖 Generated with [Claude Code](https://claude.com/claude-code)
