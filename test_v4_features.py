"""성경 타자 — 자동 출석·연속 출석·칭호 · 이달의 성경 & 월간 완필 상장 · 축하 소식 게시판 (Playwright)

    LD_LIBRARY_PATH=/workspace/.browserlibs/lib python3 test_v4_features.py

검증 항목
 A. 로컬: 1절 완료 → 자동 출석(✅ 오늘 출석) · 연속 출석(🔥) · 달력 출석 표시 · 출석 토스트
 B. 칭호 — 누적 절 수에 따라 🌱 새싹 타자수 / 🌸 말씀 꽃길 / ✍️ 성경 서기관 / 👑 은혜의 장인 (순위표·명예의 전당)
 C. 연속 출석 3일 마일스톤 → 🔥 축하 글 자동 등록
 D. 📅 이달의 성경 설정(66권) · 진행률 · 그 달 안에 완필 → 「이달의 성경 완필 상장」 발급 · PNG · 상장함
 E. 💬 축하 소식 — 한 권 완필/이달의 완필 자동 글 · 한 줄 응원 · 답글 · 알림 배지
 F. 두 브라우저 실시간 — 모임 이달의 성경 공유 · 새 소식 토스트/배지 · 답글 양방향 · Firebase 저장
 G. PC(1280×800) · 모바일(390×844) 넘침 0 · 콘솔 오류 0 · 테스트 방 정리
"""
import functools
import http.server
import json
import os
import socketserver
import threading
import time
import urllib.request

from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.abspath(__file__))
SHOTS = '/workspace/downloads/bible_typing'
os.makedirs(SHOTS, exist_ok=True)

DB = 'https://baby-feeding-9f820-default-rtdb.asia-southeast1.firebasedatabase.app'
ROOM = ('V' + str(int(time.time() * 1000))[-8:])[:12]
ROOM2 = (ROOM + 'M')[:12]

FAILS, PASSES = [], []


def check(name, cond, extra=''):
    if cond:
        PASSES.append(name)
        print('PASS  ' + name)
    else:
        FAILS.append(name)
        print('FAIL  ' + name + ((' — ' + str(extra)) if extra else ''))


class Handler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


httpd = socketserver.TCPServer(('127.0.0.1', 0), functools.partial(Handler, directory=ROOT))
PORT = httpd.server_address[1]
threading.Thread(target=httpd.serve_forever, daemon=True).start()
BASE = f'http://127.0.0.1:{PORT}/'

console_errors = []


def attach(page):
    page.on('console', lambda m: console_errors.append(f'{m.type}: {m.text}')
            if m.type == 'error' else None)
    page.on('pageerror', lambda e: console_errors.append(f'pageerror: {e}'))


def letters(text):
    skip = set(' \u00a0\t\n.,!?;:\'"“”‘’()[]{}<>《》〈〉「」『』·ㆍ…~-–—―/\\|•※')
    return ''.join(c for c in text if c not in skip)


def ref(page):
    return page.inner_text('#refLabel').strip()


def state_of(page):
    return page.evaluate("() => JSON.parse(localStorage.getItem('bible-typing-v1') || '{}')")


def toast_log(page):
    return page.evaluate("() => window.__toasts || []")


def type_current_verse(page, wait=1100):
    text = page.inner_text('#verseText')
    page.fill('#typeInput', letters(text))
    page.wait_for_timeout(wait)


def type_verses(page, n):
    for _ in range(n):
        before = ref(page)
        type_current_verse(page)
        try:
            page.wait_for_function(
                "([t]) => document.querySelector('#refLabel').textContent.trim() !== t",
                arg=[before], timeout=4000)
        except Exception:
            pass
        page.wait_for_timeout(120)


ROOM_HOST = f'{DB}/bible_typing_rooms/{ROOM}.json'


def fb_get(path=None):
    with urllib.request.urlopen(path or ROOM_HOST, timeout=15) as r:
        return json.loads(r.read().decode() or 'null')


def fb_delete(path):
    try:
        urllib.request.urlopen(urllib.request.Request(path, method='DELETE'), timeout=15)
    except Exception:
        pass


def wait_live(page, timeout=30000):
    page.wait_for_function(
        "() => document.querySelector('#shareBtn').dataset.mode === 'live'", timeout=timeout)


TOAST_RECORDER = """
window.__toasts = [];
document.addEventListener('DOMContentLoaded', () => {
  const t = document.getElementById('toast');
  if (!t) return;
  new MutationObserver(() => {
    if (!t.hidden) {
      const s = (t.textContent || '').trim();
      if (s && window.__toasts[window.__toasts.length - 1] !== s) window.__toasts.push(s);
    }
  }).observe(t, { attributes: true, childList: true, subtree: true, characterData: true });
});
"""


def room_init_script(room, name):
    return ("localStorage.setItem('bible-typing-room', JSON.stringify({room:'%s', name:'%s'}));"
            % (room, name))


def seed_js(body):
    return """(() => {
        const d = new Date(), p = (n) => String(n).padStart(2, '0');
        const today = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
        const ym = today.slice(0, 7);
        const day = (back) => { const x = new Date(); x.setDate(x.getDate() - back);
            return `${x.getFullYear()}-${p(x.getMonth() + 1)}-${p(x.getDate())}`; };
        const state = { v: 1, books: {}, days: {}, stamps: [], certs: [], monthly: {}, posts: [],
                        last: { code: 'gen', ch: 1, vi: 0 }, settings: { fs: 'md' } };
        %s
        localStorage.setItem('bible-typing-v1', JSON.stringify(state));
    })();""" % body


try:
    with sync_playwright() as p:
        browser = p.chromium.launch()

        # ══════════════════════════════════════════════
        # A. 자동 출석 · 연속 출석
        # ══════════════════════════════════════════════
        ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
        page = ctx.new_page()
        page.add_init_script(TOAST_RECORDER)
        attach(page)
        page.goto(BASE, wait_until='networkidle')
        page.wait_for_timeout(800)

        check('출석 카드 표시', page.is_visible('#attCard'))
        check('처음엔 오늘 출석 전', page.inner_text('#attToday').strip() == '🌱 아직 오늘 출석 전',
              page.inner_text('#attToday'))
        check('처음엔 0일 연속', page.inner_text('#attStreak').strip() == '🔥 0일 연속',
              page.inner_text('#attStreak'))
        check('출석 꽃밭 14칸', page.locator('#attGarden .att-cell').count() == 14,
              page.locator('#attGarden .att-cell').count())
        check('처음 칭호 = 🌱 새싹 타자수', '새싹 타자수' in page.inner_text('#myTitle'),
              page.inner_text('#myTitle'))

        type_verses(page, 1)
        page.wait_for_timeout(700)

        check('1절 완료 → 자동 출석 ✅ 오늘 출석',
              page.inner_text('#attToday').strip() == '✅ 오늘 출석', page.inner_text('#attToday'))
        check('자동 출석 배지 색 켜짐', 'is-on' in (page.get_attribute('#attToday', 'class') or ''),
              page.get_attribute('#attToday', 'class'))
        check('연속 출석 1일', page.inner_text('#attStreak').strip() == '🔥 1일 연속',
              page.inner_text('#attStreak'))
        check('오늘 출석 토스트', any('오늘 출석 완료' in t for t in toast_log(page)), toast_log(page))
        check('달력 오늘 칸에 출석 표시', page.locator('#calGrid .day.today.att').count() == 1,
              page.locator('#calGrid .day.today.att').count())
        check('꽃밭 오늘 칸에 꽃', page.locator('#attGarden .att-cell.today.has').count() == 1)
        st = state_of(page)
        today_key = page.evaluate("""() => { const d = new Date(), p = (n) => String(n).padStart(2, '0');
            return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; }""")
        check('저장: 오늘 1절 자동 기록', st['days'].get(today_key, {}).get('v') == 1,
              st['days'].get(today_key))
        check('순위표 내 칭호 배지', '새싹 타자수' in page.inner_text('#rankList'),
              page.inner_text('#rankList'))
        check('순위표 내 연속 출석', '🔥 1일' in page.inner_text('#rankList'), page.inner_text('#rankList'))
        check('이번 달 출석 일수 표시', '1일' in page.inner_text('#attMonth'), page.inner_text('#attMonth'))
        page.screenshot(path=os.path.join(SHOTS, '31_v4_출석_1280.png'))

        # ══════════════════════════════════════════════
        # B. 칭호 단계 (누적 절 수)
        # ══════════════════════════════════════════════
        title_cases = [
            (25, '🌱 새싹 타자수'),
            (30, '🌸 말씀 꽃길'),
            (200, '✍️ 성경 서기관'),
            (1000, '👑 은혜의 장인'),
        ]
        for verses, expected in title_cases:
            c = browser.new_context(viewport={'width': 1280, 'height': 800})
            c.add_init_script(seed_js("""
                let n = 0; state.books.gen = {};
                for (let ch = 1; ch <= 40 && n < %d; ch++) {
                    state.books.gen[ch] = { v: {}, done: false, ts: 0 };
                    for (let i = 0; i < 50 && n < %d; i++) { state.books.gen[ch].v[i] = Date.now(); n++; }
                }
            """ % (verses, verses)))
            pg = c.new_page()
            attach(pg)
            pg.goto(BASE, wait_until='networkidle')
            pg.wait_for_timeout(700)
            got = pg.inner_text('#myTitle').strip()
            check(f'칭호 {verses}절 → {expected}', got == expected, got)
            check(f'칭호 {verses}절 순위표 표시', expected.split(' ', 1)[1] in pg.inner_text('#rankList'),
                  pg.inner_text('#rankList'))
            c.close()

        # ══════════════════════════════════════════════
        # C. 연속 3일 마일스톤 → 자동 축하 글
        # ══════════════════════════════════════════════
        c = browser.new_context(viewport={'width': 1280, 'height': 800})
        c.add_init_script(TOAST_RECORDER)
        c.add_init_script(seed_js("""
            state.days[day(1)] = { v: 6, c: 0, ch: 40 };
            state.days[day(2)] = { v: 4, c: 0, ch: 30 };
        """))
        pg = c.new_page()
        attach(pg)
        pg.goto(BASE, wait_until='networkidle')
        pg.wait_for_timeout(700)
        check('어제까지 2일 연속이면 오늘 전엔 2일', pg.inner_text('#attStreak').strip() == '🔥 2일 연속',
              pg.inner_text('#attStreak'))
        type_verses(pg, 1)
        pg.wait_for_timeout(900)
        check('오늘까지 3일 연속', pg.inner_text('#attStreak').strip() == '🔥 3일 연속',
              pg.inner_text('#attStreak'))
        posts = state_of(pg).get('posts') or []
        check('3일 연속 축하 글 자동 등록',
              any('3일 연속 출석을 달성했어요' in (x.get('text') or '') for x in posts),
              [x.get('text') for x in posts])
        check('3일 연속 글 형식 (🔥 이름)', any((x.get('text') or '').startswith('🔥 김안숙 권사님이 3일 연속')
                                          for x in posts), [x.get('text') for x in posts])
        pg.click('#openHall')
        pg.wait_for_timeout(400)
        check('명예의 전당에 칭호 표시', '타자수' in pg.inner_text('#hallPaneHall'),
              pg.inner_text('#hallPaneHall')[:160])
        check('명예의 전당에 연속 출석', '🔥 3일 연속' in pg.inner_text('#hallPaneHall'),
              pg.inner_text('#hallPaneHall')[:200])
        pg.click('#hallClose')
        pg.wait_for_timeout(200)
        pg.screenshot(path=os.path.join(SHOTS, '32_v4_연속3일_1280.png'))
        c.close()

        # ══════════════════════════════════════════════
        # D. 이달의 성경 · 월간 완필 상장
        # ══════════════════════════════════════════════
        c = browser.new_context(viewport={'width': 1280, 'height': 800}, accept_downloads=True)
        c.add_init_script(TOAST_RECORDER)
        c.add_init_script(seed_js("""
            const v = {}; for (let i = 0; i < 12; i++) v[i] = Date.now();
            state.books['2jn'] = { '1': { v, done: false, ts: 0 } };
            state.days[today] = { v: 12, c: 0, ch: 100 };
            state.last = { code: '2jn', ch: 1, vi: 12 };
        """))
        pg = c.new_page()
        attach(pg)
        pg.goto(BASE, wait_until='networkidle')
        pg.wait_for_timeout(800)

        check('이달의 성경 카드 표시', pg.is_visible('#goalCard'))
        check('이달의 성경 처음엔 미설정 안내', '아직 정하지 않았어요' in pg.inner_text('#goalMain'),
              pg.inner_text('#goalMain'))
        check('이달 추천 표시', '추천' in pg.inner_text('#goalMain'), pg.inner_text('#goalMain'))
        check('이달의 성경 후보 66권', pg.locator('#goalSelect option').count() == 66,
              pg.locator('#goalSelect option').count())
        check('이달의 성경 월 표시 (2026년 11월)', '2026년 11월' in pg.inner_text('#goalMonth'),
              pg.inner_text('#goalMonth'))

        pg.select_option('#goalSelect', '2jn')
        pg.click('#goalSave')
        pg.wait_for_timeout(600)
        st = state_of(pg)
        ym = today_key[:7]
        check('이달의 성경 저장 (localStorage)', (st.get('monthly') or {}).get(ym) == '2jn',
              st.get('monthly'))
        check('이달의 성경 카드에 이름·진행률', '요한이서' in pg.inner_text('#goalMain')
              and '0 / 1장' in pg.inner_text('#goalMain'), pg.inner_text('#goalMain'))
        check('이달의 성경 설정 토스트', any('이달의 성경은 요한이서' in t for t in toast_log(pg)),
              toast_log(pg))

        # 마지막 1절 → 한 장 완료 → 이달의 성경 완필 상장
        type_current_verse(pg, 1200)
        pg.wait_for_function("() => !document.querySelector('#certOverlay').hidden", timeout=8000)
        check('이달의 성경 완필 → 상장 자동 팝업', pg.is_visible('#certOverlay'))
        check('월간 상장 제목 = 이 달 의 성 경 상 장',
              pg.inner_text('#certTitle').strip() == '이 달 의 성 경 상 장', pg.inner_text('#certTitle'))
        body = pg.inner_text('#certBody').replace('\n', ' ')
        check('월간 상장 문구 (2026년 11월 · [요한이서] · 전 1장)',
              '2026년 11월 이달의 성경 [요한이서] 전 1장을' in body, body)
        check('월간 상장 성함', pg.inner_text('#certName').strip() == '김안숙 권사',
              pg.inner_text('#certName'))
        st = state_of(pg)
        ids = [x.get('id') for x in (st.get('certs') or [])]
        check('저장: 이달의 성경 상장', f'month-{ym}-2jn' in ids, ids)
        pg.wait_for_timeout(700)
        pg.screenshot(path=os.path.join(SHOTS, '33_v4_월간상장_1280.png'))

        with pg.expect_download(timeout=20000) as dl_info:
            pg.click('#certPng')
        dl = dl_info.value
        head = open(dl.path(), 'rb').read(8)
        check('월간 상장 PNG 파일 이름', f'이달의상장-{ym}-요한이서.png' in dl.suggested_filename,
              dl.suggested_filename)
        check('월간 상장 PNG 형식·용량', head == b'\x89PNG\r\n\x1a\n' and os.path.getsize(dl.path()) > 40000,
              (head, os.path.getsize(dl.path())))
        pg.click('#certClose')
        if pg.is_visible('#chapterOverlay'):
            pg.click('#ovClose')
        pg.wait_for_timeout(500)

        check('완필 뒤 카드에 1 / 1장', '1 / 1장' in pg.inner_text('#goalMain'), pg.inner_text('#goalMain'))
        check('완필 축하 문구', '이달의 성경 완필' in pg.inner_text('#goalMain'), pg.inner_text('#goalMain'))
        check('완필 축하 토스트', any('이달의 성경 [요한이서] 완필' in t for t in toast_log(pg)),
              toast_log(pg))

        pg.click('#openHall')
        pg.wait_for_timeout(400)
        pg.click('#hallTabCert')
        pg.wait_for_timeout(300)
        cert_txt = pg.inner_text('#certGrid')
        check('상장함에 한 권 완필 상장', '요한이서 완필' in cert_txt, cert_txt)
        check('상장함에 이달의 성경 상장', '이달의 성경 · 요한이서' in cert_txt, cert_txt)
        check('상장함 월 표기', '2026년 11월' in cert_txt, cert_txt)
        pg.screenshot(path=os.path.join(SHOTS, '34_v4_상장함_1280.png'))
        pg.click('#hallClose')
        pg.wait_for_timeout(250)

        # ══════════════════════════════════════════════
        # E. 축하 소식 게시판 (로컬)
        # ══════════════════════════════════════════════
        check('상단 💬 축하 소식 버튼', pg.is_visible('#openNews'))
        check('축하 소식 버튼 문구', '축하 소식' in pg.inner_text('#openNews'), pg.inner_text('#openNews'))
        check('레일 축하 소식 카드', pg.is_visible('#openNews2'))
        check('레일 미리보기에 최신 소식', '완필했어요' in pg.inner_text('#newsPreview'),
              pg.inner_text('#newsPreview'))
        check('레일 미리보기 = 이달의 성경 완필 글', '이달의 성경' in pg.inner_text('#newsPreview'),
              pg.inner_text('#newsPreview'))
        check('처음엔 알림 배지 없음', pg.locator('#newsBadge').is_hidden())

        pg.click('#openNews')
        pg.wait_for_timeout(400)
        check('축하 소식 게시판 열림', pg.is_visible('#newsOverlay'))
        texts = pg.evaluate("""() => [...document.querySelectorAll('#newsList .news-post .np-text')]
            .map((n) => n.textContent)""")
        check('한 권 완필 축하 글 자동 등록',
              any(t.startswith('🎉 김안숙 권사님이 [요한이서]을 완필했어요!') for t in texts), texts)
        check('이달의 성경 완필 축하 글 자동 등록',
              any(t.startswith('🏆 김안숙 권사님이 11월 이달의 성경 [요한이서]을 완필했어요!') for t in texts),
              texts)
        check('게시판에 칭호 표시', '타자수' in pg.inner_text('#newsList'), pg.inner_text('#newsList')[:200])

        pg.fill('#newsInput', '오늘도 은혜 가득한 하루 되세요!')
        pg.click('#newsSend')
        pg.wait_for_timeout(400)
        check('한 줄 응원 남기기', pg.locator('#newsList .news-post').count() == 3,
              pg.locator('#newsList .news-post').count())
        check('응원 글 내용 저장', '은혜 가득한 하루' in pg.inner_text('#newsList'),
              pg.inner_text('#newsList')[:200])

        first = pg.locator('#newsList .news-post').nth(0)
        first.locator('.np-input').fill('축하드려요! 🌸')
        first.locator('.np-send').click()
        pg.wait_for_timeout(500)
        check('답글 등록 · 목록에 표시', first.locator('.np-reply').count() == 1
              and '축하드려요! 🌸' in first.inner_text(), first.inner_text())
        st = state_of(pg)
        check('저장: 답글 1개',
              any(len(x.get('replies') or {}) == 1 for x in (st.get('posts') or [])),
              [(x.get('text'), len(x.get('replies') or {})) for x in (st.get('posts') or [])])
        check('게시판 열면 알림 배지 사라짐', pg.locator('#newsBadge').is_hidden())
        pg.screenshot(path=os.path.join(SHOTS, '35_v4_축하소식_1280.png'))

        pg.set_viewport_size({'width': 390, 'height': 844})
        pg.wait_for_timeout(400)
        check('390px 게시판 넘침 없음',
              pg.evaluate("() => document.documentElement.scrollWidth - window.innerWidth") <= 0)
        pg.screenshot(path=os.path.join(SHOTS, '36_v4_축하소식_390.png'))
        pg.click('#newsClose')
        pg.wait_for_timeout(200)
        c.close()

        # ══════════════════════════════════════════════
        # F. 두 브라우저 실시간 (모임)
        # ══════════════════════════════════════════════
        ca = browser.new_context(viewport={'width': 1280, 'height': 800})
        ca.add_init_script(TOAST_RECORDER)
        ca.add_init_script(seed_js("""
            const v = {}; for (let i = 0; i < 12; i++) v[i] = Date.now();
            state.books['2jn'] = { '1': { v, done: false, ts: 0 } };
            state.days[today] = { v: 12, c: 0, ch: 100 };
            state.last = { code: '2jn', ch: 1, vi: 12 };
        """))
        ca.add_init_script(room_init_script(ROOM, '김안숙 권사'))
        cb = browser.new_context(viewport={'width': 1280, 'height': 800})
        cb.add_init_script(TOAST_RECORDER)
        cb.add_init_script(room_init_script(ROOM, '백승우'))

        pa = ca.new_page()
        pb = cb.new_page()
        for x in (pa, pb):
            attach(x)
        pa.goto(f'{BASE}?room={ROOM}', wait_until='networkidle')
        pb.goto(BASE, wait_until='networkidle')
        for x in (pa, pb):
            wait_live(x)
        pa.wait_for_timeout(1200)

        pa.select_option('#goalSelect', '2jn')
        pa.click('#goalSave')
        pa.wait_for_timeout(700)
        room = fb_get() or {}
        goal = (room.get('monthlyGoal') or {}).get(today_key[:7]) or {}
        check('Firebase: 모임 이달의 성경 저장', goal.get('code') == '2jn', room.get('monthlyGoal'))
        try:
            pb.wait_for_function(
                "() => document.querySelector('#goalMain').textContent.includes('요한이서')", timeout=15000)
            check('모임 이달의 성경이 다른 사람 화면에 공유', True)
        except Exception:
            check('모임 이달의 성경이 다른 사람 화면에 공유', False, pb.inner_text('#goalMain'))
        check('모임 중 이달의 성경 안내 문구', '모두가 같은 이달의 성경' in pb.inner_text('#goalNote'),
              pb.inner_text('#goalNote'))

        # A가 마지막 절 → 자동 축하 글
        type_current_verse(pa, 1300)
        pa.wait_for_function("() => !document.querySelector('#certOverlay').hidden", timeout=8000)
        check('A: 이달의 성경 상장 팝업', '이 달 의 성 경 상 장' in pa.inner_text('#certTitle'),
              pa.inner_text('#certTitle'))

        try:
            pb.wait_for_function(
                "() => window.__toasts.some((t) => t.includes('새 축하/답글을 남겼어요'))", timeout=15000)
            check('B: 새 소식 토스트 (💬 작성자)', any('김안숙 권사님이 새 축하/답글' in t for t in toast_log(pb)),
                  toast_log(pb))
        except Exception:
            check('B: 새 소식 토스트 (💬 작성자)', False, toast_log(pb))
        check('B: 알림 배지 숫자', pb.locator('#newsBadge').is_visible()
              and pb.inner_text('#newsBadge').strip() in ('1', '2'), pb.inner_text('#newsBadge'))
        check('B: 알림 배지 반짝임', 'is-alert' in (pb.get_attribute('#openNews', 'class') or ''),
              pb.get_attribute('#openNews', 'class'))
        pb.screenshot(path=os.path.join(SHOTS, '37_v4_새소식_배지_1280.png'))

        pb.click('#openNews')
        pb.wait_for_timeout(500)
        check('B: 게시판에 A의 축하 글 2개', pb.locator('#newsList .news-post').count() == 2,
              pb.locator('#newsList .news-post').count())
        check('B: 게시판 열면 배지 사라짐', pb.locator('#newsBadge').is_hidden())

        bfirst = pb.locator('#newsList .news-post').nth(0)
        bfirst.locator('.np-input').fill('축하드려요! 🌸')
        bfirst.locator('.np-send').click()
        pb.wait_for_timeout(600)
        check('B: 답글 등록', bfirst.locator('.np-reply').count() == 1, bfirst.inner_text())
        pb.screenshot(path=os.path.join(SHOTS, '38_v4_게시판_모임_1280.png'))

        try:
            pa.wait_for_function(
                "() => window.__toasts.some((t) => t.includes('새 축하/답글을 남겼어요'))", timeout=15000)
            check('A: 답글 알림 토스트', any('백승우님이 새 축하/답글' in t for t in toast_log(pa)),
                  toast_log(pa))
        except Exception:
            check('A: 답글 알림 토스트', False, toast_log(pa))
        check('A: 답글 알림 배지', pa.locator('#newsBadge').is_visible(), pa.inner_text('#newsBadge'))

        if pa.is_visible('#certOverlay'):
            pa.click('#certClose')
        if pa.is_visible('#chapterOverlay'):
            pa.click('#ovClose')
        pa.wait_for_timeout(300)
        pa.click('#openNews')
        pa.wait_for_timeout(500)
        check('A: 답글이 실시간으로 보임', '축하드려요! 🌸' in pa.inner_text('#newsList'),
              pa.inner_text('#newsList')[:250])
        pa.screenshot(path=os.path.join(SHOTS, '39_v4_답글_실시간_1280.png'))

        room = fb_get() or {}
        posts = room.get('posts') or {}
        check('Firebase: 축하 글 2개 저장', len(posts) == 2, [v.get('text') for v in posts.values()])
        check('Firebase: 답글 1개 저장',
              sum(len(v.get('replies') or {}) for v in posts.values()) == 1,
              {k: len(v.get('replies') or {}) for k, v in posts.items()})

        pb.click('#newsClose')
        pb.wait_for_timeout(200)
        pb.select_option('#goalSelect', 'mat')
        pb.click('#goalSave')
        try:
            pa.wait_for_function(
                "() => document.querySelector('#goalMain').textContent.includes('마태복음')", timeout=15000)
            check('다른 사람이 바꾼 이달의 성경이 바로 반영', True)
        except Exception:
            check('다른 사람이 바꾼 이달의 성경이 바로 반영', False, pa.inner_text('#goalMain'))

        # ══════════════════════════════════════════════
        # G. 넘침 · 콘솔
        # ══════════════════════════════════════════════
        for x, tag in ((pa, 'A'), (pb, 'B')):
            for w, h in ((1280, 800), (390, 844)):
                x.set_viewport_size({'width': w, 'height': h})
                x.wait_for_timeout(350)
                ov = x.evaluate("() => document.documentElement.scrollWidth - window.innerWidth")
                check(f'{tag} {w}px 가로 넘침 없음', ov <= 0, ov)
        pb.set_viewport_size({'width': 390, 'height': 844})
        pb.wait_for_timeout(300)
        pb.screenshot(path=os.path.join(SHOTS, '40_v4_모임_390.png'))

        check('콘솔 오류 0건', len(console_errors) == 0, console_errors[:5])
        browser.close()
finally:
    fb_delete(f'{DB}/bible_typing_rooms/{ROOM}.json')
    fb_delete(f'{DB}/bible_typing_rooms/{ROOM2}.json')

print()
print(f'방 코드: {ROOM}')
print(f'총 {len(PASSES) + len(FAILS)}개 — 통과 {len(PASSES)} · 실패 {len(FAILS)}')
if FAILS:
    print('실패 목록:')
    for f in FAILS:
        print('  -', f)
    raise SystemExit(1)
