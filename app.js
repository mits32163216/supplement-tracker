/* サプリ摂取トラッカー — ローカル完結・記録専用アプリ
 * データは IndexedDB（端末内）に保存。サーバー送信なし・アカウント不要。
 * 医療的な推奨/警告ロジックは持たない（純粋な記録ツール）。 */
'use strict';

/* ============================================================
 * シードデータ（§3.2）
 * ============================================================ */
const SEED = {
  scheduleVersion: '2026-06-08b',
  blocks: [
    { id: 'morning',   label: '朝',     context: '断食。コーヒー＋MCTと',     color: '#bd8a2c' },
    { id: 'lunch',     label: '昼',     context: 'ランチ＝メイン食',          color: '#4f6f52' },
    { id: 'afternoon', label: '午後',   context: 'コーヒー2杯目（〜14時台）',  color: '#8a5a3c' },
    { id: 'evening',   label: '夕方',   context: '補食',                      color: '#b5562f' },
    { id: 'night',     label: '夜',     context: '食べない or 0.5食',        color: '#3f4f7a' },
    { id: 'bedtime',   label: '寝る前', context: '',                         color: '#6e3f5f' }
  ],
  items: [
    // 朝
    { id: 'morning_citrate',      block: 'morning',   name: 'クエン酸',                          dose: '3粒',     doseNote: '470mg/粒・水と一緒に',                  badge: 'コーヒー前', optional: false },
    { id: 'morning_mct',          block: 'morning',   name: 'MCTオイル',                         dose: '小さじ1', doseNote: 'C8/C10・ケトン供給',                    badge: 'コーヒーに', optional: false },
    { id: 'morning_b_complex',    block: 'morning',   name: 'Basic B Complex（活性型）',          dose: '2粒',     doseNote: 'メチル葉酸・メチルB12・B2計20mg',        badge: 'コーヒーと', optional: false },
    { id: 'morning_b12',          block: 'morning',   name: 'メチルコバラミンB12',                dose: '1粒',     doseNote: '500mcg',                                badge: 'コーヒーと', optional: false },
    { id: 'morning_probiotic',    block: 'morning',   name: 'UltraFlora Control（B420）',         dose: '1粒',     doseNote: '10億CFU・ディスバイオシス手当て',          badge: '空腹OK',     optional: true  },
    { id: 'morning_chlorella',    block: 'morning',   name: 'クロレラ',                          dose: '5粒',     doseNote: '抗酸化・緑栄養（B12は数えない）',          badge: 'コーヒーと', optional: true  },
    // 昼
    { id: 'lunch_enzyme',         block: 'lunch',     name: '消化酵素（Thorne）',                 dose: '2カプセル', doseNote: 'ベタインHCl・牛胆汁含む',              badge: '食べ始め', optional: false },
    { id: 'lunch_solaray',        block: 'lunch',     name: 'Solaray Calcium Citrate Plus',     dose: '2粒',     doseNote: 'Ca/Mg/Zn/銅/D/B6複合',                  badge: '食事と',   optional: false },
    { id: 'lunch_d3',             block: 'lunch',     name: 'ビタミンD3',                        dose: '1粒',     doseNote: '10,000IU・週4回想定',                   badge: '食事と',   optional: true  },
    { id: 'lunch_omega3',         block: 'lunch',     name: 'オメガ3（魚油）',                    dose: '3粒',     doseNote: 'EPA+DHA 約2,250mg',                    badge: '食事と',   optional: false },
    { id: 'lunch_stage7',         block: 'lunch',     name: 'STAGE7（アムラ・ウコン等）',         dose: '2粒',     doseNote: '抗酸化・ウコンは脂と吸収UP',             badge: '食事と',   optional: true  },
    { id: 'lunch_juice',          block: 'lunch',     name: '人参ジュース',                       dose: '1杯',     badge: '食後',                                                                              optional: true  },
    // 午後
    { id: 'afternoon_citrate',    block: 'afternoon', name: 'クエン酸',                          dose: '2粒',     doseNote: '470mg/粒・水と一緒に',                  badge: 'コーヒー前', optional: false },
    // 夕方
    { id: 'evening_solaray',      block: 'evening',   name: 'Solaray Calcium Citrate Plus',     dose: '1粒',     doseNote: '複合',                                  badge: '食事と',   optional: false },
    { id: 'evening_enzyme',       block: 'evening',   name: '消化酵素（Thorne）',                 dose: '2カプセル', doseNote: '固形のとき',                          badge: '食事と',   optional: true  },
    // 夜
    { id: 'night_enzyme',         block: 'night',     name: '消化酵素（Thorne）',                 dose: '2カプセル', doseNote: '食べる日だけ',                        badge: '食事と',   optional: true  },
    // 寝る前
    { id: 'bedtime_magnesium',    block: 'bedtime',   name: 'マグネシウム（Thorne CitraMate）',   dose: '1粒',     doseNote: '元素Mg 135mg・クエン酸+リンゴ酸',        badge: '空腹OK',   optional: false }
  ]
};

/* ============================================================
 * IndexedDB ラッパ
 *   meta: {key} … 'settings' / 'scheduleVersions' / 'currentVersion'
 *   logs: {date} … DailyLog
 * ============================================================ */
const DB_NAME = 'supplement-tracker';
const DB_VER = 1;
let _db = null;

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VER);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta', { keyPath: 'key' });
      if (!db.objectStoreNames.contains('logs')) db.createObjectStore('logs', { keyPath: 'date' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
function tx(store, mode = 'readonly') { return _db.transaction(store, mode).objectStore(store); }
function idbGet(store, key) {
  return new Promise((res, rej) => { const r = tx(store).get(key); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
}
function idbPut(store, val) {
  return new Promise((res, rej) => { const r = tx(store, 'readwrite').put(val); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
}
function idbDelete(store, key) {
  return new Promise((res, rej) => { const r = tx(store, 'readwrite').delete(key); r.onsuccess = () => res(); r.onerror = () => rej(r.error); });
}
function idbAll(store) {
  return new Promise((res, rej) => { const r = tx(store).getAll(); r.onsuccess = () => res(r.result || []); r.onerror = () => rej(r.error); });
}

/* ============================================================
 * 状態
 * ============================================================ */
const state = {
  settings: { dayBoundaryHour: 0, adhWindow: 30, mode: 'home' }, // mode: 'home' | 'travel'
  scheduleVersions: [],   // [{version, blocks, items}]  末尾が最新
  currentVersion: null,   // 最新バージョン文字列
  travelPack: null,       // string[] of itemIds in pack（旅行モードで表示する項目）。null=未初期化
  todayKey: null,
  calMonth: null,         // 履歴カレンダーの表示月（Date：1日）
  selectedDate: null,     // 履歴で選択中の日
  editDraft: null,        // 編集中のスケジュール（items 配列）
  packDraft: null         // 編集中の持参リスト（itemId のSet風オブジェクト）
};

/* ===== モード/持参リスト ヘルパ ===== */
function currentMode() { return state.settings.mode || 'home'; }
/** その日の "見える項目" を mode/pack で絞る共通フィルタ */
function filterByModeAndPack(items, mode, packList) {
  const arr = items.filter(i => i.enabled !== false);
  if (mode !== 'travel') return arr;
  const pack = new Set(packList || []);
  return arr.filter(i => pack.has(i.id));
}
/** 今日の visible items（現在のmode/pack基準） */
function visibleItemsToday(sched) {
  return filterByModeAndPack(sched.items, currentMode(), state.travelPack);
}
/** 過去日の visible items（その日のlogのmode/pack基準） */
function visibleItemsForLog(log, sched) {
  const mode = log.mode || 'home';
  const pack = mode === 'travel' ? (log.packList || state.travelPack || []) : null;
  return filterByModeAndPack(sched.items, mode, pack);
}

function currentSchedule() {
  return state.scheduleVersions.find(v => v.version === state.currentVersion) || state.scheduleVersions[state.scheduleVersions.length - 1] || SEED;
}
function scheduleByVersion(ver) {
  return state.scheduleVersions.find(v => v.version === ver) || currentSchedule();
}

/* ============================================================
 * 日付ユーティリティ
 * ============================================================ */
function ymd(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
/** 端末ローカル時刻＋境界時刻を考慮した「論理的な日付」キー */
function dayKeyOf(date, boundaryHour) {
  const shifted = new Date(date.getTime() - boundaryHour * 3600 * 1000);
  return ymd(shifted);
}
function todayKey() { return dayKeyOf(new Date(), state.settings.dayBoundaryHour); }
function parseKey(key) { const [y, m, d] = key.split('-').map(Number); return new Date(y, m - 1, d); }
const WD = ['日', '月', '火', '水', '木', '金', '土'];
function fmtJP(key) { const d = parseKey(key); return `${d.getMonth() + 1}月${d.getDate()}日（${WD[d.getDay()]}）`; }
function fmtJPFull(key) { const d = parseKey(key); return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日（${WD[d.getDay()]}）`; }

/* ============================================================
 * ログ取得・保存
 * ============================================================ */
async function getLog(date) {
  return (await idbGet('logs', date)) || null;
}
/** その日のログを取得（なければ現行バージョンで初期化して返す。保存はしない） */
async function ensureLog(date) {
  let log = await getLog(date);
  if (!log) {
    log = { date, entries: {}, note: '', scheduleVersion: state.currentVersion };
    // 今日のログは生成時に現在のmode/packListをスタンプ
    if (date === todayKey()) {
      log.mode = currentMode();
      if (log.mode === 'travel') log.packList = [...(state.travelPack || [])];
    } else {
      log.mode = 'home'; // 過去日にログが無ければ home 扱い（完了率0%なので影響なし）
    }
  }
  if (!log.scheduleVersion) log.scheduleVersion = state.currentVersion;
  return log;
}
async function saveLog(log) {
  // 今日のログを保存するときは最新のmode/packListに更新（モード切替に即追従）
  if (log.date === todayKey()) {
    log.mode = currentMode();
    if (log.mode === 'travel') log.packList = [...(state.travelPack || [])];
    else delete log.packList;
  }
  // 空ログ（チェック0・メモ無し）は保存しない＝記録が無い日はそのまま「未」
  const hasCheck = Object.values(log.entries || {}).some(e => e && e.checked);
  if (!hasCheck && !(log.note && log.note.trim())) {
    await idbDelete('logs', log.date);
    return;
  }
  await idbPut('logs', log);
}

/* ============================================================
 * 集計
 * ============================================================ */
function requiredItemsFor(sched) { return sched.items.filter(i => i.enabled !== false && !i.optional); }
/** その日のmode/packListで「必須として期待されている項目」を絞り込んで返す */
function requiredItemsForDay(log, sched) {
  let required = requiredItemsFor(sched);
  const mode = log.mode || 'home';
  if (mode === 'travel') {
    const pack = new Set(log.packList || []);
    required = required.filter(i => pack.has(i.id));
  }
  return required;
}
function dayCompletion(log, sched) {
  const required = requiredItemsForDay(log, sched);
  if (required.length === 0) return 1;
  let done = 0;
  for (const it of required) if (log.entries[it.id] && log.entries[it.id].checked) done++;
  return done / required.length;
}
function isAchieved(log, sched) { return dayCompletion(log, sched) >= 1; }

async function computeStats() {
  const logs = await idbAll('logs');
  const byDate = {}; logs.forEach(l => byDate[l.date] = l);
  const tKey = todayKey();

  // 連続達成（今日が未完了でも崩さない：昨日から数える）
  let cur = 0;
  let cursor = parseKey(tKey);
  // 今日を判定
  {
    const log = byDate[tKey];
    const sched = scheduleByVersion(log ? log.scheduleVersion : state.currentVersion);
    if (log && isAchieved(log, sched)) { cur++; }
    cursor.setDate(cursor.getDate() - 1);
  }
  // 過去へ
  while (true) {
    const k = ymd(cursor);
    const log = byDate[k];
    if (!log) break;
    const sched = scheduleByVersion(log.scheduleVersion);
    if (isAchieved(log, sched)) { cur++; cursor.setDate(cursor.getDate() - 1); } else break;
  }

  // 最長連続・達成日数
  const achievedKeys = logs.filter(l => isAchieved(l, scheduleByVersion(l.scheduleVersion))).map(l => l.date).sort();
  let best = 0, run = 0, prev = null;
  for (const k of achievedKeys) {
    if (prev) {
      const pd = parseKey(prev); pd.setDate(pd.getDate() + 1);
      run = (ymd(pd) === k) ? run + 1 : 1;
    } else run = 1;
    best = Math.max(best, run); prev = k;
  }

  return { current: cur, best, recordedDays: logs.length, achievedDays: achievedKeys.length };
}

async function computeAdherence() {
  const logs = await idbAll('logs');
  const byDate = {}; logs.forEach(l => byDate[l.date] = l);
  const sched = currentSchedule();
  const N = state.settings.adhWindow;
  const out = [];
  const start = parseKey(todayKey()); start.setDate(start.getDate() - (N - 1));
  for (const it of sched.items) {
    if (it.enabled === false) continue;
    let denom = 0, num = 0;
    const cur = new Date(start);
    for (let i = 0; i < N; i++) {
      const k = ymd(cur);
      const log = byDate[k];
      const daySched = scheduleByVersion(log ? log.scheduleVersion : state.currentVersion);
      const existsThatDay = daySched.items.some(x => x.id === it.id && x.enabled !== false);
      if (existsThatDay) {
        // 旅行モードの日は持参リストに無い項目を「期待されていない」とみなして分母から除外
        const dayMode = log && log.mode ? log.mode : 'home';
        const inPack = dayMode === 'travel' && log.packList ? log.packList.includes(it.id) : true;
        if (dayMode !== 'travel' || inPack) {
          denom++;
          if (log && log.entries[it.id] && log.entries[it.id].checked) num++;
        }
      }
      cur.setDate(cur.getDate() + 1);
    }
    out.push({ name: it.name, dose: it.dose, optional: !!it.optional, num, denom });
  }
  return out;
}

/* ============================================================
 * 描画ヘルパ
 * ============================================================ */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

function badgeClass(badge) {
  if (!badge) return 'b-drink';
  if (badge.includes('空腹')) return 'b-empty';
  if (badge.includes('食後')) return 'b-after';
  if (badge.includes('コーヒー')) return 'b-drink';
  if (badge.includes('食')) return 'b-meal';   // 食事と / 食べ始め
  return 'b-drink';
}
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

let toastTimer = null;
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 1800);
}

const CHECK_SVG = '<svg viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg>';

function ringHTML(pct) {
  const size = 58, sw = 6, r = (size - sw) / 2, c = 2 * Math.PI * r;
  const off = c * (1 - pct);
  const col = pct >= 1 ? 'var(--hiru)' : 'var(--ochre)';
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <circle class="track" cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke-width="${sw}"></circle>
    <circle class="prog" cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke-width="${sw}"
       stroke="${col}" stroke-dasharray="${c}" stroke-dashoffset="${off}"></circle>
    <text class="pct" x="50%" y="50%" dy="0.34em" text-anchor="middle" transform="rotate(90 ${size / 2} ${size / 2})"
       font-size="15" fill="var(--ink)">${Math.round(pct * 100)}</text>
  </svg>`;
}

/* ============================================================
 * 今日ビュー
 * ============================================================ */
let todayLog = null;

async function renderToday() {
  state.todayKey = todayKey();
  todayLog = await ensureLog(state.todayKey);
  const sched = currentSchedule();

  $('#todayDate').textContent = fmtJPFull(state.todayKey);
  // モード表示・トグル状態を反映
  updateModeUI();

  const visible = visibleItemsToday(sched);
  const wrap = $('#todayBlocks'); wrap.innerHTML = '';
  for (const b of sched.blocks) {
    const items = visible.filter(i => i.block === b.id);
    if (items.length === 0) continue;
    const doneReq = items.filter(i => !i.optional && todayLog.entries[i.id] && todayLog.entries[i.id].checked).length;
    const totReq = items.filter(i => !i.optional).length;

    const block = document.createElement('div');
    block.className = 'block';
    let rows = '';
    for (const it of items) {
      const on = !!(todayLog.entries[it.id] && todayLog.entries[it.id].checked);
      rows += `<button class="row${on ? ' on' : ''}${it.optional ? ' opt' : ''}" data-id="${esc(it.id)}">
        <span class="cb">${CHECK_SVG}</span>
        <span class="name">${esc(it.name)}${it.optional ? '<span class="opt-tag">任意</span>' : ''}</span>
        <span class="amt">${esc(it.dose)}${it.doseNote ? `<small>${esc(it.doseNote)}</small>` : ''}</span>
        <span class="badge ${badgeClass(it.badge)}">${esc(it.badge || '')}</span>
      </button>`;
    }
    block.innerHTML = `<div class="block-head" style="background:${esc(b.color)}">
        <span class="t">${esc(b.label)}</span>
        <span class="ctx">${esc(b.context || '')}</span>
        <span class="bcount">${doneReq}/${totReq}</span>
      </div><div class="rows">${rows}</div>`;
    wrap.appendChild(block);
  }

  // 行タップ
  $$('#todayBlocks .row').forEach(btn => {
    btn.addEventListener('click', () => toggleToday(btn.dataset.id));
  });

  // メモ
  const ta = $('#todayNote');
  ta.value = todayLog.note || '';

  updateRing();
}

let noteTimer = null;
function bindTodayNote() {
  const ta = $('#todayNote');
  ta.addEventListener('input', () => {
    todayLog.note = ta.value;
    clearTimeout(noteTimer);
    noteTimer = setTimeout(() => saveLog(todayLog), 400);
  });
}

async function toggleToday(itemId) {
  // 日付が変わっていたら作り直す（深夜にまたいだ場合の保険）
  if (todayKey() !== state.todayKey) { await renderToday(); return; }
  const cur = todayLog.entries[itemId] && todayLog.entries[itemId].checked;
  todayLog.entries[itemId] = { checked: !cur, checkedAt: !cur ? new Date().toISOString() : null };
  await saveLog(todayLog);

  const btn = $(`#todayBlocks .row[data-id="${CSS.escape(itemId)}"]`);
  if (btn) btn.classList.toggle('on', !cur);
  // ブロックのカウンタ更新
  refreshBlockCounts();
  updateRing();
}

function refreshBlockCounts() {
  const sched = currentSchedule();
  const visible = visibleItemsToday(sched);
  $$('#todayBlocks .block').forEach((blockEl, idx) => {
    const heads = sched.blocks.filter(b => visible.some(i => i.block === b.id));
    const b = heads[idx]; if (!b) return;
    const items = visible.filter(i => i.block === b.id && !i.optional);
    const done = items.filter(i => todayLog.entries[i.id] && todayLog.entries[i.id].checked).length;
    const c = blockEl.querySelector('.bcount'); if (c) c.textContent = `${done}/${items.length}`;
  });
}

function updateRing() {
  const sched = currentSchedule();
  const pct = dayCompletion(todayLog, sched);
  $('#ring').innerHTML = ringHTML(pct);
  // ストリークピル
  computeStats().then(s => {
    const pill = $('#streakPill');
    if (s.current > 0) { pill.hidden = false; $('#streakN').textContent = s.current; }
    else pill.hidden = true;
  });
}

/* ============================================================
 * 履歴ビュー（カレンダーヒートマップ）
 * ============================================================ */
async function renderHistory() {
  if (!state.calMonth) { const d = parseKey(todayKey()); state.calMonth = new Date(d.getFullYear(), d.getMonth(), 1); }
  const y = state.calMonth.getFullYear(), m = state.calMonth.getMonth();
  $('#calLabel').textContent = `${y}年${m + 1}月`;

  const logs = await idbAll('logs');
  const byDate = {}; logs.forEach(l => byDate[l.date] = l);

  const grid = $('#calGrid'); grid.innerHTML = '';
  WD.forEach(w => { const e = document.createElement('div'); e.className = 'cal-wd'; e.textContent = w; grid.appendChild(e); });

  const first = new Date(y, m, 1);
  const startPad = first.getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const tKey = todayKey();

  for (let i = 0; i < startPad; i++) { const e = document.createElement('div'); e.className = 'cal-day empty'; grid.appendChild(e); }

  for (let d = 1; d <= daysInMonth; d++) {
    const key = ymd(new Date(y, m, d));
    const cell = document.createElement('div');
    cell.className = 'cal-day';
    const log = byDate[key];
    let pct = 0, hasNote = false;
    if (log) {
      pct = dayCompletion(log, scheduleByVersion(log.scheduleVersion));
      hasNote = !!(log.note && log.note.trim());
    }
    // ヒートマップ色
    let bg = 'var(--paper)';
    if (log) {
      if (pct >= 1) bg = 'var(--ochre)';
      else if (pct >= 0.66) bg = 'rgba(189,138,44,.7)';
      else if (pct >= 0.34) bg = 'rgba(189,138,44,.45)';
      else if (pct > 0) bg = 'rgba(189,138,44,.22)';
    }
    cell.style.background = bg;
    if (pct >= 0.66) cell.style.color = '#fff';
    if (key === tKey) cell.classList.add('today');
    if (key === state.selectedDate) cell.classList.add('sel');
    if (key > tKey) cell.classList.add('future');
    cell.innerHTML = `${d}${hasNote ? '<span class="dot"></span>' : ''}`;
    cell.addEventListener('click', () => { state.selectedDate = key; renderHistory(); renderDayDetail(key); });
    grid.appendChild(cell);
  }

  if (state.selectedDate) renderDayDetail(state.selectedDate);
  else $('#dayDetail').innerHTML = '<div class="empty-state">日付をタップすると、その日の記録を確認・編集できます。</div>';
}

async function renderDayDetail(key) {
  const detail = $('#dayDetail');
  const log = await ensureLog(key);
  const sched = scheduleByVersion(log.scheduleVersion);
  const pct = dayCompletion(log, sched);
  const tKey = todayKey();
  const editable = key <= tKey; // 未来日は編集不可

  const dayMode = log.mode || 'home';
  const modeBadge = dayMode === 'travel' ? '<span class="day-mode-pill">🧳 旅行モード</span>' : '';
  let html = `<div class="dd-head"><span class="d">${esc(fmtJP(key))}</span>${modeBadge}
     <span class="pct">${Math.round(pct * 100)}%</span></div>`;
  html += `<p class="dd-hint">${editable ? 'タップで後から修正できます（飲み忘れ・付け忘れの訂正用）。' : '未来の日付は記録できません。'}</p>`;

  const visibleForDay = visibleItemsForLog(log, sched);
  for (const b of sched.blocks) {
    const items = visibleForDay.filter(i => i.block === b.id);
    if (items.length === 0) continue;
    let rows = '';
    for (const it of items) {
      const on = !!(log.entries[it.id] && log.entries[it.id].checked);
      rows += `<button class="row${on ? ' on' : ''}${it.optional ? ' opt' : ''}" data-id="${esc(it.id)}" ${editable ? '' : 'disabled'}>
        <span class="cb">${CHECK_SVG}</span>
        <span class="name">${esc(it.name)}${it.optional ? '<span class="opt-tag">任意</span>' : ''}</span>
        <span class="amt">${esc(it.dose)}${it.doseNote ? `<small>${esc(it.doseNote)}</small>` : ''}</span>
        <span class="badge ${badgeClass(it.badge)}">${esc(it.badge || '')}</span>
      </button>`;
    }
    html += `<div class="block" style="margin-bottom:10px">
      <div class="block-head" style="background:${esc(b.color)}"><span class="t">${esc(b.label)}</span>
      <span class="ctx">${esc(b.context || '')}</span></div><div class="rows">${rows}</div></div>`;
  }
  html += `<div class="note-card"><label>この日のメモ</label>
    <textarea id="dayNote" ${editable ? '' : 'disabled'} placeholder="${editable ? '任意。自動保存されます。' : ''}">${esc(log.note || '')}</textarea></div>`;

  detail.innerHTML = html;

  if (editable) {
    $$('#dayDetail .row').forEach(btn => btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      const cur = log.entries[id] && log.entries[id].checked;
      log.entries[id] = { checked: !cur, checkedAt: !cur ? new Date().toISOString() : null };
      await saveLog(log);
      btn.classList.toggle('on', !cur);
      const np = dayCompletion(log, sched);
      detail.querySelector('.pct').textContent = `${Math.round(np * 100)}%`;
      renderHistory();
      if (key === state.todayKey) { todayLog = log; updateRing(); }
    }));
    const dn = $('#dayNote');
    let t = null;
    dn.addEventListener('input', () => { log.note = dn.value; clearTimeout(t); t = setTimeout(() => saveLog(log), 400); });
  }
}

/* ============================================================
 * 設定ビュー
 * ============================================================ */
async function renderSettings() {
  // 境界時刻セレクト
  const sel = $('#boundarySel');
  if (!sel.options.length) {
    for (let h = 0; h <= 12; h++) {
      const o = document.createElement('option'); o.value = h;
      o.textContent = h === 0 ? '0時（標準）' : `${h}時`;
      sel.appendChild(o);
    }
    sel.addEventListener('change', async () => {
      state.settings.dayBoundaryHour = Number(sel.value);
      await idbPut('meta', { key: 'settings', value: state.settings });
      toast('境界時刻を保存しました');
      renderToday();
    });
  }
  sel.value = String(state.settings.dayBoundaryHour);
  $('#adhWindow').textContent = state.settings.adhWindow;
  $('#schedVer').textContent = state.currentVersion;
  $('#appInfo').textContent = `サプリ摂取トラッカー v1.0 ／ 全データ端末内（IndexedDB）／ 記録した日数：${(await idbAll('logs')).length}日`;

  const s = await computeStats();
  $('#statStreak').textContent = s.current;
  $('#statBest').textContent = s.best;
  $('#statDays').textContent = s.recordedDays;
  $('#statAchieved').textContent = s.achievedDays;

  const adh = await computeAdherence();
  const list = $('#adhList');
  if (adh.length === 0) { list.innerHTML = '<div class="muted">項目がありません。</div>'; }
  else {
    list.innerHTML = adh.map(a => {
      const pct = a.denom ? Math.round(a.num / a.denom * 100) : 0;
      return `<div class="adh">
        <div class="adh-top"><span>${esc(a.name)}${a.optional ? '<span class="opt-tag" style="margin-left:6px">任意</span>' : ''}</span>
          <span class="frac">${a.num}/${a.denom}日 ・ ${pct}%</span></div>
        <div class="adh-bar"><div class="adh-fill" style="width:${pct}%;background:${a.optional ? 'var(--gogo)' : 'var(--green)'}"></div></div>
      </div>`;
    }).join('');
  }
}

/* ============================================================
 * モード切替（在宅 ⇄ 旅行）と 持参リスト編集
 * ============================================================ */

/** 現在のmodeをUIに反映（モードバー・🧳バッジ・持参リスト編集ボタンの表示） */
function updateModeUI() {
  const mode = currentMode();
  $$('#modeBar .mode-btn').forEach(b => b.classList.toggle('on', b.dataset.mode === mode));
  const ind = $('#travelIndicator'); if (ind) ind.hidden = (mode !== 'travel');
  const pbtn = $('#packEditBtnInline'); if (pbtn) pbtn.hidden = (mode !== 'travel');
}

/** モード切替（在宅 ⇄ 旅行） */
async function setMode(newMode) {
  if (newMode === currentMode()) return;
  // 旅行モードへ切替時、持参リストが空なら必ず編集画面へ
  if (newMode === 'travel' && (!state.travelPack || state.travelPack.length === 0)) {
    state.settings.mode = newMode;
    await idbPut('meta', { key: 'settings', value: state.settings });
    openPackEditor(true);
    return;
  }
  state.settings.mode = newMode;
  await idbPut('meta', { key: 'settings', value: state.settings });
  // 今日のログ（あれば）にmode/packListを反映
  if (todayLog) {
    todayLog.mode = newMode;
    if (newMode === 'travel') todayLog.packList = [...(state.travelPack || [])];
    else delete todayLog.packList;
    await saveLog(todayLog);
  }
  toast(newMode === 'travel' ? '🧳 旅行モードに切替えました' : '🏠 在宅モードに切替えました');
  await renderToday();
}

/** 持参リスト編集画面を開く */
function openPackEditor(fromModeToggle) {
  // 現在のpackをドラフトにコピー（無ければ全項目チェック済みでスタート）
  const all = currentSchedule().items.filter(i => i.enabled !== false).map(i => i.id);
  const baseSet = new Set(state.travelPack && state.travelPack.length ? state.travelPack : all);
  state.packDraft = baseSet;
  state.packEditorOpenedFromToggle = !!fromModeToggle;
  showView('pack');
  renderPackEditor();
}

function renderPackEditor() {
  const sched = currentSchedule();
  const list = $('#packList'); list.innerHTML = '';
  for (const b of sched.blocks) {
    const items = sched.items.filter(i => i.block === b.id && i.enabled !== false);
    if (items.length === 0) continue;
    const sec = document.createElement('div');
    sec.className = 'pack-section';
    let rows = '';
    for (const it of items) {
      const checked = state.packDraft.has(it.id);
      rows += `<label class="pack-row${checked ? ' on' : ''}" data-id="${esc(it.id)}">
        <input type="checkbox" ${checked ? 'checked' : ''}>
        <span class="pack-name">${esc(it.name)}${it.optional ? '<span class="opt-tag">任意</span>' : ''}</span>
        <span class="pack-dose">${esc(it.dose)}</span>
      </label>`;
    }
    sec.innerHTML = `<div class="pack-block-head" style="background:${esc(b.color)}">${esc(b.label)}</div><div class="pack-rows">${rows}</div>`;
    list.appendChild(sec);
  }
  // 全選択／全解除のクイックボタン
  const ctrl = $('#packQuickCtrl');
  if (ctrl) ctrl.innerHTML = `<button class="btn ghost" id="packAll">全部✓</button><button class="btn ghost" id="packNone">全部外す</button>`;
  $$('#packList .pack-row input').forEach(inp => {
    inp.addEventListener('change', () => {
      const row = inp.closest('.pack-row');
      const id = row.dataset.id;
      if (inp.checked) state.packDraft.add(id); else state.packDraft.delete(id);
      row.classList.toggle('on', inp.checked);
      updatePackCount();
    });
  });
  const allBtn = $('#packAll'); if (allBtn) allBtn.addEventListener('click', () => {
    for (const it of sched.items) if (it.enabled !== false) state.packDraft.add(it.id);
    renderPackEditor();
  });
  const noneBtn = $('#packNone'); if (noneBtn) noneBtn.addEventListener('click', () => {
    state.packDraft.clear();
    renderPackEditor();
  });
  updatePackCount();
}

function updatePackCount() {
  const c = $('#packCount'); if (!c) return;
  const total = currentSchedule().items.filter(i => i.enabled !== false).length;
  c.textContent = `${state.packDraft.size}/${total} 項目を持参`;
}

async function savePackList() {
  state.travelPack = [...state.packDraft];
  await idbPut('meta', { key: 'travelPack', value: state.travelPack });
  // 持参リスト編集→保存で旅行モードへ確定（toggle 経由オープン時）or 単独編集時はモード維持
  if (state.packEditorOpenedFromToggle) {
    // 既にモードはtravelに変更済み。今日のログにpackListを反映
    if (todayLog) {
      todayLog.mode = 'travel';
      todayLog.packList = [...state.travelPack];
      await saveLog(todayLog);
    }
    toast('🧳 旅行モード（持参リスト保存）');
  } else {
    // 旅行モード中なら今日のログも更新
    if (currentMode() === 'travel' && todayLog) {
      todayLog.packList = [...state.travelPack];
      await saveLog(todayLog);
    }
    toast('持参リストを保存しました');
  }
  showView('today');
}

function cancelPackList() {
  // 編集モードからの起動で持参リスト未確定→在宅モードへ戻す
  if (state.packEditorOpenedFromToggle && (!state.travelPack || state.travelPack.length === 0)) {
    state.settings.mode = 'home';
    idbPut('meta', { key: 'settings', value: state.settings });
  }
  showView('today');
}

/* ============================================================
 * スケジュール編集
 * ============================================================ */
function openEditor() {
  const sched = currentSchedule();
  state.editDraft = JSON.parse(JSON.stringify(sched.items));
  showView('editor');
  renderEditor();
}
function renderEditor() {
  const sched = currentSchedule();
  const list = $('#editorList'); list.innerHTML = '';
  const blockOpts = sched.blocks.map(b => `<option value="${b.id}">${esc(b.label)}</option>`).join('');

  state.editDraft.forEach((it, idx) => {
    const el = document.createElement('div');
    el.className = 'edit-item' + (it.enabled === false ? ' disabled' : '');
    el.innerHTML = `
      <div class="edit-head">
        <strong>${esc(it.name || '（無題）')}</strong>
        <div class="ord">
          <button class="minibtn" data-act="up" data-i="${idx}" aria-label="上へ">↑</button>
          <button class="minibtn" data-act="down" data-i="${idx}" aria-label="下へ">↓</button>
          <button class="minibtn" data-act="del" data-i="${idx}" aria-label="削除">🗑</button>
        </div>
      </div>
      <div class="edit-grid">
        <div class="full"><label>名前</label><input data-f="name" data-i="${idx}" value="${esc(it.name)}"></div>
        <div><label>用量</label><input data-f="dose" data-i="${idx}" value="${esc(it.dose)}"></div>
        <div><label>用量メモ</label><input data-f="doseNote" data-i="${idx}" value="${esc(it.doseNote || '')}"></div>
        <div><label>時間帯</label><select data-f="block" data-i="${idx}">${blockOpts}</select></div>
        <div><label>タイミング印</label><input data-f="badge" data-i="${idx}" value="${esc(it.badge || '')}"></div>
        <div class="full" style="display:flex;gap:18px;margin-top:4px">
          <label class="chk"><input type="checkbox" data-f="optional" data-i="${idx}" ${it.optional ? 'checked' : ''}>任意（達成率に含めない）</label>
          <label class="chk"><input type="checkbox" data-f="enabled" data-i="${idx}" ${it.enabled !== false ? 'checked' : ''}>有効</label>
        </div>
      </div>`;
    el.querySelector('select[data-f="block"]').value = it.block;
    list.appendChild(el);
  });

  // 入力反映
  $$('#editorList input,#editorList select').forEach(inp => {
    const i = Number(inp.dataset.i), f = inp.dataset.f;
    inp.addEventListener('input', () => {
      if (f === 'optional') state.editDraft[i].optional = inp.checked;
      else if (f === 'enabled') { state.editDraft[i].enabled = inp.checked; inp.closest('.edit-item').classList.toggle('disabled', !inp.checked); }
      else state.editDraft[i][f] = inp.value;
      if (f === 'name') inp.closest('.edit-item').querySelector('strong').textContent = inp.value || '（無題）';
    });
  });
  $$('#editorList .minibtn').forEach(btn => btn.addEventListener('click', () => {
    const i = Number(btn.dataset.i), act = btn.dataset.act;
    if (act === 'del') { if (confirm('この項目を削除しますか？（過去の記録は残ります）')) { state.editDraft.splice(i, 1); renderEditor(); } }
    else if (act === 'up' && i > 0) { [state.editDraft[i - 1], state.editDraft[i]] = [state.editDraft[i], state.editDraft[i - 1]]; renderEditor(); }
    else if (act === 'down' && i < state.editDraft.length - 1) { [state.editDraft[i + 1], state.editDraft[i]] = [state.editDraft[i], state.editDraft[i + 1]]; renderEditor(); }
  }));
}
function addEditItem() {
  const sched = currentSchedule();
  const id = 'custom_' + Date.now().toString(36);
  state.editDraft.push({ id, block: sched.blocks[0].id, name: '', dose: '', doseNote: '', badge: '食事と', optional: false, enabled: true });
  renderEditor();
  $('#editorList').lastElementChild.scrollIntoView({ behavior: 'smooth', block: 'center' });
}
async function saveSchedule() {
  // バリデーション：名前必須
  const valid = state.editDraft.filter(i => (i.name || '').trim());
  if (valid.length === 0) { toast('項目がありません'); return; }
  const newVer = new Date().toISOString();
  const sched = currentSchedule();
  const snapshot = { version: newVer, blocks: JSON.parse(JSON.stringify(sched.blocks)), items: valid };
  state.scheduleVersions.push(snapshot);
  state.currentVersion = newVer;
  await idbPut('meta', { key: 'scheduleVersions', value: state.scheduleVersions });
  await idbPut('meta', { key: 'currentVersion', value: newVer });
  toast('スケジュールを保存しました');
  showView('settings'); renderSettings();
}
async function resetSchedule() {
  if (!confirm('スケジュールを初期状態に戻します。よろしいですか？（過去の記録は残ります）')) return;
  const newVer = new Date().toISOString();
  const snap = { version: newVer, blocks: JSON.parse(JSON.stringify(SEED.blocks)), items: JSON.parse(JSON.stringify(SEED.items)) };
  state.scheduleVersions.push(snap);
  state.currentVersion = newVer;
  await idbPut('meta', { key: 'scheduleVersions', value: state.scheduleVersions });
  await idbPut('meta', { key: 'currentVersion', value: newVer });
  toast('初期スケジュールに戻しました');
  renderSettings();
}

/* ============================================================
 * エクスポート / インポート
 * ============================================================ */
function download(filename, text, mime) {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
async function exportJson() {
  const logs = await idbAll('logs');
  const data = {
    app: 'supplement-tracker', exportedAt: new Date().toISOString(),
    settings: state.settings, scheduleVersions: state.scheduleVersions, currentVersion: state.currentVersion, logs
  };
  download(`supplement-tracker_${todayKey()}.json`, JSON.stringify(data, null, 2), 'application/json');
  toast('JSONを書き出しました');
}
async function exportCsv() {
  const logs = (await idbAll('logs')).sort((a, b) => a.date < b.date ? -1 : 1);
  const rows = [['date', 'itemId', 'name', 'checked', 'timestamp']];
  for (const log of logs) {
    const sched = scheduleByVersion(log.scheduleVersion);
    for (const it of sched.items) {
      if (it.enabled === false) continue;
      const e = log.entries[it.id];
      rows.push([log.date, it.id, it.name, e && e.checked ? '1' : '0', (e && e.checkedAt) || '']);
    }
  }
  const csv = rows.map(r => r.map(c => {
    const s = String(c); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }).join(',')).join('\n');
  download(`supplement-tracker_${todayKey()}.csv`, '﻿' + csv, 'text/csv');
  toast('CSVを書き出しました');
}
async function importJson(file) {
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    if (data.app !== 'supplement-tracker' || !Array.isArray(data.logs)) { toast('対応していないファイルです'); return; }
    if (!confirm('現在のデータを、このファイルの内容で置き換えます。よろしいですか？')) return;
    if (data.settings) { state.settings = Object.assign(state.settings, data.settings); await idbPut('meta', { key: 'settings', value: state.settings }); }
    if (data.scheduleVersions) { state.scheduleVersions = data.scheduleVersions; await idbPut('meta', { key: 'scheduleVersions', value: state.scheduleVersions }); }
    if (data.currentVersion) { state.currentVersion = data.currentVersion; await idbPut('meta', { key: 'currentVersion', value: state.currentVersion }); }
    // ログ全消し→投入
    const existing = await idbAll('logs');
    for (const l of existing) await idbDelete('logs', l.date);
    for (const l of data.logs) await idbPut('logs', l);
    toast('復元しました');
    renderToday(); renderSettings();
  } catch (e) { toast('読み込みに失敗しました'); }
}

/* ============================================================
 * ビュー切替
 * ============================================================ */
function showView(name) {
  $$('.view').forEach(v => v.classList.remove('active'));
  const map = { today: 'view-today', history: 'view-history', settings: 'view-settings', editor: 'view-editor', pack: 'view-pack' };
  $('#' + map[name]).classList.add('active');
  // ボトムナビは「pack」「editor」は今日タブをアクティブ風に維持
  const navTab = (name === 'pack' || name === 'editor') ? 'today' : name;
  $$('nav.tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === navTab));
  $('#todayTitle').textContent = { today: '今日', history: '履歴', settings: '設定', editor: '設定', pack: '持参リスト' }[name];

  if (name === 'today') renderToday();
  else if (name === 'history') renderHistory();
  else if (name === 'settings') renderSettings();
}

/* ============================================================
 * 起動
 * ============================================================ */
async function init() {
  _db = await openDB();

  // メタ読み込み or 初期化
  const s = await idbGet('meta', 'settings');
  if (s) state.settings = Object.assign(state.settings, s.value);

  let versions = await idbGet('meta', 'scheduleVersions');
  if (!versions) {
    const v0 = { version: SEED.scheduleVersion, blocks: SEED.blocks, items: SEED.items.map(i => ({ ...i, enabled: true })) };
    state.scheduleVersions = [v0];
    state.currentVersion = SEED.scheduleVersion;
    await idbPut('meta', { key: 'scheduleVersions', value: state.scheduleVersions });
    await idbPut('meta', { key: 'currentVersion', value: state.currentVersion });
  } else {
    state.scheduleVersions = versions.value;
    const cv = await idbGet('meta', 'currentVersion');
    state.currentVersion = cv ? cv.value : state.scheduleVersions[state.scheduleVersions.length - 1].version;
  }

  // 起動時マイグレーション：ソース側のシードに新しい版（SEED.scheduleVersion）が来ていて、
  // まだ取り込んでいなければ新バージョンとして適用する（＝アプリ更新でスケジュールが変わったとき）。
  // 過去ログは当時の版のまま不変（scheduleByVersion）。手動編集（ISO版）は上書きしない。
  const seedKnown = state.scheduleVersions.some(v => v.version === SEED.scheduleVersion);
  if (!seedKnown) {
    const seedSnap = { version: SEED.scheduleVersion, blocks: JSON.parse(JSON.stringify(SEED.blocks)), items: SEED.items.map(i => ({ ...i, enabled: true })) };
    state.scheduleVersions.push(seedSnap);
    state.currentVersion = SEED.scheduleVersion;
    await idbPut('meta', { key: 'scheduleVersions', value: state.scheduleVersions });
    await idbPut('meta', { key: 'currentVersion', value: state.currentVersion });
  }

  // 持参リスト（travelPack）ロード or 初期化
  const tp = await idbGet('meta', 'travelPack');
  let packFreshInit = false;
  if (tp && Array.isArray(tp.value)) {
    state.travelPack = tp.value;
  } else {
    // 未初期化：マスター全項目を「両方」前提でデフォルト持参リスト化
    state.travelPack = currentSchedule().items.filter(i => i.enabled !== false).map(i => i.id);
    await idbPut('meta', { key: 'travelPack', value: state.travelPack });
    packFreshInit = true;
  }

  // マイグレ直後：SEEDの新項目を持参リストにも追加（"両方"前提）。
  // pack新規初期化時は全項目入れ済みなのでスキップ。手動で除外した項目は再追加しない
  // （seedJustMigrated=true でも、SEEDに「新たに登場した」項目だけが対象）
  if (!seedKnown && !packFreshInit) {
    const packSet = new Set(state.travelPack);
    // 旧スケジュール群に含まれず・新SEEDで初登場の項目のみ追加
    const oldIds = new Set();
    for (const v of state.scheduleVersions) {
      if (v.version === SEED.scheduleVersion) continue;
      for (const it of v.items) oldIds.add(it.id);
    }
    const newItemIds = SEED.items.filter(i => i.enabled !== false && !oldIds.has(i.id) && !packSet.has(i.id)).map(i => i.id);
    if (newItemIds.length > 0) {
      state.travelPack = [...state.travelPack, ...newItemIds];
      await idbPut('meta', { key: 'travelPack', value: state.travelPack });
    }
  }

  // イベント
  $$('nav.tabs button').forEach(b => b.addEventListener('click', () => showView(b.dataset.tab)));
  $('#prevMonth').addEventListener('click', () => { state.calMonth.setMonth(state.calMonth.getMonth() - 1); renderHistory(); });
  $('#nextMonth').addEventListener('click', () => { state.calMonth.setMonth(state.calMonth.getMonth() + 1); renderHistory(); });
  $('#openEditor').addEventListener('click', openEditor);
  $('#editorBack').addEventListener('click', () => { showView('settings'); });
  $('#addItem').addEventListener('click', addEditItem);
  $('#saveSchedule').addEventListener('click', saveSchedule);
  $('#resetSchedule').addEventListener('click', resetSchedule);
  $('#exportJson').addEventListener('click', exportJson);
  $('#exportCsv').addEventListener('click', exportCsv);
  $('#importBtn').addEventListener('click', () => $('#importFile').click());
  $('#importFile').addEventListener('change', (e) => { if (e.target.files[0]) importJson(e.target.files[0]); e.target.value = ''; });
  bindTodayNote();

  // モード切替（在宅 ⇄ 旅行）
  $$('#modeBar .mode-btn').forEach(b => b.addEventListener('click', () => setMode(b.dataset.mode)));
  // 持参リスト編集ボタン（モードバー横・設定タブ両方）
  const pBtnInline = $('#packEditBtnInline'); if (pBtnInline) pBtnInline.addEventListener('click', () => openPackEditor(false));
  const pBtnSettings = $('#openPackEditor'); if (pBtnSettings) pBtnSettings.addEventListener('click', () => openPackEditor(false));
  // 持参リスト編集の保存・戻る
  const savePackBtn = $('#savePackBtn'); if (savePackBtn) savePackBtn.addEventListener('click', savePackList);
  const packBackBtn = $('#packBack'); if (packBackBtn) packBackBtn.addEventListener('click', cancelPackList);

  // 復帰時に日付が変わっていたら今日を更新
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && $('#view-today').classList.contains('active') && todayKey() !== state.todayKey) renderToday();
  });

  await renderToday();

  // Service Worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

init().catch(err => {
  document.body.innerHTML = '<div class="empty-state" style="padding:60px 24px">起動に失敗しました。<br>' + esc(err.message || err) + '</div>';
});
