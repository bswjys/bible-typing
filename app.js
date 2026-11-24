'use strict';

/* ══════════════════════════════════════════════
   성경 타자 · 개역개정
   - 한 절씩 따라 치기 (띄어쓰기·문장부호는 자동)
   - 한글 IME 조합 중에는 빨간 오타로 깜빡이지 않음
   - 한 장을 마치면 꽃 도장 🌸
   ══════════════════════════════════════════════ */

const LS_KEY = 'bible-typing-v1';
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
  document.title = `${book.name} ${chLabel(code, ch)} · 성경 타자`;
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
    } else if (r < n) {
      cls += ' pending';            // 조합 중인 글자 — 아직 판정하지 않음
    } else if (r === n) {
      cls += ' cur';
      curEl = sp;
    } else {
      cls += ' todo';
    }
    if (sp.className !== cls) sp.className = cls;
  }

  if (curEl && !composing) keepCaretVisible(curEl);
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
  const d = state.days[TODAY] || (state.days[TODAY] = { v: 0, c: 0 });
  d.v += 1;

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
  const d = state.days[TODAY] || (state.days[TODAY] = { v: 0, c: 0 });
  if (first) {
    d.c += 1;
    state.stamps.push({ id: `${cur.code}-${cur.ch}-${Date.now()}`, d: TODAY, code: cur.code, ch: cur.ch, t: Date.now() });
  }
  saveNow();
  refreshProgressUI();
  refreshContinue();
  showChapterOverlay(first, verses.length);
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
  if (!el.boardOverlay.hidden) renderBoard();
  renderChapterInfo();
  updateBookDots();
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
    if (key === TODAY) s.classList.add('today');
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
