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
audio/{base,enter,exit,levelup,lose(lost 也行),win,relife,revenge,result}.mp3／.m4a／.mid   自訂音樂／音效（選用，使用者自己放；都有時優先 mp3 → m4a → mid；沒放就用原本的合成音或安靜。base 每次回到基地從頭播一遍（播完就安靜，進戰鬥後重置），enter 開戰、exit 撤退、lose 敗北、win 擊倒 BOSS、levelup 升級、relife 使用復活卡、revenge 進復仇戰（有放就取代 enter）、result 結算畫面（進戰果頁播一遍，等 win／lose 播完才接，按任何按鈕就停）；midi 用內建電子音色合成播放）
.github/workflows/pages.yml  產生 banks/index.json 後部署 Pages
gas/beishu-sync.gs         雲端紀錄的 Google Apps Script 備份（網頁不讀；改完要貼到試算表的 Apps Script 並更新部署）
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
      "id": "dafc8e70-9cda-40d1-aa36-ce54ccfaae9e",
      "q": "題目",
      "ref": "穩紮穩打N4 01-01 單元",
      "aka": ["h1q7yv65"],
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

- `answer` 從 0 開始。`image`、`lock`、`ref`、`aka` 選填。
- `lock: true`：選項不打亂，只用在選項本身是圖上代號（甲乙丙丁、(A)～(D)）的題目。
- `why`：和 `options` 一樣長、順序對應，**正解那格放空字串**，其他每格一句話說明為什麼錯。選項會被打亂，所以 `why` 裡不能用 A、B、C 指稱選項，要直接講內容。
- 日文假名題庫（`jp-kana-*`）刻意沒有 `why`，選錯只是讀音不同，不用補。
- `subject` 決定科目顏色和 BOSS，可用值見 `index.html` 的「科目：顏色、BOSS」區塊：國文、英文、歷史、地理、公民、生物、化學、物理、地科、數學、其它（「錯題」是復仇戰內部用的，題庫不要用）。不在表裡的會變成預設的米克斯貓。
- 「其它」科目（`NO_COIN`／`bankNoCoin()`，日文題庫用）：經驗照算、錯題也進復仇戰，但這些題目在哪裡答對都不給金幣，挑戰通關金幣不給，復仇戰的通關金幣（打幾題 +幾元）只算非「其它」的題數；升級抽獎、嚴重度降級獎勵照常；每場魔王從正式科目隨機抽。
- id 命名：`{科目}{年級}-exam{段考}-{單元}`，科目代碼 chi／eng／hist／geo／civ／bio／chem／phy／earth／math。同一單元重出題 id 不變（錯題紀錄靠題目文字的 hash 對應，題目文字沒改就會保留）。
- 題目 `id`：**新題庫每題都要帶**，格式是「題庫簡稱＋`-`＋3 位數流水號」，例如 `n4g01-001`。簡稱用英文小寫加數字，同題庫共用同一個簡稱；流水號一次給定、永不更動、不重用已刪除的號碼，新增題目就接著往下編（分批產同一個題庫時要告訴對方從幾號接）。錯題、答對次數、復仇排序都靠 `id` 對應，之後怎麼改題目文字都不會掉紀錄。id 只要求在同一個題庫內不重複（紀錄的 key 是 `題庫id|題目id`）。不要用 `q` 加數字當整個 id（那是舊版順序編號）。`jp-n4-mix-200` 已經用 uuid，播放器把 id 當不透明字串，混用沒問題。沒寫 `id` 的舊題庫（日文 N4 以外）由 `normalize()` 用題目文字 hash 產生（`h` 開頭），改題目文字會丟那題的紀錄。
- `ref`：出處小標籤，自由文字，會在作答、作戰筆記、修練卡的題目下面顯示成「參考 {ref}」，所以要寫完整，例如 `穩紮穩打N4 01-01 單元`。不要再把出處塞進題目文字。
- `aka`：這題曾用過的舊 id 清單，**只在換 id 時用**（例如舊題庫補 uuid，`aka` 放原本的 hash id）。載入題庫（`addBank`）和套用雲端進度（`applyProg`）時，`remapIds()` 會把錯題、`qwin`、`wlast` 裡的舊 id 換成現在的 id；沒寫 `aka` 時，也會試「題目文字 hash」這個舊 id。補 uuid 時 hash 必須用 index.html 的 `hash()` 算（空白先拿掉），不要自己換算法。
- `ref`、`aka` 沒值時 `normalize()` 不會放進題目，這樣沒用到的題庫內容不變，匯入頁不會誤判成「有更新」。

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
| 題庫格式檢查 | `normalize()`：所有題庫都會經過這裡，**新增題目欄位一定要在這裡保留**，不然會被丟掉。檔案最上面的 `PROMPT` 是匯入頁「複製出題指令」的內容（給 AI 出題用），**題庫格式或科目有變動時要一起改**，並確認範例還能被 `normalize()` 讀進去 |
| 儲存 | `db` 物件存在 localStorage `beishu.v1` |
| 個人資料 | `profile()`：各題庫挑戰 BOSS 的次數、平均、最高、最近 |
| 雲端紀錄 | 進度匯出／匯入到 Google 試算表 |
| 點陣 BOSS | `Boss3D` 模組（名字沿用舊版，現在是點陣）：three.js 舞台＋一張點陣貓貼圖，`spec(kind)` 定義每種貓的毛色和配件，姿勢有 stand／puff（生氣）／ko，另有 `tired`（打完大招累癱約 2 秒，是疊加狀態不是姿勢）；特效有 `HIT_POOL`（普通攻擊依階級抽招）、`KIND_FX`（各科必殺技專屬特效），小圖示在 `ICONS` |
| 魔王外框動態 | `stageFx(kind, delay)`：答對時給 `.stage` 加 `fx-hit1`／`fx-hit2`／`fx-ult`（CSS 動畫，大招延遲 700ms 對齊 3D 招式落下），ult 會插入 `.rg2`／`.rg3` 兩個衝擊波圈；`prefers-reduced-motion` 時關閉 |
| 稱號外框 | `.me[data-fr=1..10]`：每 5 級一款（`frameOf(lv)`），純 CSS，`@property --fa` 讓高等級邊框轉動；首頁和個人資料的 `.me` 用 `frAttr(L.lv)` 帶上 |
| 復仇嚴重度 | `SEV`／`sevOf(n)`：復仇區塊依錯題數每 10 題升一級（共 7 級，`data-sev` 0～6），CSS 在 `.bank.revenge[data-sev]`；區塊預設收合（只留嚴重度、HP、今天消滅數、開戰鈕），`revOpen` 展開才看到提示、每場題數、筆記／修練；越高越亮、越會脈動／抖動。復仇戰一場抽 `revSize()` 題（`db.revN` 選 10／20／30，錯題不夠就全打），`pickRevenge` 優先抽最久沒碰的（`db.wlast`）；`db.day` 記今天消滅題數和已領的降級獎勵；復仇戰打贏有通關獎勵 `revBonus(題數)`（打幾題就 +幾元，依實際抽到的題數，走 `result()` 的 `clear`）；開戰前記 `S.sev0`，`result()` 發現嚴重度降級就每級每天發一次刪去卡＋10 元 |
| 稱號圖鑑 | `gallery()`（個人資料頁的「📖 稱號與造型圖鑑」）：11 張外框稱號卡（Lv1、5、10…50）＋`TITLES` 全部稱號格，沒達到的蓋黑影；新增稱號或外框時它會自動帶出來 |
| 音量 | `db.vol`（l／m／s）＋ `outNode()` 總音量 gain，所有聲音都經過它；首頁 🔊 按鈕輪流切 大→中→小→靜音 |
| 自動更新 | 檔尾 IIFE：開啟與切回前景（間隔 5 分鐘）用 `cache:'no-store'` 問 index.html 的 ETag／Last-Modified，跟 localStorage `beishu.ver` 不同就換成 `?v=版本` 網址重載；戰鬥中、草稿紙開著、1 分鐘內重載過都不動 |
| 自訂音樂 | `MUSIC_SLOTS`＋`Music` 模組：每個位置先找 .mp3、再 .m4a、再 .mid（`parseMidi`／`playMidi`／`loopMidi`）。`Music.shot(名)` 一次性播放，有檔案回傳 true；`Music.base(true/false)` 控制基地音樂（只播一遍）、`Music.result(true)` 結算音樂（`base()` 會順便把它停掉）；第一次點畫面才載入。新增位置：加進 `MUSIC_SLOTS` 並在對應事件呼叫 |
| 草稿紙 | `Pad` 模組：全螢幕空白畫布（canvas＋指標事件），作答時在上方顯示題目、附圖、選項。入口是戰鬥頂列的 ✏️（首頁的按鈕已拿掉，`ACT.padOpen` 還在）。筆畫只存在記憶體，換題或換場戰鬥就清空；用過 Apple Pencil 後手指觸碰不畫（防手掌誤觸）；草稿紙內文字一律不可選取，並擋掉 selectstart／contextmenu、有選取就清掉（iPad 長按會跳出全選並吃掉下一次點擊） |
| 魔王背景 | `Scene` 模組：依科目 kind 用 SVG 方塊拼 96×56 的點陣場景，貼在 three.js 舞台後面，新增科目時要在 `D` 裡補一個 kind |
| 戰鬥 | `startQuiz` → `renderQ` → `pick` → `next` → `result`；一場最多 `MAX_Q`（20）題，超過就隨機抽，重新挑戰時從整份重抽 |
| 事件 | `ACT` 物件：`data-act="xxx"` 的按鈕點下去會呼叫 `ACT.xxx(dataset, el)` |

### db 欄位

`banks, order, wrong, last, best, exp, kills, sound, coins, qwin, cards, revives, stats, wd, seen`，另有 `subHome`、`subGh` 是篩選狀態。

- `cards`：刪去卡張數；`revives`：復活卡張數。升級時每級抽一次：30% 刪去卡、20% 復活卡、30% 金幣 +10、20% 沒有。
- 復活卡：愛心歸零時可用，愛心補滿、繼續下一題，一場不限張數；最後一題倒下再復活算勝利。
- `wd`：金幣提領紀錄 `[{ at, n }]`。點首頁／個人資料的金幣 → `withdrawOpen()` 彈窗 → `withdrawDo()` 金幣歸零並記錄；雲端合併時 `coins` 的增量可以是負的（提領），`wd` 兩邊聯集（`at|n` 去重）。
- `seen[題庫id]`：這個題庫最後一次「進去」的日期（`dayKey()`）。`markSeen(refs)` 在 `startQuiz`／`review`／`cards` 呼叫，挑戰、錯題再戰、復仇戰（用實際抽到題目的題庫）、筆記、修練都算。首頁題庫卡 `seen` 不是今天就加 `.frozen`（結冰）；今天第一次進去後回首頁，該卡播一次 `.thaw` 融冰動畫（`thawed` Set）。冰柱是 CSS 裡內嵌的 SVG（200×30 一格橫向重複，`.bank.frozen::after`／`.icefall` 共用）。直接點結冰卡上的挑戰／錯題再戰／修練／筆記時，`Ice` 模組在捕捉階段攔下點擊，播破冰動畫（裂痕 → 碎冰噴開＋冰柱掉落，碎片放在 body 上的 `.icebreak` 固定層），約 600ms 後再 `el.click()` 真正進去；這種題庫記在 `iceBroke`，回首頁不再播融冰。減少動態時不攔，直接進去。只存這台裝置，**不進** `PROG`／雲端紀錄。
- `stats[題庫id]`：`{ n, sum, best, last, at, win, title }`，只記「挑戰 BOSS」整份打完的場次（`S.recordBid` 有值才記），輸贏都算，中途撤退不算。
- 新增「進度」類欄位時，要一起加進雲端紀錄的 `PROG` 陣列，不然換裝置會不見。

### 雲端紀錄

- `SYNC_URL` 是 Google Apps Script 網頁應用程式（寫死在 index.html，repo 公開）。
- 只存進度（`PROG` 列的欄位＋題庫 id 清單），不存題庫本身。匯入時缺的題庫會從 GitHub 的 banks/ 自動抓回來。
- 試算表「紀錄」分頁一人一列：A 名字、B 時間、C 摘要、D 之後是資料（每格最多 45000 字、開頭加 `~` 避免被當公式）。同名覆蓋。
- 匯入前會把目前進度備份到 localStorage `beishu.v1.bak`，可還原一次。
- 「歷史」分頁：同名紀錄每次要被蓋掉前，Apps Script 先把舊的那列搬過去（A 名字、B 原本時間、C 搬入時間、D 摘要、E 之後資料），只留最近 10 天（`KEEP_DAYS`）。網頁不讀歷史，要還原時手動把那列複製回「紀錄」。
- Apps Script 原始碼在 `gas/beishu-sync.gs`。改完要請使用者貼到試算表的 Apps Script，從「部署 → 管理部署作業 → 編輯 → 新版本」更新，`SYNC_URL` 才會維持不變（不要「新增部署作業」，那會換網址）。我們沒辦法登入 Google 實測，改 Apps Script 後用 Node 假 SpreadsheetApp 測邏輯。
- 自動同步 `autoSync()`：開啟網頁、打完一場（`result()`）、修練完成（`cnext()`）、撤退（`quitQuiz`）、提領金幣後、切到背景／切回來（visibilitychange）都會觸發；戰鬥中不動；30 秒內最多一次，被擋掉的會排一個計時器等時間到再補。沒設定過名字（localStorage `beishu.syncName`）就完全不同步，首頁和戰果頁會顯示 `syncTip()` 提醒條，點了進 💾 頁。

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
