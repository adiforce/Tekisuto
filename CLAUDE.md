# 背書小幫手（Tekisuto）

給高中生背書用的選擇題播放器，把題庫包裝成打 BOSS 的遊戲。網站：GitHub Pages（push 到 main 自動部署）。

- 全部回覆、註解、介面文字用**繁體中文（臺灣用語）**。
- 沒有 build、沒有框架、沒有套件：整個網站就是一個 `index.html`（HTML＋CSS＋JS 全寫在裡面）。
- 唯一的外部資源是 three.js r128（cdnjs），載入失敗時只用 2D 特效。

## 檔案結構

```
index.html                 播放器本體（約 2200 行）
banks/*.json               題庫，一個單元一個檔，檔名＝id
banks/img/*.jpg            附圖題的圖片，檔名 {題庫id}-{英文短名}.jpg
banks/index.json           題庫清單，由 GitHub Actions 自動產生，不要手動建或提交
.github/workflows/pages.yml  產生 banks/index.json 後部署 Pages
backup/                    舊的日文假名題庫備份，不會被讀取
jp-kana-*.json（根目錄）    舊版遺留檔，播放器不讀
```

## 題庫格式

```json
{
  "id": "geo2-exam1-sea",
  "title": "高二地理 段考一｜東南亞（01～04）",
  "subject": "地理",
  "questions": [
    {
      "q": "題目",
      "image": "banks/img/geo2-exam1-sea-delta.jpg",
      "lock": true,
      "options": ["A", "B", "C", "D"],
      "answer": 2,
      "explain": "為什麼正解是對的（1～2 句）",
      "why": ["為什麼 A 錯", "為什麼 B 錯", "", "為什麼 D 錯"],
      "point": "要記的重點",
      "mnemonic": "口訣"
    }
  ]
}
```

- `answer` 從 0 開始。`image`、`lock` 選填。
- `lock: true`：選項不打亂，只用在選項本身是圖上代號（甲乙丙丁、(A)～(D)）的題目。
- `why`：和 `options` 一樣長、順序對應，**正解那格放空字串**，其他每格一句話說明為什麼錯。選項會被打亂，所以 `why` 裡不能用 A、B、C 指稱選項，要直接講內容。
- 日文假名題庫（`jp-kana-*`）刻意沒有 `why`，選錯只是讀音不同，不用補。
- `subject` 決定科目顏色和 BOSS，可用值見 `index.html` 的「科目：顏色、BOSS」區塊：國文、英文、歷史、地理、公民、生物、化學、物理、地科、數學、其它（「錯題」是復仇戰內部用的，題庫不要用）。不在表裡的會變成預設的米克斯貓。
- id 命名：`{科目}{年級}-exam{段考}-{單元}`，科目代碼 chi／eng／hist／geo／civ／bio／chem／phy／earth／math。同一單元重出題 id 不變（錯題紀錄靠題目文字的 hash 對應，題目文字沒改就會保留）。
- 題目 id 由 `normalize()` 用題目文字 hash 產生，不用寫在 JSON 裡。

改題庫時：

- 只改說明類欄位時，用程式比對修改前後，確認 `q`、`options`、`answer` 沒被動到。
- 存檔維持 `json.dump(..., ensure_ascii=False, indent=2)`，檔尾一個換行。
- 學生手機裡的題庫是匯入當下的副本，GitHub 更新後要到「匯入題庫」頁按「更新」才會生效（`bankSig` 比對 title、subject、questions）。

## index.html 主要區塊

用 `/* ===== 名稱 ===== */` 分段，找功能時先 grep 這個。

| 區塊 | 重點 |
|---|---|
| 科目：顏色、BOSS | `SUBJECTS` 表：顏色、BOSS 名、`kind`（點陣貓種類）、必殺技名 |
| 等級 | `levelOf`、`TITLES`、招式名 `TIER_HIT`／`TIER_ULT` |
| 勇者貓 | `Hero` 模組：依等級畫 48×48 點陣圖，`Hero.url(lv)` 回傳 dataURL。Lv30 小龍、Lv40 星空徽章、Lv50 白金貓，之後光環每級換色 |
| 題庫格式檢查 | `normalize()`：所有題庫都會經過這裡，**新增題目欄位一定要在這裡保留**，不然會被丟掉 |
| 儲存 | `db` 物件存在 localStorage `beishu.v1` |
| 個人資料 | `profile()`：各題庫挑戰 BOSS 的次數、平均、最高、最近 |
| 雲端紀錄 | 進度匯出／匯入到 Google 試算表 |
| 點陣 BOSS | `Boss3D` 模組（名字沿用舊版，現在是點陣）：three.js 舞台＋一張點陣貓貼圖，`spec(kind)` 定義每種貓的毛色和配件，姿勢有 stand／puff（生氣）／ko |
| 戰鬥 | `startQuiz` → `renderQ` → `pick` → `next` → `result`；一場最多 `MAX_Q`（30）題，超過就隨機抽，重新挑戰時從整份重抽 |
| 事件 | `ACT` 物件：`data-act="xxx"` 的按鈕點下去會呼叫 `ACT.xxx(dataset, el)` |

### db 欄位

`banks, order, wrong, last, best, exp, kills, sound, coins, qwin, cards, stats`，另有 `subHome`、`subGh` 是篩選狀態。

- `cards`：刪去卡張數。升級時每級抽一次：40% 刪去卡、40% 金幣 +10、20% 沒有。
- `stats[題庫id]`：`{ n, sum, best, last, at, win, title }`，只記「挑戰 BOSS」整份打完的場次（`S.recordBid` 有值才記），輸贏都算，中途撤退不算。
- 新增「進度」類欄位時，要一起加進雲端紀錄的 `PROG` 陣列，不然換裝置會不見。

### 雲端紀錄

- `SYNC_URL` 是 Google Apps Script 網頁應用程式（寫死在 index.html，repo 公開）。
- 只存進度（`PROG` 列的欄位＋題庫 id 清單），不存題庫本身。匯入時缺的題庫會從 GitHub 的 banks/ 自動抓回來。
- 試算表「紀錄」分頁一人一列：A 名字、B 時間、C 摘要、D 之後是資料（每格最多 45000 字、開頭加 `~` 避免被當公式）。同名覆蓋。
- 匯入前會把目前進度備份到 localStorage `beishu.v1.bak`，可還原一次。

## 測試

沒有測試框架，用 Playwright 開頁面實測：

```bash
python3 -m http.server 8765        # 在 repo 根目錄
```

- Chromium 在 `/opt/pw-browsers/chromium-*/chrome-linux/chrome`，不要跑 `playwright install`。
- three.js 從 CDN 載入，沙箱連不到時用 `page.route('**/three.min.js', ...)` 換成本機檔（`npm i three@0.128.0`），或回 404 讓它走 2D 模式。
- 要測升級、刪去卡等狀態，直接改 localStorage `beishu.v1` 再重新整理。
- 改完 JS 至少跑一次語法檢查：把 `<script>` 內容丟進 `new Function()`。
- 點陣圖的修改要截圖自己看過，並用整數倍放大（`Image.NEAREST`）檢查細節。

## 部署

- push 到 main 就會觸發 Actions：產生 `banks/index.json` → 部署 Pages，約 1 分鐘生效。
- 上版前要先跟使用者確認，需要時會提供 GitHub token。
- 推之前先 `git fetch` 看遠端有沒有新的提交（使用者也會直接在 GitHub 上改題庫），有的話先 rebase。
