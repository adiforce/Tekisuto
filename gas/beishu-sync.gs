/**
 * 背書小幫手｜雲端紀錄（Google 試算表的 Apps Script）
 * 這個檔案只是備份在 repo 裡，網頁不會讀它；改完要貼到試算表的 Apps Script，
 * 再到「部署 → 管理部署作業 → 編輯（鉛筆）→ 版本：新版本 → 部署」，網址才會維持不變。
 *
 * 「紀錄」分頁：一人一列：A 名字、B 更新時間、C 摘要、D 之後是進度資料（每格最多 45000 字，太長會自動接到下一格）
 * 「歷史」分頁：每次同名紀錄要被蓋掉前，先把舊的那列搬過來：
 *               A 名字、B 原本時間、C 搬入時間、D 摘要、E 之後是資料（跟「紀錄」一樣，每格開頭有 ~）
 *               只留最近 KEEP_DAYS 天；要還原時，把 A、B、D 之後（略過 C）複製回「紀錄」那個人的那一列即可
 */
const SHEET_NAME = '紀錄';
const HIST_NAME = '歷史';
const KEEP_DAYS = 10;
const CHUNK = 45000;
const MAX_DATA = 1000000;
const TZ = 'Asia/Taipei';

function sheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
}
function hist_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let h = ss.getSheetByName(HIST_NAME);
  if (!h) {
    h = ss.insertSheet(HIST_NAME);
    h.getRange(1, 1, 1, 5).setValues([['名字', '原本時間', '搬入時間', '摘要', '資料（每格開頭有 ~）']]);
    h.setFrozenRows(1);
  }
  return h;
}
function out_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
function rows_(s) {
  const n = s.getLastRow(), c = s.getLastColumn();
  return n && c ? s.getRange(1, 1, n, c).getDisplayValues() : [];
}
const now_ = d => Utilities.formatDate(d || new Date(), TZ, 'yyyy-MM-dd HH:mm');

// 讀：?action=list 列出所有人；?action=load&name=xxx 讀一個人的進度
function doGet(e) {
  const p = (e && e.parameter) || {};
  const rows = rows_(sheet_());
  if (p.action === 'load') {
    const r = rows.find(r => r[0] === String(p.name || ''));
    if (!r) return out_({ ok: false, error: '找不到「' + p.name + '」的紀錄' });
    const data = r.slice(3).filter(String).map(x => x.slice(1)).join('');   // 每格開頭的 ~ 拿掉再接起來
    return out_({ ok: true, name: r[0], at: r[1], data: data });
  }
  return out_({ ok: true, list: rows.filter(r => r[0]).map(r => ({ name: r[0], at: r[1], info: r[2] })) });
}

// 把要被蓋掉的舊紀錄搬到「歷史」，再刪掉超過 KEEP_DAYS 天的；出錯也不影響正常存檔
function archive_(old) {
  try {
    const h = hist_();
    while (old.length > 3 && old[old.length - 1] === '') old.pop();   // 去掉後面空白格
    const vals = [old[0], old[1], now_(), old[2]].concat(old.slice(3));
    if (h.getMaxColumns() < vals.length) h.insertColumnsAfter(h.getMaxColumns(), vals.length - h.getMaxColumns());
    const range = h.getRange(h.getLastRow() + 1, 1, 1, vals.length);
    range.setNumberFormat('@');
    range.setValues([vals]);
    // 照時間往下加，所以超過期限的都在最上面：只讀 C 欄（搬入時間），一次刪掉前面那一段
    const last = h.getLastRow();
    if (last < 2) return;
    const cut = now_(new Date(Date.now() - KEEP_DAYS * 24 * 3600 * 1000));
    const times = h.getRange(2, 3, last - 1, 1).getDisplayValues();
    let k = 0;
    while (k < times.length && times[k][0] && times[k][0] < cut) k++;
    if (k > 0) h.deleteRows(2, k);
  } catch (err) {
    console.error('歷史搬移失敗：' + err);
  }
}

// 寫：POST { name, data, info }，同名字就整列蓋掉（蓋掉前先把舊的搬到「歷史」）
function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const b = JSON.parse(e.postData.contents);
    const name = String(b.name || '').trim().slice(0, 20);
    const data = String(b.data || '');
    if (!name) return out_({ ok: false, error: '沒有名字' });
    if (!data) return out_({ ok: false, error: '沒有資料' });
    if (data.length > MAX_DATA) return out_({ ok: false, error: '資料太大' });

    const s = sheet_();
    const rows = rows_(s);
    let row = rows.map(r => r[0]).indexOf(name) + 1;
    const existed = row > 0;
    if (existed) archive_(rows[row - 1].slice());
    else row = s.getLastRow() + 1;

    // 每格前面加 ~，避免開頭是 = + - 數字時被試算表當成公式或數字
    const chunks = [];
    for (let i = 0; i < data.length; i += CHUNK) chunks.push('~' + data.slice(i, i + CHUNK));
    const time = now_();
    const vals = [name, time, String(b.info || '').slice(0, 100)].concat(chunks);

    const need = Math.max(vals.length, s.getLastColumn(), 1);
    if (s.getMaxColumns() < need) s.insertColumnsAfter(s.getMaxColumns(), need - s.getMaxColumns());
    s.getRange(row, 1, 1, s.getMaxColumns()).clearContent();
    const range = s.getRange(row, 1, 1, vals.length);
    range.setNumberFormat('@');            // 全部當純文字存
    range.setValues([vals]);
    return out_({ ok: true, existed: existed, at: time });
  } catch (err) {
    return out_({ ok: false, error: String(err && err.message || err) });
  } finally {
    lock.releaseLock();
  }
}
