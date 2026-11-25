'use strict';

/* ══════════════════════════════════════════════
   성경 타자 · 개역개정
   - 한 절씩 따라 치기 (띄어쓰기·문장부호는 자동)
   - 한글 IME 조합 중에는 빨간 오타로 깜빡이지 않음
   - 한 장을 마치면 꽃 도장 🌸
   ══════════════════════════════════════════════ */

const LS_KEY = 'bible-typing-v1';
const APP_TITLE = '솔까 김안숙 권사 전용 성경 타이핑';
const DEFAULT_NAME = '김안숙 권사';
const MEMBER_KEY = 'bible-typing-member-id';
const ROOM_KEY = 'bible-typing-room';
const SOCIAL_DB = 'https://baby-feeding-9f820-default-rtdb.asia-southeast1.firebasedatabase.app';
const SOCIAL_ROOT = 'bible_typing_rooms';
const $ = (sel, root = document) => root.querySelector(sel);

/* 자동으로 채워지는 글자 (직접 치지 않아도 됨) */
const SKIP_CHARS = ' \u00a0\t\n.,!?;:\'"“”‘’()[]{}<>《》〈〉「」『』·ㆍ…~-–—―/\\|•※';
const SKIP = new Set(Array.from(SKIP_CHARS));
const isSkip = (c) => SKIP.has(c);

/* 시편은 ‘장’ 대신 ‘편’ */
const unitOf = (code) => (code === 'psa' ? '편' : '장');
const chLabel = (code, ch) => `${ch}${unitOf(code)}`;

const QUICK_BOOKS = [
  { code: 'psa', label: '시편' },
  { code: 'pro', label: '잠언' },
  { code: 'jhn', label: '요한복음' },
  { code: 'mat', label: '마태복음' },
  { code: 'rom', label: '로마서' },
  { code: 'gen', label: '창세기' },
];

const PETALS = ['🌸', '🌷', '💮', '🌺', '✨', '⭐️', '🌼'];

/* ───────── DOM ───────── */
const el = {
  body: document.body,
  petalLayer: $('#petalLayer'),
  picker: $('#picker'),
  pickerScrim: $('#pickerScrim'),
  openPicker: $('#openPicker'),
  pickerClose: $('#pickerClose'),
  bookView: $('#bookView'),
  chapterView: $('#chapterView'),
  bookGrid: $('#bookGrid'),
  chapterGrid: $('#chapterGrid'),
  chapterTitle: $('#chapterTitle'),
  backToBooks: $('#backToBooks'),
  testamentTabs: $('#testamentTabs'),
  quickChips: $('#quickChips'),
  refLabel: $('#refLabel'),
  chapterMeta: $('#chapterMeta'),
  chapterDoneBadge: $('#chapterDoneBadge'),
  continueBtn: $('#continueBtn'),
  barFill: $('#barFill'),
  verseCard: $('#verseCard'),
  verseText: $('#verseText'),
  verseNum: $('#verseNum'),
  typeBox: document.querySelector('.type-box'),
  typeInput: $('#typeInput'),
  hint: $('#hint'),
  charCount: $('#charCount'),
  btnPrev: $('#btnPrev'),
  btnClear: $('#btnClear'),
  btnNext: $('#btnNext'),
  verseChips: $('#verseChips'),
  todayStamps: $('#todayStamps'),
  todayLine: $('#todayLine'),
  totalVerses: $('#totalVerses'),
  totalChapters: $('#totalChapters'),
  totalStamps: $('#totalStamps'),
  calLabel: $('#calLabel'),
  calGrid: $('#calGrid'),
  calPrev: $('#calPrev'),
  calNext: $('#calNext'),
  openBoard: $('#openBoard'),
  openBoard2: $('#openBoard2'),
  chapterOverlay: $('#chapterOverlay'),
  ovFlower: $('#ovFlower'),
  ovInk: $('#ovInk'),
  ovTitle: $('#ovTitle'),
  ovSub: $('#ovSub'),
  ovMeta: $('#ovMeta'),
  ovNext: $('#ovNext'),
  ovBoard: $('#ovBoard'),
  ovClose: $('#ovClose'),
  brandBadge: $('#brandBadge'),
  shareBtn: $('#shareBtn'),
  shareFlower: $('#shareFlower'),
  shareDot: $('#shareDot'),
  shareLabel: $('#shareLabel'),
  shareCode: $('#shareCode'),
  copyInvite: $('#copyInvite'),
  openHall: $('#openHall'),
  rankCard: $('#rankCard'),
  rankList: $('#rankList'),
  rankPeople: $('#rankPeople'),
  rankEmpty: $('#rankEmpty'),
  rankMe: $('#rankMe'),
  rankInvite: $('#rankInvite'),
  rankHall: $('#rankHall'),
  shareOverlay: $('#shareOverlay'),
  shareClose: $('#shareClose'),
  shareDismiss: $('#shareDismiss'),
  shareStart: $('#shareStart'),
  shareCopy: $('#shareCopy'),
  shareLeave: $('#shareLeave'),
  shareStatus: $('#shareStatus'),
  nickInput: $('#nickInput'),
  roomInput: $('#roomInput'),
  hallOverlay: $('#hallOverlay'),
  hallClose: $('#hallClose'),
  hallTabHall: $('#hallTabHall'),
  hallTabCert: $('#hallTabCert'),
  hallPaneHall: $('#hallPaneHall'),
  hallPaneCert: $('#hallPaneCert'),
  hallNote: $('#hallNote'),
  certCount: $('#certCount'),
  certGrid: $('#certGrid'),
  certEmpty: $('#certEmpty'),
  certPreview: $('#certPreview'),
  certOverlay: $('#certOverlay'),
  certCard: $('#certCard'),
  certKicker: $('#certKicker'),
  certTitle: $('#certTitle'),
  certName: $('#certName'),
  certBody: $('#certBody'),
  certDate: $('#certDate'),
  certPng: $('#certPng'),
  certPrint: $('#certPrint'),
  certClose: $('#certClose'),
  boardOverlay: $('#boardOverlay'),
  boardClose: $('#boardClose'),
  boardBody: $('#boardBody'),
  boardVerses: $('#boardVerses'),
  boardChapters: $('#boardChapters'),
  boardStamps: $('#boardStamps'),
  boardDays: $('#boardDays'),
  btnExport: $('#btnExport'),
  btnImport: $('#btnImport'),
  importFile: $('#importFile'),
  btnReset: $('#btnReset'),
  toast: $('#toast'),
  fsBtns: Array.from(document.querySelectorAll('.fs-btn')),

  // 이달의 성경
  goalCard: $('#goalCard'),
  goalMonth: $('#goalMonth'),
  goalMain: $('#goalMain'),
  goalSelect: $('#goalSelect'),
  goalSave: $('#goalSave'),
  goalNote: $('#goalNote'),

  // 출석 꽃밭 · 칭호
  attCard: $('#attCard'),
  attMonth: $('#attMonth'),
  attToday: $('#attToday'),
  attStreak: $('#attStreak'),
  attGarden: $('#attGarden'),
  myTitle: $('#myTitle'),
  attNext: $('#attNext'),

  // 축하 소식
  openNews: $('#openNews'),
  openNews2: $('#openNews2'),
  newsBadge: $('#newsBadge'),
  newsCardBadge: $('#newsCardBadge'),
  newsPreview: $('#newsPreview'),
  newsOverlay: $('#newsOverlay'),
  newsClose: $('#newsClose'),
  newsInput: $('#newsInput'),
  newsSend: $('#newsSend'),
  newsList: $('#newsList'),
  newsNote: $('#newsNote'),
};

/* ───────── 상태 ───────── */
let INDEX = null;
let BOOKS = {};            // code -> book data
let bookByCode = {};       // code -> index meta
let state = null;
let cur = { code: 'gen', ch: 1, vi: 0 };
let verse = null;          // { chars, req, map }
let typedReq = [];
let composing = false;
let compActive = false;
let compLen = 0;
let advancing = false;
let skipArmed = false;
let skipTimer = 0;
let calCursor = new Date();
let loading = false;

/* ───────── 저장 ───────── */
function defaultState() {
  return {
    v: 1,
    books: {},          // code -> { ch: { v:{verseIdx:ts}, done:bool, ts } }
    days: {},           // 'YYYY-MM-DD' -> { v: n, c: n }
    stamps: [],         // [{ id, d:'YYYY-MM-DD', code, ch, t }]
    certs: [],          // 완필 상장 [{ id, kind:'book'|'all'|'month', code, name, chapters, date, ts }]
    monthly: {},        // 'YYYY-MM' -> 권 코드 (이달의 성경)
    posts: [],          // 축하 소식 [{ id, kind, name, memberId, text, code, ym, ts, replies }]
    last: { code: 'gen', ch: 1, vi: 0 },
    settings: { fs: 'md' },
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const s = defaultState();
      state = Object.assign(s, parsed);
      state.books = parsed.books || {};
      state.days = parsed.days || {};
      state.stamps = Array.isArray(parsed.stamps) ? parsed.stamps : [];
      state.certs = Array.isArray(parsed.certs) ? parsed.certs : [];
      state.monthly = (parsed.monthly && typeof parsed.monthly === 'object') ? parsed.monthly : {};
      state.posts = Array.isArray(parsed.posts) ? parsed.posts : [];
      state.settings = Object.assign({ fs: 'md' }, parsed.settings || {});
      state.last = Object.assign({ code: 'gen', ch: 1, vi: 0 }, parsed.last || {});
      return;
    }
  } catch (e) {
    console.warn('저장된 기록을 읽지 못했습니다.', e);
  }
  state = defaultState();
}

let saveTimer = 0;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('저장하지 못했습니다.', e);
    }
  }, 180);
}
function saveNow() {
  clearTimeout(saveTimer);
  try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch (e) { /* noop */ }
}

/* ───────── 날짜 ───────── */
const pad2 = (n) => String(n).padStart(2, '0');
function ymd(d = new Date()) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
const TODAY = ymd();

/* ───────── 유틸 ───────── */
function toast(msg, ms = 2200) {
  el.toast.textContent = msg;
  el.toast.hidden = false;
  el.toast.style.animation = 'none';
  void el.toast.offsetWidth;
  el.toast.style.animation = '';
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { el.toast.hidden = true; }, ms);
}

function burst(x, y, count = 7, spread = 130) {
  for (let i = 0; i < count; i++) {
    const p = document.createElement('span');
    p.className = 'petal';
    p.textContent = PETALS[Math.floor(Math.random() * PETALS.length)];
    const dx = (Math.random() - 0.5) * spread * 2;
    const dy = -60 - Math.random() * spread;
    const dur = 900 + Math.random() * 700;
    p.style.left = x + 'px';
    p.style.top = y + 'px';
    p.style.setProperty('--dx', dx.toFixed(0) + 'px');
    p.style.setProperty('--dy', dy.toFixed(0) + 'px');
    p.style.setProperty('--rot', (Math.random() * 240 - 120).toFixed(0) + 'deg');
    p.style.setProperty('--sc', (0.8 + Math.random() * 0.7).toFixed(2));
    p.style.setProperty('--dur', dur + 'ms');
    p.style.fontSize = (14 + Math.random() * 12).toFixed(0) + 'px';
    el.petalLayer.appendChild(p);
    setTimeout(() => p.remove(), dur + 80);
  }
}

function burstAtInput(count = 7) {
  const r = el.typeInput.getBoundingClientRect();
  burst(r.left + r.width * (0.35 + Math.random() * 0.3), r.top + r.height * 0.45, count, 110);
}

/* ───────── 데이터 ───────── */
async function fetchJSON(path) {
  const res = await fetch(path, { cache: 'force-cache' });
  if (!res.ok) throw new Error(`${path} ${res.status}`);
  return res.json();
}

async function getBook(code) {
  if (BOOKS[code]) return BOOKS[code];
  const data = await fetchJSON(`data/${code}.json`);
  BOOKS[code] = data;
  return data;
}

/* ───────── 그리기: 성경 목록 ───────── */
function renderBooks(testament = 'old') {
  el.bookGrid.innerHTML = '';
  const frag = document.createDocumentFragment();
  const books = INDEX.books.filter((b) => b.testament === testament);
  for (const b of books) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'book-btn';
    btn.dataset.code = b.code;
    if (b.code === cur.code) btn.classList.add('is-on');
    if (state.books[b.code] && Object.values(state.books[b.code]).some((c) => c.done)) {
      const dot = document.createElement('span');
      dot.className = 'has-dot';
      btn.appendChild(dot);
    }
    const name = document.createElement('span');
    name.textContent = b.name;
    const bc = document.createElement('span');
    bc.className = 'bc';
    bc.textContent = b.chapters;
    btn.append(name, bc);
    btn.addEventListener('click', () => openChapterPicker(b.code));
    frag.appendChild(btn);
  }
  el.bookGrid.appendChild(frag);
}

function openChapterPicker(code) {
  const meta = bookByCode[code];
  if (!meta) return;
  el.bookView.hidden = true;
  el.chapterView.hidden = false;
  el.chapterTitle.innerHTML = `${meta.name} <span>${meta.chapters}${unitOf(code)} · ${meta.verses}절</span>`;
  el.chapterGrid.innerHTML = '';
  const frag = document.createDocumentFragment();
  const mine = state.books[code] || {};
  for (let ch = 1; ch <= meta.chapters; ch++) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'chapter-btn';
    btn.textContent = ch;
    if (mine[ch] && mine[ch].done) {
      btn.classList.add('is-done');
      const f = document.createElement('span');
      f.className = 'mini-flower';
      f.textContent = '🌸';
      btn.appendChild(f);
    }
    if (code === cur.code && ch === cur.ch) btn.classList.add('is-on');
    btn.addEventListener('click', () => {
      // 마치지 않은 장은 마지막으로 친 다음 절부터 이어서
      const nextVi = mine[ch] && !mine[ch].done ? Object.keys(mine[ch].v).length : 0;
      loadChapter(code, ch, Math.max(0, nextVi));
      closePicker();
    });
    frag.appendChild(btn);
  }
  el.chapterGrid.appendChild(frag);
  el.chapterGrid.scrollTop = 0;
}

function showBookList() {
  el.chapterView.hidden = true;
  el.bookView.hidden = false;
  renderBooks(currentTestament());
}

function currentTestament() {
  const active = el.testamentTabs.querySelector('.seg-btn.is-on');
  return active ? active.dataset.t : 'old';
}

/* ───────── 그리기: 화면 ───────── */
async function loadChapter(code, ch, vi = 0) {
  loading = true;
  let book;
  try {
    book = await getBook(code);
  } catch (e) {
    loading = false;
    toast('말씀을 불러오지 못했어요. 인터넷 연결을 확인해 주세요.');
    console.error(e);
    return;
  }
  loading = false;
  cur = { code, ch, vi: Math.max(0, Math.min(vi, book.chapters[ch - 1].length - 1)) };
  renderChapterInfo();
  renderVerseChips();
  renderVerse();
  el.bookGrid.querySelectorAll('.book-btn').forEach((b) => {
    b.classList.toggle('is-on', b.dataset.code === code);
  });
  refreshContinue();
  document.title = `${book.name} ${chLabel(code, ch)} · ${APP_TITLE}`;
  if (window.innerWidth > 860) el.typeInput.focus({ preventScroll: true });
}

function renderChapterInfo() {
  const book = BOOKS[cur.code];
  if (!book) return;
  const verses = book.chapters[cur.ch - 1];
  const rec = state.books[cur.code] && state.books[cur.code][cur.ch];
  const doneN = rec ? Object.keys(rec.v).length : 0;
  el.chapterMeta.textContent = `이 ${unitOf(cur.code)} ${verses.length}절 · ${doneN}절 완료`;
  el.barFill.style.width = `${(doneN / verses.length) * 100}%`;
  el.chapterDoneBadge.hidden = !(rec && rec.done);
  el.verseNum.textContent = cur.vi + 1;
}

function renderVerseChips() {
  const book = BOOKS[cur.code];
  if (!book) return;
  const verses = book.chapters[cur.ch - 1];
  const rec = state.books[cur.code] && state.books[cur.code][cur.ch];
  el.verseChips.innerHTML = '';
  const frag = document.createDocumentFragment();
  verses.forEach((_, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'vchip';
    b.textContent = i + 1;
    if (rec && rec.v[i]) b.classList.add('is-done');
    if (i === cur.vi) b.classList.add('is-on');
    b.addEventListener('click', () => { goVerse(i); el.typeInput.focus(); });
    frag.appendChild(b);
  });
  el.verseChips.appendChild(frag);
}

function buildVerse(text) {
  const chars = Array.from(text);
  const req = [];
  const map = [];
  chars.forEach((c, i) => {
    if (isSkip(c)) {
      map.push(-1);
    } else {
      map.push(req.length);
      req.push(c);
    }
  });
  return { chars, req, map };
}

function renderVerse() {
  const book = BOOKS[cur.code];
  const text = book.chapters[cur.ch - 1][cur.vi];
  verse = buildVerse(text);

  el.refLabel.textContent = `${book.name} ${chLabel(cur.code, cur.ch)} ${cur.vi + 1}절`;
  el.verseText.innerHTML = '';
  const frag = document.createDocumentFragment();
  verse.chars.forEach((c) => {
    const s = document.createElement('span');
    s.className = 'vch todo';
    s.textContent = c;
    frag.appendChild(s);
  });
  el.verseText.appendChild(frag);

  el.typeInput.value = '';
  resetInputHeight();
  typedReq = [];
  composing = false;
  compLen = 0;
  advancing = false;
  skipArmed = false;
  renderStates();
  updateCount();
  renderChapterInfo();
  el.verseText.parentElement.scrollTop = 0;
  // 절 표시 갱신
  Array.from(el.verseChips.children).forEach((b, i) => b.classList.toggle('is-on', i === cur.vi));
  el.verseNum.textContent = cur.vi + 1;
}

function renderStates() {
  if (!verse) return;
  const spans = el.verseText.children;
  const n = typedReq.length;
  const pendFrom = composing ? Math.max(0, n - compLen) : n;
  let curEl = null;

  for (let i = 0; i < spans.length; i++) {
    const r = verse.map[i];
    const sp = spans[i];
    let cls = 'vch';
    if (r < 0) {
      cls += ' skip';
    } else if (r < pendFrom) {
      cls += typedReq[r] === verse.req[r] ? ' ok' : ' bad';
    } else if (composing && r < n) {
      // 조합 중: 파란 표시는 마지막 한 글자에만
      cls += r === n - 1 ? ' pending' : ' pending-rest';
    } else if (!composing && r === n) {
      // 조합 중이 아닐 때: 지금 칠 글자 한 칸만 파랑
      cls += ' cur';
      curEl = sp;
    } else {
      cls += ' todo';
    }
    if (sp.className !== cls) sp.className = cls;
  }

  if (curEl) keepCaretVisible(curEl);
}

function keepCaretVisible(elChar) {
  const card = el.verseCard;
  const pad = 36;
  const top = elChar.offsetTop;
  const bottom = top + elChar.offsetHeight;
  if (top < card.scrollTop + pad) {
    card.scrollTop = Math.max(0, top - pad);
  } else if (bottom > card.scrollTop + card.clientHeight - pad) {
    card.scrollTop = bottom - card.clientHeight + pad;
  }
}

function updateCount() {
  el.charCount.textContent = `${typedReq.length} / ${verse ? verse.req.length : 0}`;
}

function resetInputHeight() {
  el.typeInput.style.height = 'auto';
  const h = Math.min(el.typeInput.scrollHeight, 230);
  el.typeInput.style.height = Math.max(h, 40) + 'px';
}

/* ───────── 입력 처리 ───────── */
function filterTyped(v) {
  return Array.from(v.replace(/[\r\n]+/g, '')).filter((c) => !isSkip(c));
}

function isComplete() {
  if (!verse) return false;
  if (typedReq.length !== verse.req.length) return false;
  for (let i = 0; i < typedReq.length; i++) {
    if (typedReq[i] !== verse.req[i]) return false;
  }
  return true;
}

function onInput(ev) {
  const raw = el.typeInput.value;
  if (/[\r\n]/.test(raw)) el.typeInput.value = raw.replace(/[\r\n]+/g, '');
  composing = compActive || Boolean(ev && ev.isComposing);
  typedReq = filterTyped(el.typeInput.value);
  autoGrow();
  renderStates();
  updateCount();

  if (!composing && !advancing && isComplete()) {
    completeVerse();
  }
}

function autoGrow() {
  const t = el.typeInput;
  t.style.height = 'auto';
  const h = Math.min(t.scrollHeight, 230);
  t.style.height = Math.max(h, 40) + 'px';
}

function onCompositionStart() {
  compActive = true;
  composing = true;
  compLen = 0;
  renderStates();
}
function onCompositionUpdate(e) {
  compActive = true;
  composing = true;
  compLen = e.data ? Array.from(e.data).filter((c) => !isSkip(c)).length : 0;
  typedReq = filterTyped(el.typeInput.value);
  renderStates();
  updateCount();
}
function onCompositionEnd() {
  compActive = false;
  composing = false;
  compLen = 0;
  typedReq = filterTyped(el.typeInput.value);
  renderStates();
  updateCount();
  if (!advancing && isComplete()) completeVerse();
}

/* ───────── 절 완료 ───────── */
function ensureChapter(code, ch) {
  if (!state.books[code]) state.books[code] = {};
  if (!state.books[code][ch]) state.books[code][ch] = { v: {}, done: false, ts: 0 };
  return state.books[code][ch];
}

function markVerseDone(vi) {
  const rec = ensureChapter(cur.code, cur.ch);
  if (rec.v[vi]) return false;
  rec.v[vi] = Date.now();
  const d = state.days[TODAY] || (state.days[TODAY] = { v: 0, c: 0, ch: 0 });
  d.v += 1;
  // 오늘 완료한 글자 수 (띄어쓰기·문장부호 제외) — 오늘의 등수 동률 기준
  d.ch = (Number(d.ch) || 0) + (verse ? verse.req.length : 0);

  // 오늘 첫 절 → 자동 출석 · 연속 출석 마일스톤 축하 글
  if (Number(d.v) === 1) {
    const streak = currentStreak();
    renderAttendance();
    toast(`✅ 오늘 출석 완료 · 🔥 ${streak}일 연속`, 3400);
    burst(window.innerWidth / 2, 130, 8, 140);
    if (STREAK_MILESTONES.includes(streak)) postStreak(streak);
  }

  // 다음에 칠 자리를 '이어서 치기' 위치로 저장
  const book = BOOKS[cur.code];
  const total = book.chapters[cur.ch - 1].length;
  if (vi + 1 < total) {
    state.last = { code: cur.code, ch: cur.ch, vi: vi + 1 };
  } else if (cur.ch < book.chapters.length) {
    state.last = { code: cur.code, ch: cur.ch + 1, vi: 0 };
  } else {
    state.last = { code: cur.code, ch: cur.ch, vi };
  }
  save();
  return true;
}

function completeVerse() {
  if (advancing) return;
  advancing = true;
  markVerseDone(cur.vi);
  refreshProgressUI();

  el.verseCard.classList.add('is-clear');
  el.typeBox.classList.add('is-good');
  burstAtInput(7);

  setTimeout(() => {
    el.verseCard.classList.remove('is-clear');
    el.typeBox.classList.remove('is-good');
  }, 640);

  const book = BOOKS[cur.code];
  const total = book.chapters[cur.ch - 1].length;

  setTimeout(() => {
    advancing = false;
    if (cur.vi < total - 1) {
      goVerse(cur.vi + 1, true);
    } else {
      finishChapter();
    }
  }, 560);
}

function goVerse(vi, auto = false) {
  const book = BOOKS[cur.code];
  const total = book.chapters[cur.ch - 1].length;
  if (vi < 0) {
    // 이전 장 마지막 절
    if (cur.ch > 1) {
      const prevCh = cur.ch - 1;
      const lastVi = book.chapters[prevCh - 1].length - 1;
      loadChapter(cur.code, prevCh, lastVi);
    } else {
      toast('첫 장의 첫 절이에요 🌱');
    }
    return;
  }
  if (vi >= total) {
    if (cur.ch < book.chapters.length) {
      loadChapter(cur.code, cur.ch + 1, 0);
    } else {
      toast('이 책의 마지막 절이에요 🌸');
    }
    return;
  }
  cur.vi = vi;
  renderVerse();
  refreshContinue();
  if (auto) {
    const active = el.verseChips.querySelector('.vchip.is-on');
    if (active) {
      const box = el.verseChips;
      const top = active.offsetTop - box.offsetTop;
      if (top < box.scrollTop || top > box.scrollTop + box.clientHeight) active.scrollIntoView({ block: 'nearest' });
    }
  }
}

/* ───────── 한 장 완료 ───────── */
function finishChapter() {
  const book = BOOKS[cur.code];
  const verses = book.chapters[cur.ch - 1];
  const rec = ensureChapter(cur.code, cur.ch);
  const first = !rec.done;
  rec.done = true;
  rec.ts = Date.now();
  const d = state.days[TODAY] || (state.days[TODAY] = { v: 0, c: 0, ch: 0 });
  if (first) {
    d.c += 1;
    state.stamps.push({ id: `${cur.code}-${cur.ch}-${Date.now()}`, d: TODAY, code: cur.code, ch: cur.ch, t: Date.now() });
  }
  saveNow();
  refreshProgressUI();
  refreshContinue();
  const newCerts = syncCerts();
  const bookCert = newCerts.find((c) => c.kind === 'book');
  const monthCert = newCerts.find((c) => c.kind === 'month');
  if (bookCert) postBook(bookCert.code);
  if (monthCert) postMonth(monthCert.ym, monthCert.code);
  if (monthCert) setTimeout(() => celebrateMonth(monthCert), 500);
  renderAttendance();
  renderMonthly();
  showChapterOverlay(first, verses.length);
  if (newCerts.length) {
    const pick = monthCert || newCerts[newCerts.length - 1];
    setTimeout(() => {
      if (el.certOverlay.hidden) openCert(pick);
    }, 1150);
  }
}

function showChapterOverlay(isNew, verseCount) {
  const book = BOOKS[cur.code];
  el.ovSub.textContent = `${book.name} ${chLabel(cur.code, cur.ch)} · ${verseCount}절을 다 치셨어요`;
  el.ovTitle.textContent = isNew ? '참 잘하셨어요!' : '또 한 번 마치셨어요!';
  el.ovInk.textContent = isNew ? '꽃 도장 쾅!' : '정성 가득 🌸';
  el.ovFlower.textContent = '🌸';

  const dayV = (state.days[TODAY] && state.days[TODAY].v) || 0;
  const dayC = (state.days[TODAY] && state.days[TODAY].c) || 0;
  el.ovMeta.innerHTML = `
    <div><b>${verseCount}</b><span>이 ${unitOf(cur.code)}의 절</span></div>
    <div><b>${dayV}</b><span>오늘 친 절</span></div>
    <div><b>${dayC}</b><span>오늘 딴 도장</span></div>`;

  const hasNext = cur.ch < book.chapters.length;
  el.ovNext.textContent = hasNext ? `다음 ${unitOf(cur.code)} 이어서 치기` : '이 책의 처음으로';
  el.ovNext.dataset.mode = hasNext ? 'next' : 'restart';

  el.chapterOverlay.hidden = false;
  el.ovFlower.style.animation = 'none';
  void el.ovFlower.offsetWidth;
  el.ovFlower.style.animation = '';
  setTimeout(() => {
    const r = el.ovFlower.getBoundingClientRect();
    burst(r.left + r.width / 2, r.top + r.height / 2, 14, 170);
  }, 380);
}

/* ───────── 진행 상황 UI ───────── */
function computeTotals() {
  let verses = 0, chapters = 0;
  for (const code of Object.keys(state.books)) {
    const book = state.books[code];
    for (const ch of Object.keys(book)) {
      const rec = book[ch];
      verses += Object.keys(rec.v || {}).length;
      if (rec.done) chapters += 1;
    }
  }
  return { verses, chapters, stamps: state.stamps.length, days: Object.keys(state.days).length };
}

function refreshProgressUI() {
  const t = computeTotals();
  el.totalVerses.textContent = t.verses.toLocaleString('ko-KR');
  el.totalChapters.textContent = t.chapters.toLocaleString('ko-KR');
  el.totalStamps.textContent = t.stamps.toLocaleString('ko-KR');

  const d = state.days[TODAY] || { v: 0, c: 0 };
  el.todayLine.innerHTML = `오늘 <b>${d.v}</b>절 · <b>${d.c}</b>장`;

  // 오늘 도장
  el.todayStamps.innerHTML = '';
  const todays = state.stamps.filter((s) => s.d === TODAY).slice(-6).reverse();
  if (!todays.length) {
    const p = document.createElement('p');
    p.className = 'none';
    p.textContent = '아직 오늘 도장이 없어요. 한 장을 다 치면 꽃 도장이 쾅! 찍혀요 🌱';
    el.todayStamps.appendChild(p);
  } else {
    todays.forEach((s) => {
      const meta = bookByCode[s.code];
      const b = document.createElement('div');
      b.className = 'stamp-mini';
      b.innerHTML = `<span class="f">🌸</span><span class="l">${meta ? meta.short : ''} ${chLabel(s.code, s.ch)}</span>`;
      el.todayStamps.appendChild(b);
    });
  }

  renderCalendar();
  renderAttendance();
  renderMonthly();
  if (!el.boardOverlay.hidden) renderBoard();
  renderChapterInfo();
  updateBookDots();
  renderRank();
  renderNewsPreview();
  updateNewsBadge();
  socialPush();
  updateCertCount();
}

function updateBookDots() {
  el.bookGrid.querySelectorAll('.book-btn').forEach((btn) => {
    const code = btn.dataset.code;
    const has = state.books[code] && Object.values(state.books[code]).some((c) => c.done);
    const dot = btn.querySelector('.has-dot');
    if (has && !dot) {
      const s = document.createElement('span');
      s.className = 'has-dot';
      btn.appendChild(s);
    } else if (!has && dot) {
      dot.remove();
    }
  });
}

function renderCalendar() {
  const y = calCursor.getFullYear();
  const m = calCursor.getMonth();
  el.calLabel.textContent = `${y}년 ${m + 1}월`;
  el.calGrid.innerHTML = '';
  ['일', '월', '화', '수', '목', '금', '토'].forEach((d) => {
    const s = document.createElement('span');
    s.className = 'dow';
    s.textContent = d;
    el.calGrid.appendChild(s);
  });
  const first = new Date(y, m, 1).getDay();
  const lastDate = new Date(y, m + 1, 0).getDate();
  for (let i = 0; i < first; i++) {
    const s = document.createElement('span');
    s.className = 'day empty';
    el.calGrid.appendChild(s);
  }
  for (let d = 1; d <= lastDate; d++) {
    const key = `${y}-${pad2(m + 1)}-${pad2(d)}`;
    const s = document.createElement('span');
    s.className = 'day';
    s.textContent = d;
    if (state.days[key] && state.days[key].v > 0) s.classList.add('has');
    if (key === TODAY) {
      s.classList.add('today');
      if (state.days[key] && state.days[key].v > 0) s.classList.add('att');
    }
    s.title = state.days[key] ? `${state.days[key].v}절 · ${state.days[key].c}장` : '';
    el.calGrid.appendChild(s);
  }
}

/* ───────── 도장판 ───────── */
function renderBoard() {
  const t = computeTotals();
  el.boardVerses.textContent = t.verses.toLocaleString('ko-KR');
  el.boardChapters.textContent = t.chapters.toLocaleString('ko-KR');
  el.boardStamps.textContent = t.stamps.toLocaleString('ko-KR');
  el.boardDays.textContent = t.days.toLocaleString('ko-KR');

  el.boardBody.innerHTML = '';
  if (!state.stamps.length) {
    const p = document.createElement('p');
    p.className = 'board-empty';
    p.innerHTML = '아직 모은 꽃 도장이 없어요.<br>성경 한 장을 다 치면 여기에 꽃이 하나씩 피어나요 🌸';
    el.boardBody.appendChild(p);
    return;
  }
  const groups = new Map();
  [...state.stamps].sort((a, b) => b.t - a.t).forEach((s) => {
    const [yy, mm] = s.d.split('-');
    const key = `${yy}-${mm}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(s);
  });
  for (const [key, list] of groups) {
    const [yy, mm] = key.split('-');
    const sec = document.createElement('section');
    sec.className = 'board-month';
    sec.innerHTML = `<h3>${yy}년 ${Number(mm)}월 · ${list.length}개</h3>`;
    const grid = document.createElement('div');
    grid.className = 'stamp-grid';
    list.forEach((s) => {
      const meta = bookByCode[s.code];
      const item = document.createElement('div');
      item.className = 'stamp-item';
      item.innerHTML = `<span class="f">🌸</span>
        <span class="t">${meta ? meta.name : s.code} ${chLabel(s.code, s.ch)}</span>
        <span class="d">${Number(s.d.slice(5, 7))}/${Number(s.d.slice(8, 10))}</span>`;
      grid.appendChild(item);
    });
    sec.appendChild(grid);
    el.boardBody.appendChild(sec);
  }
}

/* ══════════════════════════════════════════════
   함께 쓰기 (Firebase RTDB · SSE) · 오늘의 등수 · 명예의 전당 · 상장
   ══════════════════════════════════════════════ */
const social = {
  myId: '',
  name: DEFAULT_NAME,
  room: '',
  mode: 'local',      // local | connecting | live | polling | offline | error
  mirror: null,       // 방 스냅숏 { members:{}, claps:{} }
  es: null,
  pollTimer: null,
  watchTimer: null,
  lastEvent: 0,
  fails: 0,
  restarts: 0,
  pushTimer: 0,
  joined: false,
  announced: false,
  clapSeen: null,
  wasFirst: null,
  invited: false,
  newsBase: null,
  newsSeen: null,
};
let certCur = null;

const nameOf = () => social.name || (social.room ? '이름 미정' : DEFAULT_NAME);

function mk(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}
const dateKo = (d) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(d || ''));
  if (!m) return String(d || '');
  return `${m[1]}년 ${Number(m[2])}월 ${Number(m[3])}일`;
};

function normRoom(v) {
  return String(v || '')
    .replace(/\s+/g, '')
    .replace(/[^0-9A-Za-z\uAC00-\uD7A3_-]/g, '')
    .replace(/[a-z]/g, (c) => c.toUpperCase())
    .slice(0, 12);
}
const roomValid = (c) => typeof c === 'string' && c.length >= 2 && c.length <= 12;
const roomUrl = (suffix = '') =>
  `${SOCIAL_DB}/${SOCIAL_ROOT}/${encodeURIComponent(social.room)}${suffix}`;
const memberUrl = (id) => `${roomUrl('/members')}/${encodeURIComponent(id)}.json`;
const clapNodeUrl = (target, key) =>
  `${roomUrl('/claps')}/${encodeURIComponent(target)}/${encodeURIComponent(key)}.json`;
const goalNodeUrl = (ym) => `${roomUrl('/monthlyGoal')}/${encodeURIComponent(ym)}.json`;
const postNodeUrl = (id) => `${roomUrl('/posts')}/${encodeURIComponent(id)}.json`;
const replyNodeUrl = (postId, rid) =>
  `${roomUrl('/posts')}/${encodeURIComponent(postId)}/replies/${encodeURIComponent(rid)}.json`;

function fbRequest(method, url, body) {
  const opts = { method, cache: 'no-store' };
  if (body !== undefined) {
    opts.headers = { 'Content-Type': 'application/json' };
    opts.body = JSON.stringify(body);
  }
  return fetch(url, opts).then((res) => {
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return res.text();
  });
}

/* ───────── 내 기록 ───────── */
function countClaps(node) {
  if (!node || typeof node !== 'object') return 0;
  return Object.keys(node).length;
}

function mySnapshot() {
  const t = computeTotals();
  const d = state.days[TODAY] || { v: 0, c: 0, ch: 0 };
  const books = {};
  let count = 0;
  Object.keys(state.books).forEach((code) => {
    const meta = bookByCode[code];
    if (!meta) return;
    const rec = state.books[code];
    for (let ch = 1; ch <= meta.chapters; ch++) {
      const r = rec[ch];
      if (!r || !r.done) return;
    }
    books[code] = true;
    count += 1;
  });
  return {
    name: nameOf(),
    today: TODAY,
    todayVerses: Number(d.v) || 0,
    todayChars: Number(d.ch) || 0,
    totalVerses: t.verses,
    totalChapters: t.chapters,
    bookCount: count,
    books,
    oneRead: t.chapters >= 1189,
    stamps: t.stamps,
    streak: currentStreak(),
    attendedToday: attendedToday(),
    updatedAt: Date.now(),
  };
}

/** 모임에 처음 들어올 때: 이 기기의 기록과 방에 있던 내 기록을 합산 (사라지지 않게) */
function mergeSnap(mine, remote) {
  if (!remote || typeof remote !== 'object') return mine;
  const books = Object.assign({}, remote.books || {}, mine.books || {});
  const sameDay = remote.today === TODAY;
  return Object.assign({}, mine, {
    totalVerses: Math.max(mine.totalVerses, Number(remote.totalVerses) || 0),
    totalChapters: Math.max(mine.totalChapters, Number(remote.totalChapters) || 0),
    bookCount: Object.keys(books).length,
    books,
    oneRead: mine.oneRead || !!remote.oneRead,
    todayVerses: sameDay ? Math.max(mine.todayVerses, Number(remote.todayVerses) || 0) : mine.todayVerses,
    todayChars: sameDay ? Math.max(mine.todayChars, Number(remote.todayChars) || 0) : mine.todayChars,
    stamps: Math.max(mine.stamps, Number(remote.stamps) || 0),
    streak: Math.max(mine.streak || 0, Number(remote.streak) || 0),
    attendedToday: mine.attendedToday || !!remote.attendedToday,
  });
}

/* ───────── 오늘의 등수 ───────── */
function rowOf(id, m, claps, isMe) {
  const today = m.today === TODAY;
  return {
    id,
    isMe,
    name: String(m.name || DEFAULT_NAME).slice(0, 16),
    todayVerses: today ? Number(m.todayVerses) || 0 : 0,
    todayChars: today ? Number(m.todayChars) || 0 : 0,
    totalVerses: Number(m.totalVerses) || 0,
    totalChapters: Number(m.totalChapters) || 0,
    bookCount: Number(m.bookCount) || 0,
    books: (m.books && typeof m.books === 'object') ? m.books : {},
    oneRead: !!m.oneRead,
    streak: Number(m.streak) || 0,
    attendedToday: !!m.attendedToday,
    title: titleFor(Number(m.totalVerses) || 0),
    claps: countClaps(claps[id]),
  };
}

function rankRows() {
  const members = (social.mirror && social.mirror.members) || {};
  const claps = (social.mirror && social.mirror.claps) || {};
  const mine = mySnapshot();
  const rows = [];
  if (!social.room) {
    rows.push(rowOf(social.myId || 'me', mine, claps, true));
  } else {
    const ids = new Set(Object.keys(members));
    ids.add(social.myId);
    ids.forEach((id) => {
      const isMe = id === social.myId;
      const data = isMe ? mergeSnap(mine, members[id]) : members[id];
      if (!data || typeof data !== 'object') return;
      rows.push(rowOf(id, data, claps, isMe));
    });
  }
  rows.sort((a, b) =>
    b.todayVerses - a.todayVerses ||
    b.todayChars - a.todayChars ||
    b.totalChapters - a.totalChapters ||
    a.name.localeCompare(b.name, 'ko'));
  rows.forEach((r, i) => { r.rank = i + 1; });
  return rows;
}

function petalFor(rank) {
  if (rank === 1) return { icon: '🌸', cls: 'gold', tag: '금꽃잎' };
  if (rank === 2) return { icon: '🌸', cls: 'silver', tag: '은꽃' };
  if (rank === 3) return { icon: '🌸', cls: 'bronze', tag: '동꽃' };
  if (rank === 4) return { icon: '🌱', cls: 'sprout', tag: '새싹' };
  if (rank === 5) return { icon: '🌷', cls: 'bud', tag: '꽃봉오리' };
  return { icon: '·', cls: '', tag: '' };
}

function rankRowEl(r) {
  const petal = petalFor(r.rank);
  const li = mk('li', 'rank-row' + (r.isMe ? ' is-me' : '') + (r.rank === 1 ? ' is-first' : ''));
  li.dataset.rank = String(r.rank);
  li.dataset.member = r.id;
  li.appendChild(mk('span', 'rank-no', String(r.rank)));
  const p = mk('span', 'rank-petal ' + petal.cls, petal.icon);
  p.title = petal.tag || `${r.rank}위`;
  p.setAttribute('aria-label', petal.tag || `${r.rank}위`);
  li.appendChild(p);
  const name = mk('span', 'rank-name');
  const who = mk('span', 'rank-who');
  who.appendChild(mk('b', '', r.name));
  if (r.isMe) who.appendChild(mk('span', 'me-tag', '나'));
  if (petal.tag) who.appendChild(mk('em', 'rank-tag ' + petal.cls, petal.tag));
  name.appendChild(who);
  const metaLine = mk('span', 'rank-meta');
  metaLine.appendChild(mk('em', 'title-badge ' + titleTier(r.totalVerses).cls, r.title));
  if (r.streak > 0) {
    metaLine.appendChild(mk('span', 'rank-streak' + (r.streak >= 3 ? ' is-hot' : ''), `🔥 ${r.streak}일`));
  }
  name.appendChild(metaLine);
  li.appendChild(name);
  const score = mk('span', 'rank-score');
  score.appendChild(mk('b', '', r.todayVerses.toLocaleString('ko-KR')));
  score.appendChild(document.createTextNode('절'));
  li.appendChild(score);
  if (r.isMe || !social.room) {
    const self = mk('span', 'clap-btn is-self', '👏 ' + r.claps);
    self.title = '내가 받은 응원의 박수';
    li.appendChild(self);
  } else {
    const b = mk('button', 'clap-btn', '👏 ' + r.claps);
    b.type = 'button';
    b.dataset.clap = r.id;
    b.title = `${r.name}님께 응원의 박수 보내기`;
    b.setAttribute('aria-label', `${r.name}님께 응원의 박수 ${r.claps}개 · 한 번 더 보내기`);
    li.appendChild(b);
  }
  return li;
}

function renderRank() {
  if (!el.rankList) return;
  const rows = rankRows();
  el.rankList.innerHTML = '';
  rows.slice(0, 5).forEach((r) => el.rankList.appendChild(rankRowEl(r)));

  const me = rows.find((r) => r.isMe);
  const outside = me && me.rank > 5;
  el.rankMe.hidden = !outside;
  if (outside) {
    el.rankMe.textContent = `내 순위 ${me.rank}위 · 오늘 ${me.todayVerses.toLocaleString('ko-KR')}절 (${me.todayChars.toLocaleString('ko-KR')}자)`;
  }
  el.rankEmpty.hidden = !!social.room || rows.some((r) => r.todayVerses > 0);
  el.rankInvite.hidden = !!social.room;
  const playing = rows.filter((r) => r.todayVerses > 0).length;
  el.rankPeople.hidden = !social.room;
  el.rankPeople.textContent = social.room ? `${playing}명 참여` : '';
  checkFirstPlace(rows);
}

function checkFirstPlace(rows) {
  if (!social.room) { social.wasFirst = null; return; }
  const leader = rows[0];
  const iAmFirst = !!(leader && leader.isMe && leader.todayVerses > 0);
  if (social.wasFirst === null) { social.wasFirst = iAmFirst; return; }
  if (iAmFirst && !social.wasFirst) {
    toast(`🌼 ${nameOf()}님이 오늘 1등 금꽃잎에 오르셨어요!`, 4200);
    burst(window.innerWidth / 2, 130, 14, 170);
  }
  social.wasFirst = iAmFirst;
}

function sendClap(target) {
  if (!social.room) { openShareSheet(); return; }
  if (!target || target === social.myId) return;
  const key = `${social.myId}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  if (!social.mirror) social.mirror = { members: {}, claps: {} };
  if (!social.mirror.claps) social.mirror.claps = {};
  if (!social.mirror.claps[target]) social.mirror.claps[target] = {};
  social.mirror.claps[target][key] = Date.now();
  renderRank();
  fbRequest('PUT', clapNodeUrl(target, key), Date.now())
    .then(() => toast('👏 응원의 박수를 보냈어요!'))
    .catch(() => toast('박수를 보내지 못했어요 · 연결을 확인해 주세요'));
}

function detectClap() {
  const claps = (social.mirror && social.mirror.claps) || {};
  const mine = countClaps(claps[social.myId]);
  if (social.clapSeen === null) { social.clapSeen = mine; return; }
  if (mine > social.clapSeen) {
    toast('👏 누군가 응원의 박수를 보냈어요!', 3200);
    burst(window.innerWidth / 2, 120, 9, 130);
  }
  social.clapSeen = mine;
}

/* ───────── 모임 연결 ───────── */
function loadSocial() {
  let customName = false;
  try {
    let id = localStorage.getItem(MEMBER_KEY);
    if (!id || !/^[a-z0-9]{6,24}$/.test(id)) {
      id = 'm' + Math.random().toString(36).slice(2, 10);
      localStorage.setItem(MEMBER_KEY, id);
    }
    social.myId = id;
    const raw = localStorage.getItem(ROOM_KEY);
    if (raw) {
      const c = JSON.parse(raw);
      if (c && typeof c.name === 'string' && c.name.trim()) {
        social.name = c.name.trim().slice(0, 16);
        customName = true;
      }
      if (c && roomValid(normRoom(c.room))) social.room = normRoom(c.room);
    }
  } catch (e) { /* 무시 */ }
  if (!social.name) social.name = DEFAULT_NAME;
  try {
    const linked = normRoom(new URLSearchParams(location.search).get('room') || '');
    if (roomValid(linked)) {
      social.room = linked;
      if (!customName) social.name = '';   // 초대 링크로 처음 온 사람: 이름을 직접 정하게
      social.invited = true;
    }
  } catch (e) { /* 무시 */ }
  if (social.room) social.mode = 'connecting';
  el.nickInput.value = social.name;
  el.roomInput.value = social.room || '';
}

function saveSocial() {
  try {
    localStorage.setItem(ROOM_KEY, JSON.stringify({ room: social.room, name: social.name }));
  } catch (e) { /* 무시 */ }
}

function setSocialMode(m) {
  if (social.mode === m) { renderSocial(); return; }
  social.mode = m;
  renderSocial();
  if (m === 'live' && social.room && !social.announced) {
    social.announced = true;
    toast(`함께 쓰는 방 ${social.room}에 들어왔어요 🌸`, 3000);
  }
}

function renderSocial() {
  if (!el.shareBtn) return;
  const m = social.room ? social.mode : 'local';
  el.shareBtn.dataset.mode = m;
  el.brandBadge.hidden = !(social.room && (m === 'live' || m === 'polling' || m === 'connecting'));
  el.copyInvite.hidden = !social.room;
  const labels = {
    local: '함께 쓰기 켜기',
    connecting: '연결 중…',
    live: '함께 쓰는 중',
    polling: '함께 쓰는 중',
    offline: '오프라인 · 함께 쓰기',
    error: '연결 확인 필요',
  };
  const narrow = window.innerWidth <= 600;
  el.shareLabel.textContent = (m === 'local' && narrow) ? '함께 쓰기' : (labels[m] || '함께 쓰기 켜기');
  el.shareCode.textContent = social.room ? `· ${social.room}` : '';
  el.shareCode.hidden = !(social.room && (m === 'live' || m === 'polling' || m === 'connecting'));

  el.shareStatus.dataset.mode = m;
  const nMembers = Object.keys((social.mirror && social.mirror.members) || {}).length;
  if (!social.room) el.shareStatus.textContent = '가족공유 꺼짐 · 이 기기에만 저장돼요';
  else if (m === 'connecting') el.shareStatus.textContent = `연결 중… (방 ${social.room})`;
  else if (m === 'live' || m === 'polling') el.shareStatus.textContent = `● 함께 쓰는 중 · 방 ${social.room} · 함께 쓰는 사람 ${Math.max(nMembers, 1)}명`;
  else if (m === 'offline') el.shareStatus.textContent = `오프라인 · 기록은 이 기기에 먼저 저장돼요 (방 ${social.room})`;
  else el.shareStatus.textContent = `연결하지 못했어요 · 방 코드를 확인해 주세요 (방 ${social.room})`;

  el.shareStart.textContent = social.room ? '연결하기' : '함께 쓰기 켜기';
  el.shareLeave.hidden = !social.room;
  el.shareCopy.hidden = !social.room;
}

function openShareSheet() {
  el.nickInput.value = social.name || '';
  el.roomInput.value = social.room || '';
  renderSocial();
  el.shareOverlay.hidden = false;
  setTimeout(() => { try { el.roomInput.focus(); } catch (e) { /* 무시 */ } }, 120);
}
function closeShareSheet() { el.shareOverlay.hidden = true; }

function randomRoom() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 5; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

function inviteLink() {
  return `${location.origin}${location.pathname}?room=${encodeURIComponent(social.room)}`;
}

function copyInvite() {
  if (!social.room) { openShareSheet(); return; }
  const text = `🌸 솔까 김안숙 권사 전용 성경 타이핑\n함께 쓰는 방 「${social.room}」\n아래 링크를 열면 바로 들어와요.\n${inviteLink()}`;
  const fallback = () => {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); toast('초대 링크를 복사했어요 🔗'); }
    catch (e) { toast('링크: ' + inviteLink(), 6000); }
    ta.remove();
  };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => toast('초대 링크를 복사했어요 🔗')).catch(fallback);
  } else fallback();
}

function joinRoom() {
  const name = (el.nickInput.value || '').trim().slice(0, 16);
  const room = normRoom(el.roomInput.value) || randomRoom();
  if (!roomValid(room)) {
    toast('방 코드는 2~12글자로 정해 주세요');
    el.roomInput.focus();
    return;
  }
  const changed = social.room !== room;
  social.name = name;
  social.room = room;
  saveSocial();
  el.nickInput.value = name;
  el.roomInput.value = room;
  if (changed) social.announced = false;
  connectRoom();
  toast(`함께 쓰는 방 ${room}에 연결하고 있어요`);
}

function leaveRoom() {
  if (!social.room) return;
  const room = social.room;
  const id = social.myId;
  closeStream();
  stopPolling();
  fetch(`${roomUrl('/members')}/${encodeURIComponent(id)}.json`, { method: 'DELETE', cache: 'no-store' })
    .catch(() => { /* 무시 */ });
  social.room = '';
  social.mirror = null;
  social.mode = 'local';
  social.announced = false;
  social.joined = false;
  social.clapSeen = null;
  social.wasFirst = null;
  social.newsBase = null;
  social.newsSeen = {};
  saveSocial();
  renderSocial();
  renderRank();
  renderHall();
  renderMonthly();
  renderNews(true);
  updateNewsBadge();
  toast(`함께 쓰기를 껐어요 · 방 ${room} · 기록은 이 기기에 그대로 있어요`);
}

function connectRoom() {
  closeStream();
  stopPolling();
  social.mirror = { members: {}, claps: {}, posts: {}, monthlyGoal: {} };
  social.joined = false;
  social.clapSeen = null;
  social.wasFirst = null;
  social.restarts = 0;
  social.fails = 0;
  social.newsBase = null;
  social.newsSeen = {};
  social.mode = social.room ? 'connecting' : 'local';
  renderSocial();
  renderRank();
  renderHall();
  renderMonthly();
  if (!social.room) { renderNews(true); updateNewsBadge(); return; }
  if (navigator.onLine === false) { setSocialMode('offline'); return; }
  openStream();
  socialPush(0);
  flushLocalPosts();
}

function normalizeRoom(data) {
  const room = (data && typeof data === 'object') ? data : {};
  if (!room.members || typeof room.members !== 'object') room.members = {};
  if (!room.claps || typeof room.claps !== 'object') room.claps = {};
  if (!room.monthlyGoal || typeof room.monthlyGoal !== 'object') room.monthlyGoal = {};
  if (!room.posts || typeof room.posts !== 'object') room.posts = {};
  return room;
}

function openStream() {
  closeStream();
  if (!social.room) { setSocialMode('local'); return; }
  if (typeof EventSource !== 'function') { startPolling(); return; }
  let es;
  try { es = new EventSource(roomUrl('.json')); }
  catch (e) { startPolling(); return; }
  social.es = es;
  social.lastEvent = Date.now();

  es.addEventListener('open', () => {
    if (social.es !== es) return;
    social.lastEvent = Date.now();
    social.restarts = 0;
    social.fails = 0;
    setSocialMode('live');
    startWatchdog();
  });
  const onEv = (ev) => {
    if (social.es !== es) return;
    social.lastEvent = Date.now();
    onStream(ev.type || 'put', ev.data);
  };
  es.addEventListener('put', onEv);
  es.addEventListener('patch', onEv);
  es.addEventListener('keep-alive', () => {
    if (social.es === es) social.lastEvent = Date.now();
  });
  es.onerror = () => {
    if (social.es !== es) return;
    social.lastEvent = 0;
    if (es.readyState === 2) {          // CLOSED
      try { es.close(); } catch (e) { /* 무시 */ }
      social.es = null;
      social.restarts += 1;
      if (social.restarts >= 2) { startPolling(); return; }
      setSocialMode('connecting');
      setTimeout(() => { if (social.room && navigator.onLine !== false) openStream(); }, 1500);
    } else {
      setSocialMode('connecting');
    }
  };
}

function closeStream() {
  if (social.es) {
    try { social.es.close(); } catch (e) { /* 무시 */ }
    social.es = null;
  }
  if (social.watchTimer) { clearInterval(social.watchTimer); social.watchTimer = null; }
}

function startWatchdog() {
  if (social.watchTimer) clearInterval(social.watchTimer);
  social.watchTimer = setInterval(() => {
    if (social.mode !== 'live') return;
    if (navigator.onLine === false) { setSocialMode('offline'); return; }
    if (!social.lastEvent) return;
    if (Date.now() - social.lastEvent > 26000) {
      social.lastEvent = Date.now();
      openStream();
    }
  }, 15000);
}

function startPolling() {
  closeStream();
  if (!social.room) { setSocialMode('local'); return; }
  if (social.pollTimer) return;
  setSocialMode('polling');
  const tick = () => {
    fetch(roomUrl('.json'), { cache: 'no-store' })
      .then((res) => { if (!res.ok) throw new Error('HTTP ' + res.status); return res.json(); })
      .then((data) => {
        social.fails = 0;
        social.mirror = normalizeRoom(data);
        if (social.mode !== 'polling') setSocialMode('polling');
        afterRoomUpdate();
      })
      .catch(() => {
        social.fails += 1;
        if (navigator.onLine === false) setSocialMode('offline');
        else if (social.fails >= 3) setSocialMode('error');
      });
  };
  tick();
  social.pollTimer = setInterval(tick, 5000);
}

function stopPolling() {
  if (social.pollTimer) { clearInterval(social.pollTimer); social.pollTimer = null; }
}

function setPath(root, path, data, patch) {
  const parts = path.split('/');
  let node = root;
  for (let i = 0; i < parts.length - 1; i++) {
    const k = parts[i];
    if (typeof node[k] !== 'object' || node[k] === null) node[k] = {};
    node = node[k];
  }
  const last = parts[parts.length - 1];
  if (data === null || data === undefined) { delete node[last]; return; }
  if (patch && node[last] && typeof node[last] === 'object' && typeof data === 'object' && !Array.isArray(data)) {
    Object.keys(data).forEach((k) => {
      if (data[k] === null) delete node[last][k];
      else node[last][k] = data[k];
    });
  } else {
    node[last] = data;
  }
}

function onStream(kind, raw) {
  let msg;
  try { msg = JSON.parse(raw); } catch (e) { return; }
  if (!msg || typeof msg.path !== 'string') return;
  const path = msg.path.replace(/^\/+|\/+$/g, '');
  if (!path) {
    social.mirror = normalizeRoom(kind === 'patch' ? Object.assign({}, social.mirror || {}, msg.data || {}) : msg.data);
  } else {
    if (!social.mirror) social.mirror = { members: {}, claps: {} };
    setPath(social.mirror, path, msg.data, kind === 'patch');
  }
  if (social.mode !== 'live') setSocialMode('live');
  afterRoomUpdate();
}

function afterRoomUpdate() {
  detectClap();
  renderRank();
  renderHall();
  renderSocial();
  renderMonthly();
  renderNews();
  detectNews();
  updateNewsBadge();
}

function socialPush(delay = 350) {
  if (!social.room) return;
  clearTimeout(social.pushTimer);
  social.pushTimer = setTimeout(() => {
    if (!social.room) return;
    const remote = social.mirror && social.mirror.members && social.mirror.members[social.myId];
    const snap = mergeSnap(mySnapshot(), remote);
    if (!social.mirror) social.mirror = { members: {}, claps: {} };
    if (!social.mirror.members) social.mirror.members = {};
    social.mirror.members[social.myId] = snap;
    renderRank();
    if (!el.hallOverlay.hidden) renderHall();
    fbRequest('PUT', memberUrl(social.myId), snap).catch(() => {
      if (navigator.onLine === false) setSocialMode('offline');
    });
  }, delay);
}

/* ───────── 명예의 전당 · 내 상장함 ───────── */
function certsOf() {
  return Array.isArray(state.certs) ? state.certs.slice().sort((a, b) => (b.ts || 0) - (a.ts || 0)) : [];
}
function updateCertCount() {
  if (el.certCount) el.certCount.textContent = String(certsOf().length);
}

function renderHall() {
  updateCertCount();
  if (!el.hallPaneHall) return;
  const rows = rankRows().slice();
  rows.sort((a, b) =>
    b.totalChapters - a.totalChapters ||
    b.bookCount - a.bookCount ||
    b.claps - a.claps ||
    a.name.localeCompare(b.name, 'ko'));
  rows.forEach((r, i) => { r.hallRank = i + 1; });

  el.hallPaneHall.innerHTML = '';
  rows.forEach((r) => {
    const row = mk('div', 'hall-row' + (r.isMe ? ' is-me' : '') + (r.hallRank === 1 && (r.totalChapters || r.bookCount) ? ' is-top' : ''));
    row.dataset.member = r.id;
    row.appendChild(mk('div', 'hall-rank', String(r.hallRank)));

    const main = mk('div', 'hall-main');
    const nameLine = mk('div', 'hall-name');
    nameLine.appendChild(mk('b', '', r.name));
    nameLine.appendChild(mk('em', 'title-badge ' + titleTier(r.totalVerses).cls, r.title));
    if (r.isMe) nameLine.appendChild(mk('span', 'hall-flag me', '나'));
    if (r.oneRead) nameLine.appendChild(mk('span', 'hall-flag read', '📖 1독 달성'));
    main.appendChild(nameLine);

    const sub = mk('div', 'hall-sub');
    sub.innerHTML = `마친 장 <b>${r.totalChapters.toLocaleString('ko-KR')}</b>장 · 완필 <b>${r.bookCount}</b>권 · 누적 <b>${r.totalVerses.toLocaleString('ko-KR')}</b>절`;
    main.appendChild(sub);

    const codes = Object.keys(r.books || {});
    if (codes.length) {
      const books = mk('div', 'hall-books');
      codes.slice(0, 6).forEach((code) => {
        const meta = bookByCode[code];
        if (!meta) return;
        books.appendChild(mk('span', 'hall-book', `${meta.name} 완필`));
      });
      if (codes.length > 6) books.appendChild(mk('span', 'hall-book', `외 ${codes.length - 6}권`));
      main.appendChild(books);
    }
    row.appendChild(main);

    const side = mk('div', 'hall-side');
    side.innerHTML = `<span class="hall-claps">👏 ${r.claps}</span>`
      + (r.streak > 0 ? `<span class="hall-streak">🔥 ${r.streak}일 연속</span>` : '')
      + `<span class="hall-sub">오늘 ${r.todayVerses.toLocaleString('ko-KR')}절</span>`;
    row.appendChild(side);
    el.hallPaneHall.appendChild(row);
  });

  if (!el.hallNote) return;
  if (!social.room) {
    el.hallNote.innerHTML = '함께 쓰기를 켜면 가족·친구의 완필 기록도 이곳에 모여요.';
  } else {
    const n = Object.keys((social.mirror && social.mirror.members) || {}).length;
    el.hallNote.innerHTML = `함께 쓰는 방 <b>${social.room}</b> · ${Math.max(n, 1)}명 · 박수는 순위표의 👏 버튼으로 보내요.`;
  }
  renderCerts();
}

function renderCerts() {
  if (!el.certGrid) return;
  const list = certsOf();
  el.certGrid.innerHTML = '';
  el.certEmpty.hidden = list.length > 0;
  list.forEach((c) => {
    const btn = mk('button', 'cert-card');
    btn.type = 'button';
    btn.dataset.cert = c.id;
    const isMonth = c.kind === 'month';
    btn.appendChild(mk('span', 'cc-flower', c.kind === 'all' ? '🏆' : (isMonth ? '📅' : '📜')));
    btn.appendChild(mk('span', 'cc-name', c.kind === 'all' ? '성경 1독 완필' : (isMonth ? `이달의 성경 · ${c.name}` : `${c.name} 완필`)));
    btn.appendChild(mk('span', 'cc-meta', c.kind === 'all'
      ? `전 1,189장 · ${dateKo(c.date)}`
      : (isMonth ? `${ymKo(c.ym)} · 전 ${c.chapters}${unitOf(c.code || '')}` : `전 ${c.chapters}${unitOf(c.code || '')} · ${dateKo(c.date)}`)));
    btn.appendChild(mk('span', 'cc-open', '상장 열기 →'));
    btn.addEventListener('click', () => openCert(c));
    el.certGrid.appendChild(btn);
  });
}

function openHall(pane) {
  setHallPane(pane || 'hall');
  renderHall();
  el.hallOverlay.hidden = false;
}
function setHallPane(pane) {
  const cert = pane === 'cert';
  el.hallTabHall.classList.toggle('is-on', !cert);
  el.hallTabCert.classList.toggle('is-on', cert);
  el.hallPaneHall.hidden = cert;
  el.hallPaneCert.hidden = !cert;
  if (cert) renderCerts();
}

/* ───────── 완필 상장 ───────── */
function syncCerts() {
  if (!Array.isArray(state.certs)) state.certs = [];
  const have = new Set(state.certs.map((c) => c.id));
  const added = [];
  Object.keys(state.books).forEach((code) => {
    const meta = bookByCode[code];
    if (!meta || !meta.chapters) return;
    const rec = state.books[code];
    for (let ch = 1; ch <= meta.chapters; ch++) {
      const r = rec[ch];
      if (!r || !r.done) return;
    }
    const id = 'book-' + code;
    if (have.has(id)) return;
    const cert = {
      id, kind: 'book', code, name: meta.name, short: meta.short,
      chapters: meta.chapters, date: TODAY, ts: Date.now(),
    };
    state.certs.push(cert);
    have.add(id);
    added.push(cert);
  });
  // 이달의 성경: 이번 달에 그 권의 모든 장을 마쳤으면 월간 완필 상장
  const goal = goalCode();
  if (goal) {
    const meta = bookByCode[goal];
    const ym = monthKeyNow();
    if (meta && monthlyProgress(goal, ym) >= meta.chapters) {
      const id = `month-${ym}-${goal}`;
      if (!have.has(id)) {
        const cert = {
          id, kind: 'month', code: goal, name: meta.name, short: meta.short,
          chapters: meta.chapters, ym, date: TODAY, ts: Date.now(),
        };
        state.certs.push(cert);
        have.add(id);
        added.push(cert);
      }
    }
  }

  const total = computeTotals().chapters;
  if (total >= 1189 && !have.has('all-read')) {
    const cert = { id: 'all-read', kind: 'all', name: '성경', chapters: 1189, date: TODAY, ts: Date.now() };
    state.certs.push(cert);
    have.add('all-read');
    added.push(cert);
  }
  if (added.length) { saveNow(); updateCertCount(); renderCerts(); }
  return added;
}

function fillCert(cert) {
  const isAll = cert.kind === 'all';
  const isMonth = cert.kind === 'month';
  el.certKicker.textContent = isMonth ? '성경 타자 · 이달의 성경' : '성경 타자 · 완필 상장';
  el.certTitle.textContent = isAll ? '성 경 1 독 상 장' : (isMonth ? '이 달 의 성 경 상 장' : '완 필 상 장');
  el.certName.textContent = nameOf();
  el.certBody.innerHTML = isAll
    ? '성경 전 <b>1,189장</b>을 모두 완필하시어<br>1독을 이루셨습니다.'
    : isMonth
      ? `${ymKo(cert.ym)} 이달의 성경 [<b>${cert.name}</b>] 전 <b>${cert.chapters}${unitOf(cert.code || '')}</b>을<br>정성으로 완필하셨습니다.`
      : `${cert.name} 전 <b>${cert.chapters}${unitOf(cert.code || '')}</b>을 정성으로 완필하셨습니다.`;
  el.certDate.textContent = dateKo(cert.date);
}

function openCert(cert) {
  if (!cert) return;
  certCur = cert;
  fillCert(cert);
  el.certOverlay.hidden = false;
  const r = el.certCard.getBoundingClientRect();
  setTimeout(() => burst(r.left + r.width / 2, r.top + 40, 12, 160), 200);
}
function closeCert() { el.certOverlay.hidden = true; }

function certCanvas(cert) {
  const W = 1400, H = 990;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const g = cv.getContext('2d');
  const SERIF = '"Noto Serif KR","Noto Serif CJK KR","Nanum Myeongjo","Batang","Apple SD Gothic Neo",serif';
  const UI = '"Noto Sans KR","Noto Sans CJK KR","Apple SD Gothic Neo","Malgun Gothic",sans-serif';
  const isAll = cert.kind === 'all';
  const isMonth = cert.kind === 'month';
  const name = nameOf();

  g.fillStyle = '#FFFDF6';
  g.fillRect(0, 0, W, H);
  g.strokeStyle = '#D9B24C'; g.lineWidth = 16; g.strokeRect(30, 30, W - 60, H - 60);
  g.strokeStyle = '#B8912A'; g.lineWidth = 2; g.strokeRect(56, 56, W - 112, H - 112);
  g.strokeStyle = 'rgba(184,145,42,.4)'; g.lineWidth = 1; g.strokeRect(74, 74, W - 148, H - 148);
  g.fillStyle = 'rgba(217,178,76,.55)';
  g.font = `28px serif`;
  g.textAlign = 'left'; g.fillText('❧', 82, 112);
  g.textAlign = 'right'; g.fillText('❧', W - 82, 112);
  g.textAlign = 'left'; g.fillText('❧', 82, H - 82);
  g.textAlign = 'right'; g.fillText('❧', W - 82, H - 82);

  g.textAlign = 'center';
  g.fillStyle = '#A98A34';
  g.font = `800 21px ${UI}`;
  drawSpaced(g, isMonth ? '성 경 타 자  ·  이 달 의 성 경' : '성 경 타 자  ·  완 필  상 장', W / 2, 172, 6);

  g.font = '52px serif';
  g.fillText('🌸', W / 2, 246);

  g.fillStyle = '#6B4B1C';
  g.font = `800 100px ${SERIF}`;
  drawSpaced(g, isAll ? '성 경 1 독 상 장' : (isMonth ? '이 달 의 성 경 상 장' : '완 필 상 장'),
             W / 2, 372, isAll ? 8 : (isMonth ? 10 : 18));

  g.strokeStyle = '#C9A227'; g.lineWidth = 1.5;
  g.beginPath(); g.moveTo(W * 0.26, 420); g.lineTo(W * 0.44, 420); g.stroke();
  g.beginPath(); g.moveTo(W * 0.56, 420); g.lineTo(W * 0.74, 420); g.stroke();
  g.fillStyle = '#C9A227'; g.font = `16px serif`; g.fillText('✿', W / 2, 426);

  g.fillStyle = '#3B2A16';
  g.font = `800 66px ${SERIF}`;
  g.fillText(name, W / 2, 540);

  g.fillStyle = '#5A4630';
  g.font = `600 34px ${SERIF}`;
  if (isAll) {
    drawRich(g, '성경 전 ', '1,189장', '을 모두 완필하시어', W / 2, 626, 34, SERIF);
    g.font = `600 34px ${SERIF}`;
    g.fillStyle = '#5A4630';
    g.fillText('1독을 이루셨습니다.', W / 2, 684);
  } else if (isMonth) {
    drawRich(g, `${ymKo(cert.ym)} 이달의 성경 [`, cert.name, ']', W / 2, 626, 34, SERIF);
    g.fillStyle = '#5A4630';
    g.font = `600 34px ${SERIF}`;
    drawRich(g, '전 ', `${cert.chapters}${unitOf(cert.code || '')}`, '을 정성으로 완필하셨습니다.', W / 2, 684, 34, SERIF);
  } else {
    drawRich(g, `${cert.name} 전 `, `${cert.chapters}${unitOf(cert.code || '')}`, '을 정성으로', W / 2, 626, 34, SERIF);
    g.fillStyle = '#5A4630';
    g.font = `600 34px ${SERIF}`;
    g.fillText('완필하셨습니다.', W / 2, 684);
  }

  g.fillStyle = '#7B6A57';
  g.font = `700 27px ${UI}`;
  drawSpaced(g, dateKo(cert.date), W / 2, 806, 3);

  // 금빛 직인
  const cx = W - 200, cy = H - 190, rad = 88;
  const grad = g.createRadialGradient(cx - 30, cy - 34, 10, cx, cy, rad);
  grad.addColorStop(0, '#F6E2A2');
  grad.addColorStop(0.55, '#D9B24C');
  grad.addColorStop(1, '#B8912A');
  g.save();
  g.translate(cx, cy);
  g.rotate(-11 * Math.PI / 180);
  g.beginPath(); g.arc(0, 0, rad, 0, Math.PI * 2);
  g.fillStyle = grad; g.fill();
  g.lineWidth = 3; g.strokeStyle = 'rgba(255,255,255,.55)'; g.stroke();
  g.beginPath(); g.arc(0, 0, rad - 12, 0, Math.PI * 2);
  g.lineWidth = 1.5; g.strokeStyle = 'rgba(255,247,223,.55)'; g.stroke();
  g.fillStyle = '#FFFDF3';
  g.textAlign = 'center';
  g.font = `800 40px ${SERIF}`;
  g.fillText('완필', 0, 6);
  g.font = `800 12px ${UI}`;
  drawSpaced(g, '성경타자', 0, 36, 3);
  g.restore();

  return cv;
}

function drawSpaced(g, text, x, y, spacing) {
  const chars = Array.from(text);
  const widths = chars.map((c) => g.measureText(c).width);
  const total = widths.reduce((n, w) => n + w, 0) + spacing * (chars.length - 1);
  let cx = x - total / 2;
  const align = g.textAlign;
  g.textAlign = 'left';
  chars.forEach((c, i) => {
    g.fillText(c, cx, y);
    cx += widths[i] + spacing;
  });
  g.textAlign = align;
}

function drawRich(g, pre, bold, post, x, y, size, font) {
  g.save();
  const w1 = g.measureText(pre).width;
  g.font = `800 ${size}px ${font}`;
  const w2 = g.measureText(bold).width;
  g.font = `600 ${size}px ${font}`;
  const w3 = g.measureText(post).width;
  const total = w1 + w2 + w3;
  let cx = x - total / 2;
  g.textAlign = 'left';
  g.fillStyle = '#5A4630';
  g.font = `600 ${size}px ${font}`;
  g.fillText(pre, cx, y);
  cx += w1;
  g.fillStyle = '#8A6420';
  g.font = `800 ${size}px ${font}`;
  g.fillText(bold, cx, y);
  cx += w2;
  g.fillStyle = '#5A4630';
  g.font = `600 ${size}px ${font}`;
  g.fillText(post, cx, y);
  g.restore();
}

function downloadCert() {
  const cert = certCur;
  if (!cert) return;
  let cv;
  try { cv = certCanvas(cert); }
  catch (e) { console.warn(e); toast('상장 이미지를 만들지 못했어요'); return; }
  const fname = cert.kind === 'all'
    ? '완필상장-성경1독.png'
    : (cert.kind === 'month' ? `이달의상장-${cert.ym}-${cert.name}.png` : `완필상장-${cert.name}.png`);
  const save = (blob) => {
    if (!blob) { toast('상장 이미지를 만들지 못했어요'); return; }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fname;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    toast('상장을 PNG 이미지로 저장했어요 📜');
  };
  if (cv.toBlob) cv.toBlob(save, 'image/png');
  else save(null);
}

function printCert() {
  if (!certCur) return;
  document.body.classList.add('print-cert');
  const done = () => {
    document.body.classList.remove('print-cert');
    window.removeEventListener('afterprint', done);
  };
  window.addEventListener('afterprint', done);
  try { window.print(); } catch (e) { /* 무시 */ }
  setTimeout(done, 1500);
}

/* ══════════════════════════════════════════════
   자동 출석 · 연속 출석 꽃밭 · 칭호
   ══════════════════════════════════════════════ */
const monthKeyNow = (d = new Date()) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
const ymKo = (ym) => {
  const m = /^(\d{4})-(\d{2})$/.exec(String(ym || ''));
  return m ? `${m[1]}년 ${Number(m[2])}월` : String(ym || '');
};

/** 오늘 1절 이상 마쳤는가 (자동 출석) */
function attendedToday() {
  const d = state.days && state.days[TODAY];
  return !!(d && Number(d.v) > 0);
}

/** 오늘(또는 오늘 출석 전이면 어제)부터 거슬러 올라가는 연속 출석 일수 */
function currentStreak(fromKey) {
  const d = new Date();
  if (fromKey) {
    const [y, m, dd] = String(fromKey).split('-').map(Number);
    d.setFullYear(y, m - 1, dd);
  }
  const seen = (k) => !!(state.days && state.days[k] && Number(state.days[k].v) > 0);
  if (!seen(ymd(d))) d.setDate(d.getDate() - 1);   // 오늘 아직 안 쳤으면 어제부터
  let n = 0;
  let guard = 0;
  while (seen(ymd(d)) && guard < 4000) {
    n += 1;
    d.setDate(d.getDate() - 1);
    guard += 1;
  }
  return n;
}

/* 칭호 — 누적 완료 절 수 */
const TITLE_TIERS = [
  { min: 1000, label: '👑 은혜의 장인', cls: 't-crown' },
  { min: 200, label: '✍️ 성경 서기관', cls: 't-scribe' },
  { min: 30, label: '🌸 말씀 꽃길', cls: 't-flower' },
  { min: 0, label: '🌱 새싹 타자수', cls: 't-sprout' },
];
function titleTier(verses) {
  const v = Number(verses) || 0;
  return TITLE_TIERS.find((t) => v >= t.min) || TITLE_TIERS[TITLE_TIERS.length - 1];
}
const titleFor = (verses) => titleTier(verses).label;

const STREAK_MILESTONES = [3, 7, 14, 30, 60, 100, 180, 365];

function renderAttendance() {
  if (!el.attToday) return;
  const att = attendedToday();
  const streak = currentStreak();
  el.attToday.textContent = att ? '✅ 오늘 출석' : '🌱 아직 오늘 출석 전';
  el.attToday.classList.toggle('is-on', att);
  el.attStreak.textContent = `🔥 ${streak}일 연속`;
  el.attStreak.classList.toggle('is-hot', streak >= 3);

  // 최근 14일 꽃밭
  el.attGarden.innerHTML = '';
  const frag = document.createDocumentFragment();
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = ymd(d);
    const has = !!(state.days[key] && Number(state.days[key].v) > 0);
    const c = document.createElement('span');
    c.className = 'att-cell' + (has ? ' has' : '') + (i === 0 ? ' today' : '');
    c.textContent = has ? '🌸' : '·';
    c.title = `${key} · ${has ? `출석 (${state.days[key].v}절)` : '쉼'}`;
    frag.appendChild(c);
  }
  el.attGarden.appendChild(frag);

  const mKey = monthKeyNow();
  const monthDays = Object.keys(state.days || {})
    .filter((k) => k.startsWith(mKey) && Number(state.days[k].v) > 0).length;
  el.attMonth.textContent = `이번 달 ${monthDays}일`;

  const verses = computeTotals().verses;
  const tier = titleTier(verses);
  el.myTitle.textContent = tier.label;
  el.myTitle.className = tier.cls;
  const next = TITLE_TIERS.filter((t) => t.min > verses).sort((a, b) => a.min - b.min)[0];
  if (el.attNext) el.attNext.textContent = next ? `다음 칭호까지 ${(next.min - verses).toLocaleString('ko-KR')}절` : '최고 칭호예요 🎉';
}

/* ══════════════════════════════════════════════
   이달의 성경 (YYYY-MM 목표) · 월간 완필 상장
   ══════════════════════════════════════════════ */
const MONTH_RECOMMEND = ['mat', 'psa', 'jhn', 'pro', 'rom', 'mrk', 'luk', 'act', 'gen', '1jn', 'php', 'jas'];

function recommendedGoal(ym = monthKeyNow()) {
  const m = Number(String(ym).slice(5, 7)) - 1;
  const code = MONTH_RECOMMEND[((m % 12) + 12) % 12];
  return bookByCode[code] ? code : 'mat';
}

/** 이번 달(ym)에 마친 그 권의 장 수 */
function monthlyProgress(code, ym = monthKeyNow()) {
  const rec = state.books[code];
  if (!rec) return 0;
  let n = 0;
  Object.keys(rec).forEach((ch) => {
    const r = rec[ch];
    if (r && r.done && r.ts && ymd(new Date(r.ts)).slice(0, 7) === ym) n += 1;
  });
  return n;
}

/** 지금 함께 보고 있는 이달의 성경 (모임이면 방 값, 아니면 이 기기 값) */
function goalCode(ym = monthKeyNow()) {
  if (social.room) {
    const g = social.mirror && social.mirror.monthlyGoal && social.mirror.monthlyGoal[ym];
    const code = g && (typeof g === 'string' ? g : g.code);
    return (code && bookByCode[code]) ? code : '';
  }
  const local = state.monthly && state.monthly[ym];
  return (local && bookByCode[local]) ? local : '';
}

function renderMonthly() {
  if (!el.goalMain || !INDEX) return;
  const ym = monthKeyNow();
  el.goalMonth.textContent = ymKo(ym);

  if (el.goalSelect && !el.goalSelect.dataset.ready) {
    el.goalSelect.innerHTML = '';
    INDEX.books.forEach((b) => {
      const o = document.createElement('option');
      o.value = b.code;
      o.textContent = b.name;
      el.goalSelect.appendChild(o);
    });
    el.goalSelect.dataset.ready = '1';
  }

  const code = goalCode(ym);
  if (code) {
    const meta = bookByCode[code];
    const unit = unitOf(code);
    const done = monthlyProgress(code, ym);
    const total = meta.chapters;
    const pct = Math.max(0, Math.min(100, Math.round((done / total) * 100)));
    el.goalMain.innerHTML = `
      <div class="goal-row">
        <span class="goal-name">${meta.name} <i>${total}${unit}</i></span>
        <span class="goal-num"><b>${done}</b> / ${total}${unit}</span>
      </div>
      <div class="goal-bar" role="img" aria-label="${meta.name} ${done} / ${total}${unit} 진행"><span style="width:${pct}%"></span></div>
      ${done >= total ? '<p class="goal-done">🎉 이달의 성경 완필! 상장함에서 확인하세요</p>' : ''}`;
    el.goalSave.textContent = '바꾸기';
    if (document.activeElement !== el.goalSelect) el.goalSelect.value = code;
    el.goalNote.textContent = social.room
      ? `함께 쓰는 방 ${social.room} 모두가 같은 이달의 성경을 봐요 · 누구나 바꿀 수 있어요`
      : '이번 달에 이 성경을 다 치면 이달의 성경 완필 상장이 찾아와요 📜';
  } else {
    const rec = recommendedGoal(ym);
    const name = bookByCode[rec] ? bookByCode[rec].name : '마태복음';
    el.goalMain.innerHTML = `<p class="goal-none">아직 정하지 않았어요<br><span>이달 추천: ${name}</span></p>`;
    el.goalSave.textContent = '정하기';
    if (document.activeElement !== el.goalSelect) el.goalSelect.value = rec;
    el.goalNote.textContent = '이달의 성경을 정하면 진행률이 보이고, 다 치면 상장이 찾아와요 📜';
  }
}

function setGoal(code) {
  if (!bookByCode[code]) { toast('성경을 골라 주세요'); return; }
  const ym = monthKeyNow();
  state.monthly = state.monthly || {};
  state.monthly[ym] = code;
  saveNow();
  const payload = { code, by: nameOf(), ts: Date.now() };
  if (social.room) {
    if (!social.mirror) social.mirror = { members: {}, claps: {}, posts: {}, monthlyGoal: {} };
    social.mirror.monthlyGoal = social.mirror.monthlyGoal || {};
    social.mirror.monthlyGoal[ym] = payload;
    fbRequest('PUT', goalNodeUrl(ym), payload)
      .catch(() => toast('이달의 성경을 모임에 저장하지 못했어요 · 연결을 확인해 주세요'));
  }
  renderMonthly();
  const added = syncCerts();
  renderCerts();
  const monthCert = added.find((c) => c.kind === 'month');
  if (monthCert) { celebrateMonth(monthCert); }
  toast(`📅 이달의 성경은 ${bookByCode[code].name}이에요`);
}

function celebrateMonth(cert) {
  toast(`🏆 ${ymKo(cert.ym)} 이달의 성경 [${cert.name}] 완필! 상장이 도착했어요`, 5200);
  burst(window.innerWidth / 2, 150, 16, 180);
}

/* ══════════════════════════════════════════════
   축하 소식 게시판 (자동 축하 글 · 답글 · 새 소식 알림)
   ══════════════════════════════════════════════ */
const BOARD_READ_KEY = 'bible-typing-board-read';

function newsPosts() {
  const map = new Map();
  if (social.room && social.mirror && social.mirror.posts && typeof social.mirror.posts === 'object') {
    Object.keys(social.mirror.posts).forEach((k) => {
      const p = social.mirror.posts[k];
      if (p && typeof p === 'object') map.set(p.id || k, p);
    });
  }
  (Array.isArray(state.posts) ? state.posts : []).forEach((p) => {
    if (!p || !p.id) return;
    if (!map.has(p.id)) map.set(p.id, p);
  });
  const order = { month: 0, streak: 1, book: 2, note: 3 };
  return Array.from(map.values())
    .filter((p) => p && p.text)
    .sort((a, b) => (Number(b.ts) || 0) - (Number(a.ts) || 0)
      || (order[a.kind] != null ? order[a.kind] : 9) - (order[b.kind] != null ? order[b.kind] : 9));
}

function postTextOf() {
  return newsPosts();
}

function newPostId(prefix) {
  return `${prefix}-${social.myId || 'me'}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
}

/** 축하 글 한 줄 올리기 (내 소식함 + 모임 방) */
function addPost(fields) {
  if (!Array.isArray(state.posts)) state.posts = [];
  const id = fields.id || newPostId(fields.kind || 'note');
  if (postTextOf().some((p) => p.id === id)) return null;
  const myVerses = computeTotals().verses;
  const post = Object.assign({
    id,
    kind: 'note',
    name: nameOf(),
    memberId: social.myId || 'me',
    ts: Date.now(),
    replies: {},
    title: titleFor(myVerses),
    titleVerses: myVerses,
  }, fields, { id });
  state.posts.push(post);
  if (state.posts.length > 200) state.posts = state.posts.slice(-200);
  saveNow();
  if (social.room) {
    if (!social.mirror) social.mirror = { members: {}, claps: {}, posts: {}, monthlyGoal: {} };
    social.mirror.posts = social.mirror.posts || {};
    social.mirror.posts[id] = post;
    fbRequest('PUT', postNodeUrl(id), post).catch(() => { /* 나중에 다시 */ });
  }
  renderNews(true);
  renderNewsPreview();
  updateNewsBadge();
  return post;
}

function postBook(code) {
  const meta = bookByCode[code];
  if (!meta) return null;
  return addPost({
    id: `book-${social.myId || 'me'}-${code}`,
    kind: 'book',
    code,
    text: `🎉 ${nameOf()}님이 [${meta.name}]을 완필했어요!`,
  });
}

function postMonth(ym, code) {
  const meta = bookByCode[code];
  if (!meta) return null;
  return addPost({
    id: `month-${social.myId || 'me'}-${ym}-${code}`,
    kind: 'month',
    code,
    ym,
    text: `🏆 ${nameOf()}님이 ${Number(String(ym).slice(5, 7))}월 이달의 성경 [${meta.name}]을 완필했어요!`,
  });
}

function postStreak(n) {
  return addPost({
    id: `streak-${social.myId || 'me'}-${n}`,
    kind: 'streak',
    streak: n,
    text: `🔥 ${nameOf()}님이 ${n}일 연속 출석을 달성했어요!`,
  });
}

function addReply(postId, text) {
  const t = String(text || '').trim().slice(0, 120);
  if (!t || !postId) return false;
  const reply = {
    id: `r-${social.myId || 'me'}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`,
    name: nameOf(),
    memberId: social.myId || 'me',
    text: t,
    ts: Date.now(),
  };
  const local = (state.posts || []).find((p) => p.id === postId);
  if (local) { local.replies = local.replies || {}; local.replies[reply.id] = reply; save(); }
  if (social.mirror && social.mirror.posts && social.mirror.posts[postId]) {
    const p = social.mirror.posts[postId];
    p.replies = p.replies || {};
    p.replies[reply.id] = reply;
  }
  if (social.room) {
    fbRequest('PUT', replyNodeUrl(postId, reply.id), reply)
      .catch(() => toast('답글을 올리지 못했어요 · 연결을 확인해 주세요'));
  }
  renderNews(true);
  renderNewsPreview();
  return true;
}

function boardReadAt() {
  try {
    const m = JSON.parse(localStorage.getItem(BOARD_READ_KEY) || '{}');
    return Number(m[social.room || 'local']) || 0;
  } catch (e) { return 0; }
}
function markBoardRead() {
  try {
    const m = JSON.parse(localStorage.getItem(BOARD_READ_KEY) || '{}');
    m[social.room || 'local'] = Date.now();
    localStorage.setItem(BOARD_READ_KEY, JSON.stringify(m));
  } catch (e) { /* 무시 */ }
}

function unreadNews() {
  const at = boardReadAt();
  const out = [];
  newsPosts().forEach((p) => {
    if (p.memberId !== social.myId && (Number(p.ts) || 0) > at) out.push({ post: p });
    Object.values(p.replies || {}).forEach((r) => {
      if (r && r.memberId !== social.myId && (Number(r.ts) || 0) > at) out.push({ post: p, reply: r });
    });
  });
  return out;
}

function updateNewsBadge() {
  const n = unreadNews().length;
  const txt = n > 9 ? '9+' : String(n);
  [el.newsBadge, el.newsCardBadge].forEach((b) => {
    if (!b) return;
    b.hidden = n === 0;
    b.textContent = txt;
  });
  [el.openNews, el.openNews2].forEach((b) => {
    if (b) b.classList.toggle('is-alert', n > 0);
  });
}

function timeAgo(ts) {
  const t = Number(ts) || 0;
  const diff = Date.now() - t;
  if (diff < 60000) return '방금';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}분 전`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}시간 전`;
  const d = new Date(t);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

const NEWS_ICON = { book: '🎉', month: '🏆', streak: '🔥', note: '💬' };

function renderNewsPreview() {
  if (!el.newsPreview) return;
  const list = newsPosts();
  if (!list.length) {
    el.newsPreview.textContent = '아직 축하 소식이 없어요';
    return;
  }
  const p = list[0];
  const replies = Object.keys(p.replies || {}).length;
  el.newsPreview.textContent = `${p.text}${replies ? ` · 답글 ${replies}` : ''}`;
}

let newsSig = '';
let newsPending = false;

function newsSignature() {
  return newsPosts().map((p) => `${p.id}:${p.ts}:${Object.keys(p.replies || {}).length}`).join('|');
}

function renderNews(force = false) {
  if (!el.newsList) return;
  const active = document.activeElement;
  if (!force && active && el.newsList.contains(active) && active.tagName === 'INPUT') {
    newsPending = true;
    return;
  }
  const sig = newsSignature();
  if (!force && sig === newsSig) return;
  newsSig = sig;
  newsPending = false;

  const list = newsPosts();
  el.newsList.innerHTML = '';
  if (!list.length) {
    const p = document.createElement('p');
    p.className = 'news-empty';
    p.innerHTML = '아직 축하 소식이 없어요.<br>한 권을 완필하거나 연속 출석을 이어 가면 여기에 저절로 올라와요 🌸';
    el.newsList.appendChild(p);
    return;
  }

  const frag = document.createDocumentFragment();
  list.forEach((post) => {
    const art = document.createElement('article');
    art.className = 'news-post';
    art.dataset.post = post.id;

    const head = document.createElement('div');
    head.className = 'np-head';
    const who = document.createElement('b');
    who.className = 'np-who';
    who.textContent = post.name || '가족';
    const when = document.createElement('span');
    when.className = 'np-time';
    when.textContent = timeAgo(post.ts);
    head.append(who, when);
    const tier = post.title || '';
    if (tier) {
      const tb = document.createElement('em');
      tb.className = 'title-badge ' + titleTier(post.titleVerses != null ? post.titleVerses : 0).cls;
      tb.textContent = tier;
      head.appendChild(tb);
    }
    art.appendChild(head);

    const txt = document.createElement('p');
    txt.className = 'np-text';
    txt.textContent = post.text;
    art.appendChild(txt);

    const replies = Object.values(post.replies || {}).sort((a, b) => (a.ts || 0) - (b.ts || 0));
    if (replies.length) {
      const box = document.createElement('div');
      box.className = 'np-replies';
      replies.forEach((r) => {
        const row = document.createElement('div');
        row.className = 'np-reply';
        const b = document.createElement('b');
        b.textContent = r.name || '가족';
        row.appendChild(b);
        row.appendChild(document.createTextNode(r.text || ''));
        const t = document.createElement('span');
        t.className = 'np-rt';
        t.textContent = timeAgo(r.ts);
        row.appendChild(t);
        box.appendChild(row);
      });
      art.appendChild(box);
    }

    const form = document.createElement('div');
    form.className = 'np-form';
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'np-input';
    input.maxLength = 120;
    input.placeholder = '축하드려요! 🌸';
    input.setAttribute('aria-label', `${post.name || '가족'}님 축하 글에 답글`);
    input.dataset.replyTo = post.id;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'np-send';
    btn.dataset.reply = post.id;
    btn.textContent = '답글';
    input.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      if (addReply(post.id, input.value)) { input.value = ''; }
    });
    form.append(input, btn);
    art.appendChild(form);
    frag.appendChild(art);
  });
  el.newsList.appendChild(frag);
}

function openNews() {
  renderNews(true);
  el.newsOverlay.hidden = false;
  markBoardRead();
  updateNewsBadge();
}
function closeNews() { el.newsOverlay.hidden = true; }

/** 새 소식이 들어오면 토스트 · 배지 반짝 */
function detectNews() {
  const list = newsPosts();
  if (social.newsBase == null) {
    social.newsBase = Date.now() - 1200;
    if (!social.newsSeen) social.newsSeen = {};
    list.forEach((p) => {
      social.newsSeen[`p:${p.id}`] = 1;
      Object.keys(p.replies || {}).forEach((r) => { social.newsSeen[`r:${p.id}:${r}`] = 1; });
    });
    return;
  }
  const fresh = [];
  list.forEach((p) => {
    const pk = `p:${p.id}`;
    if (p.memberId !== social.myId && (Number(p.ts) || 0) > social.newsBase && !social.newsSeen[pk]) {
      social.newsSeen[pk] = 1;
      fresh.push({ post: p });
    }
    Object.keys(p.replies || {}).forEach((rid) => {
      const r = p.replies[rid];
      const rk = `r:${p.id}:${rid}`;
      if (r && r.memberId !== social.myId && (Number(r.ts) || 0) > social.newsBase && !social.newsSeen[rk]) {
        social.newsSeen[rk] = 1;
        fresh.push({ post: p, reply: r });
      }
    });
  });
  updateNewsBadge();
  renderNewsPreview();
  if (!fresh.length) return;
  if (!el.newsOverlay.hidden) { markBoardRead(); updateNewsBadge(); return; }
  const last = fresh[fresh.length - 1];
  const who = (last.reply && last.reply.name) || last.post.name || '가족';
  toast(`💬 ${who}님이 새 축하/답글을 남겼어요!`, 4400);
  burst(window.innerWidth / 2, 150, 9, 150);
}

/** 모임에 들어갈 때 이 기기의 축하 소식을 방으로 올린다 */
function flushLocalPosts() {
  if (!social.room) return;
  (state.posts || []).forEach((p) => {
    if (!p || !p.id || p.pushed) return;
    fbRequest('PUT', postNodeUrl(p.id), p)
      .then(() => { p.pushed = true; save(); })
      .catch(() => { /* 다음 연결에서 */ });
  });
}

/* 오늘 완료한 글자 수가 예전 기록에 없으면 한 번 계산해 채운다 */
async function ensureTodayChars() {
  const d = state.days[TODAY];
  if (!d || Number(d.ch) > 0) return;
  const codes = new Set();
  Object.keys(state.books).forEach((code) => {
    Object.keys(state.books[code]).forEach((ch) => {
      const rec = state.books[code][ch];
      Object.keys(rec.v || {}).forEach((vi) => {
        if (ymd(new Date(rec.v[vi])) === TODAY) codes.add(code);
      });
    });
  });
  if (!codes.size) return;
  let sum = 0;
  for (const code of codes) {
    try {
      const book = await getBook(code);
      Object.keys(state.books[code]).forEach((ch) => {
        const rec = state.books[code][ch];
        const verses = book.chapters[Number(ch) - 1] || [];
        Object.keys(rec.v || {}).forEach((vi) => {
          if (ymd(new Date(rec.v[vi])) !== TODAY) return;
          const t = verses[Number(vi)];
          if (t) sum += Array.from(t).filter((c) => !isSkip(c)).length;
        });
      });
    } catch (e) { /* 무시 */ }
  }
  if (sum > 0) { d.ch = sum; saveNow(); }
}

function sendNote() {
  const t = (el.newsInput.value || '').trim();
  if (!t) {
    toast('한 줄 응원을 적어 주세요 🌸');
    try { el.newsInput.focus(); } catch (e) { /* 무시 */ }
    return;
  }
  if (addPost({ kind: 'note', text: t })) {
    el.newsInput.value = '';
    markBoardRead();
    updateNewsBadge();
    toast('축하 소식을 올렸어요 💬');
  }
}

function bindSocial() {
  el.shareBtn.addEventListener('click', openShareSheet);
  el.copyInvite.addEventListener('click', (e) => { e.stopPropagation(); copyInvite(); });
  el.openHall.addEventListener('click', () => openHall('hall'));
  el.rankHall.addEventListener('click', () => openHall('hall'));
  el.rankInvite.addEventListener('click', openShareSheet);

  // 이달의 성경
  if (el.goalSave) el.goalSave.addEventListener('click', () => setGoal(el.goalSelect.value));

  // 축하 소식 게시판
  if (el.openNews) el.openNews.addEventListener('click', openNews);
  if (el.openNews2) el.openNews2.addEventListener('click', openNews);
  if (el.newsClose) el.newsClose.addEventListener('click', closeNews);
  if (el.newsOverlay) el.newsOverlay.addEventListener('click', (e) => { if (e.target === el.newsOverlay) closeNews(); });
  if (el.newsSend) el.newsSend.addEventListener('click', sendNote);
  if (el.newsInput) el.newsInput.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    sendNote();
  });
  if (el.newsList) {
    el.newsList.addEventListener('click', (e) => {
      const b = e.target.closest('[data-reply]');
      if (!b) return;
      const art = b.closest('.news-post');
      const input = art && art.querySelector('.np-input');
      if (addReply(b.dataset.reply, input ? input.value : '') && input) input.value = '';
    });
    el.newsList.addEventListener('focusout', () => {
      setTimeout(() => { if (newsPending) renderNews(true); }, 60);
    });
  }

  el.shareClose.addEventListener('click', closeShareSheet);
  el.shareDismiss.addEventListener('click', closeShareSheet);
  el.shareOverlay.addEventListener('click', (e) => { if (e.target === el.shareOverlay) closeShareSheet(); });
  el.shareStart.addEventListener('click', joinRoom);
  el.shareCopy.addEventListener('click', copyInvite);
  el.shareLeave.addEventListener('click', leaveRoom);
  el.nickInput.addEventListener('input', () => {
    const v = (el.nickInput.value || '').trim().slice(0, 16);
    social.name = v;
    saveSocial();
    updateCertCount();
    if (!el.certOverlay.hidden && certCur) fillCert(certCur);
    socialPush(700);
  });

  el.hallClose.addEventListener('click', () => { el.hallOverlay.hidden = true; });
  el.hallOverlay.addEventListener('click', (e) => { if (e.target === el.hallOverlay) el.hallOverlay.hidden = true; });
  el.hallTabHall.addEventListener('click', () => setHallPane('hall'));
  el.hallTabCert.addEventListener('click', () => setHallPane('cert'));
  el.certPreview.addEventListener('click', () => openCert({
    id: 'preview', kind: 'book', code: 'gen', name: '창세기', chapters: 50, date: TODAY, preview: true,
  }));

  el.certClose.addEventListener('click', closeCert);
  el.certOverlay.addEventListener('click', (e) => { if (e.target === el.certOverlay) closeCert(); });
  el.certPng.addEventListener('click', downloadCert);
  el.certPrint.addEventListener('click', printCert);

  el.rankList.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-clap]');
    if (!btn) return;
    sendClap(btn.dataset.clap);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (!el.certOverlay.hidden) { closeCert(); return; }
    if (!el.hallOverlay.hidden) { el.hallOverlay.hidden = true; return; }
    if (el.newsOverlay && !el.newsOverlay.hidden) { closeNews(); return; }
    if (!el.shareOverlay.hidden) { closeShareSheet(); return; }
  });

  let rsT = 0;
  window.addEventListener('resize', () => {
    clearTimeout(rsT);
    rsT = setTimeout(renderSocial, 180);
  });
  window.addEventListener('online', () => { if (social.room) connectRoom(); });
  window.addEventListener('offline', () => { if (social.room) setSocialMode('offline'); });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden || !social.room) return;
    if (social.mode === 'offline' || social.mode === 'error') connectRoom();
  });
}

function initSocial() {
  syncCerts();
  renderSocial();
  renderRank();
  renderCerts();
  updateCertCount();
  renderAttendance();
  renderMonthly();
  renderNews(true);
  renderNewsPreview();
  updateNewsBadge();
  if (social.room) connectRoom();
  if (social.invited && !social.name) {
    setTimeout(() => {
      openShareSheet();
      toast('함께 쓰는 방에 들어왔어요 · 이름을 정해 주세요 🌸', 3600);
      try { el.nickInput.focus(); } catch (e) { /* 무시 */ }
    }, 700);
  }
}

/* ───────── 이어서 치기 ───────── */
function refreshContinue() {
  const last = state.last;
  const same = last && last.code === cur.code && last.ch === cur.ch && last.vi === cur.vi;
  const meta = last && bookByCode[last.code];
  if (!last || same || !meta) {
    el.continueBtn.hidden = true;
    return;
  }
  el.continueBtn.hidden = false;
  el.continueBtn.textContent = `이어서 치기 · ${meta.name} ${chLabel(last.code, last.ch)} ${last.vi + 1}절`;
}

/* ───────── 피커 열고 닫기 ───────── */
function openPicker() {
  el.picker.classList.add('is-open');
  el.pickerScrim.hidden = false;
}
function closePicker() {
  el.picker.classList.remove('is-open');
  el.pickerScrim.hidden = true;
}

/* ───────── 백업 ───────── */
function exportJSON() {
  const payload = {
    app: 'bible-typing',
    version: 1,
    exportedAt: new Date().toISOString(),
    state,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `성경타자-도장판-${TODYMD()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  toast('도장판을 JSON 파일로 내보냈어요 🌸');
}
function TODYMD() { return ymd(); }

function importJSON(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result));
      const incoming = parsed.state || parsed;
      if (!incoming || typeof incoming !== 'object' || !('books' in incoming)) {
        throw new Error('형식이 맞지 않습니다');
      }
      const s = defaultState();
      s.books = incoming.books || {};
      s.days = incoming.days || {};
      s.stamps = Array.isArray(incoming.stamps) ? incoming.stamps : [];
      s.certs = Array.isArray(incoming.certs) ? incoming.certs : [];
      s.monthly = (incoming.monthly && typeof incoming.monthly === 'object') ? incoming.monthly : {};
      s.posts = Array.isArray(incoming.posts) ? incoming.posts : [];
      s.last = Object.assign({ code: 'gen', ch: 1, vi: 0 }, incoming.last || {});
      s.settings = Object.assign({ fs: 'md' }, incoming.settings || {});
      state = s;
      saveNow();
      applySettings();
      refreshProgressUI();
      renderBoard();
      toast('도장판을 불러왔어요 🌸');
    } catch (e) {
      console.warn(e);
      toast('이 파일은 도장판 백업 파일이 아니에요.');
    }
  };
  reader.readAsText(file);
}

function resetAll() {
  if (!window.confirm('지금까지 친 기록과 꽃 도장을 모두 지울까요?\n(되돌릴 수 없어요)')) return;
  state = defaultState();
  saveNow();
  refreshProgressUI();
  renderBoard();
  loadChapter(cur.code, cur.ch, 0);
  toast('기록을 깨끗이 지웠어요');
}

/* ───────── 설정 ───────── */
function applySettings() {
  const fs = (state.settings && state.settings.fs) || 'md';
  el.body.dataset.fs = fs;
  el.fsBtns.forEach((b) => b.classList.toggle('is-on', b.dataset.fs === fs));
}

/* ───────── 이벤트 ───────── */
function bind() {
  el.typeInput.addEventListener('input', onInput);
  el.typeInput.addEventListener('compositionstart', onCompositionStart);
  el.typeInput.addEventListener('compositionupdate', onCompositionUpdate);
  el.typeInput.addEventListener('compositionend', onCompositionEnd);

  el.typeInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      if (e.isComposing || composing) return;   // 한글 조합 확정 Enter는 그대로
      e.preventDefault();
      if (!verse) return;
      if (isComplete()) {
        advancing = false;
        completeVerse();
        return;
      }
      if (skipArmed) {
        skipArmed = false;
        clearTimeout(skipTimer);
        goVerse(cur.vi + 1);
        if (cur.vi < BOOKS[cur.code].chapters[cur.ch - 1].length - 1) {
          el.typeInput.focus();
        }
        return;
      }
      skipArmed = true;
      clearTimeout(skipTimer);
      skipTimer = setTimeout(() => { skipArmed = false; }, 4000);
      toast('아직 조금 남았어요 🌱  그래도 넘어가시려면 Enter를 한 번 더 눌러 주세요');
    }
    if (e.key === 'Escape') {
      skipArmed = false;
    }
  });

  el.typeInput.addEventListener('click', () => { skipArmed = false; });
  el.verseCard.addEventListener('click', () => el.typeInput.focus());

  el.btnNext.addEventListener('click', () => { if (cur.vi < BOOKS[cur.code].chapters[cur.ch - 1].length - 1 || cur.ch < BOOKS[cur.code].chapters.length) goVerse(cur.vi + 1); });
  el.btnPrev.addEventListener('click', () => goVerse(cur.vi - 1));
  el.btnClear.addEventListener('click', () => {
    el.typeInput.value = '';
    typedReq = [];
    autoGrow();
    renderStates();
    updateCount();
    el.typeInput.focus();
  });

  el.fsBtns.forEach((b) => b.addEventListener('click', () => {
    state.settings.fs = b.dataset.fs;
    applySettings();
    save();
  }));

  el.testamentTabs.addEventListener('click', (e) => {
    const btn = e.target.closest('.seg-btn');
    if (!btn) return;
    el.testamentTabs.querySelectorAll('.seg-btn').forEach((b) => b.classList.toggle('is-on', b === btn));
    renderBooks(btn.dataset.t);
  });

  el.backToBooks.addEventListener('click', showBookList);

  el.openPicker.addEventListener('click', openPicker);
  el.pickerClose.addEventListener('click', closePicker);
  el.pickerScrim.addEventListener('click', closePicker);

  el.openBoard.addEventListener('click', () => openBoard());
  el.openBoard2.addEventListener('click', () => openBoard());
  el.boardClose.addEventListener('click', () => { el.boardOverlay.hidden = true; });
  el.boardOverlay.addEventListener('click', (e) => { if (e.target === el.boardOverlay) el.boardOverlay.hidden = true; });

  el.calPrev.addEventListener('click', () => { calCursor = new Date(calCursor.getFullYear(), calCursor.getMonth() - 1, 1); renderCalendar(); });
  el.calNext.addEventListener('click', () => { calCursor = new Date(calCursor.getFullYear(), calCursor.getMonth() + 1, 1); renderCalendar(); });

  el.ovClose.addEventListener('click', () => { el.chapterOverlay.hidden = true; el.typeInput.focus(); });
  el.ovBoard.addEventListener('click', () => { el.chapterOverlay.hidden = true; openBoard(); });
  el.ovNext.addEventListener('click', () => {
    el.chapterOverlay.hidden = true;
    const book = BOOKS[cur.code];
    if (el.ovNext.dataset.mode === 'next' && cur.ch < book.chapters.length) {
      loadChapter(cur.code, cur.ch + 1, 0);
      goVerse(0);
    } else {
      loadChapter(cur.code, 1, 0);
    }
    el.typeInput.focus();
  });

  el.continueBtn.addEventListener('click', () => {
    const last = state.last;
    loadChapter(last.code, last.ch, last.vi);
    closePicker();
  });

  el.btnExport.addEventListener('click', exportJSON);
  el.btnImport.addEventListener('click', () => el.importFile.click());
  el.importFile.addEventListener('change', () => {
    if (el.importFile.files && el.importFile.files[0]) importJSON(el.importFile.files[0]);
    el.importFile.value = '';
  });
  el.btnReset.addEventListener('click', resetAll);

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (!el.chapterOverlay.hidden) { el.chapterOverlay.hidden = true; el.typeInput.focus(); return; }
    if (!el.boardOverlay.hidden) { el.boardOverlay.hidden = true; return; }
    if (el.picker.classList.contains('is-open')) closePicker();
  });

  window.addEventListener('beforeunload', saveNow);
  document.addEventListener('visibilitychange', () => { if (document.hidden) saveNow(); });
}

function openBoard() {
  renderBoard();
  el.boardOverlay.hidden = false;
}

/* ───────── 시작 ───────── */
async function init() {
  loadState();
  applySettings();
  bind();
  loadSocial();
  bindSocial();

  // 달력은 이번 달
  calCursor = new Date();

  try {
    INDEX = await fetchJSON('data/index.json');
  } catch (e) {
    console.error(e);
    el.verseText.innerHTML = '<span class="vch bad">말씀 목록을 불러오지 못했어요. 인터넷 연결을 확인한 뒤 새로고침해 주세요.</span>';
    return;
  }
  bookByCode = {};
  INDEX.books.forEach((b) => { bookByCode[b.code] = b; });

  // 자주 치는 곳
  el.quickChips.innerHTML = '';
  QUICK_BOOKS.forEach((q) => {
    const meta = bookByCode[q.code];
    if (!meta) return;
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip';
    b.textContent = q.label;
    b.addEventListener('click', () => openChapterPicker(q.code));
    el.quickChips.appendChild(b);
  });

  const last = state.last || { code: 'gen', ch: 1, vi: 0 };
  const startCode = bookByCode[last.code] ? last.code : 'gen';
  const startCh = Math.min(Math.max(1, last.ch || 1), bookByCode[startCode].chapters);
  const startVi = Math.max(0, last.vi || 0);

  el.testamentTabs.querySelectorAll('.seg-btn').forEach((b) => {
    b.classList.toggle('is-on', b.dataset.t === bookByCode[startCode].testament);
  });
  renderBooks(bookByCode[startCode].testament);
  await loadChapter(startCode, startCh, startVi);
  refreshProgressUI();
  refreshContinue();
  await ensureTodayChars();
  initSocial();

  // 이어서 치기 안내
  const t = computeTotals();
  if (t.verses > 0) {
    const rec = state.books[startCode] && state.books[startCode][startCh];
    if (rec && (rec.done || Object.keys(rec.v).length > 0) && !(rec.done)) {
      toast(`${bookByCode[startCode].name} ${chLabel(startCode, startCh)} ${startVi + 1}절에서 이어서 치세요 🌸`);
    }
  }

  if (t.verses === 0) {
    setTimeout(() => toast('어서 오세요 🌸  말씀을 보면서 천천히 따라 치시면 돼요', 4200), 700);
  }

  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

init();
