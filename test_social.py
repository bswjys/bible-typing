"""성경 타자 — 함께 쓰기 · 오늘의 등수 · 명예의 전당 · 완필 상장 검증 (Playwright)

    LD_LIBRARY_PATH=/workspace/.browserlibs/lib python3 test_social.py

검증 항목
 A. 로컬 모드: 오늘의 등수 패널 · 내 상장함 비어 있음 · 상장 미리보기 · PNG 저장 · 인쇄 버튼
 B. 한 권(요한이서) 완필 → 완필 상장 자동 팝업 · PNG 저장 · 명예의 전당/내 상장함 등재
 C. 세 브라우저 실시간: 방 입장(초대 링크) · 오늘의 등수 TOP 5 · 금/은/동 꽃잎 ·
    1등 금꽃잎 축하 토스트 · 응원 박수 👏 왕복 동기화 · Firebase 저장 확인 · 새로고침 유지
 D. PC(1280×800) · 모바일(390×844) 가로 넘침 0 · 콘솔 오류 0
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
ROOM = ('T' + str(int(time.time() * 1000))[-8:])[:12]
ROOM2 = (ROOM + 'G')[:12]

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
    """지금 화면의 절을 끝까지 따라 친다."""
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


def fb_delete():
    req = urllib.request.Request(ROOM_HOST, method='DELETE')
    try:
        urllib.request.urlopen(req, timeout=15)
    except Exception:
        pass


def fb_put(path, body):
    data = json.dumps(body).encode()
    req = urllib.request.Request(path, data=data, method='PUT',
                                 headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=15) as r:
        return r.read().decode()


def fb_delete_path(path):
    req = urllib.request.Request(path, method='DELETE')
    try:
        urllib.request.urlopen(req, timeout=15)
    except Exception:
        pass


def wait_live(page, timeout=25000):
    page.wait_for_function(
        """() => document.querySelector('#shareBtn').dataset.mode === 'live'""",
        timeout=timeout)


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


def room_init_script(name):
    return ("localStorage.setItem('bible-typing-room', JSON.stringify({room:'%s', name:'%s'}));"
            % (ROOM, name))


try:
    with sync_playwright() as p:
        browser = p.chromium.launch()

        # ══════════════════════════════════════════════
        # A. 로컬 모드 — 등수 패널 · 상장 미리보기 · PNG
        # ══════════════════════════════════════════════
        ctx = browser.new_context(viewport={'width': 1280, 'height': 800},
                                  permissions=['clipboard-read', 'clipboard-write'])
        page = ctx.new_page()
        page.add_init_script(TOAST_RECORDER)
        attach(page)
        page.goto(BASE, wait_until='networkidle')
        page.wait_for_timeout(700)

        check('오늘의 등수 패널 (TOP 5) 표시', page.is_visible('#rankCard'))
        check('로컬 모드: 내 한 줄만 표시', page.locator('#rankList .rank-row').count() == 1,
              page.locator('#rankList .rank-row').count())
        check('로컬 모드: 함께 쓰기 안내', page.is_visible('#rankInvite'))
        check('상단 공유 버튼 = 함께 쓰기 켜기', page.inner_text('#shareLabel').strip() == '함께 쓰기 켜기',
              page.inner_text('#shareLabel'))
        check('상단 명예의 전당 버튼', page.is_visible('#openHall'))

        page.click('#openHall')
        page.wait_for_timeout(300)
        check('명예의 전당 열림', page.is_visible('#hallOverlay'))
        page.click('#hallTabCert')
        page.wait_for_timeout(200)
        check('내 상장함 비어 있음 안내', page.is_visible('#certEmpty'))
        page.click('#certPreview')
        page.wait_for_timeout(700)
        check('상장 미리보기 열림', page.is_visible('#certOverlay'))
        check('상장 제목 = 완 필 상 장', page.inner_text('#certTitle').strip() == '완 필 상 장',
              page.inner_text('#certTitle'))
        check('상장 성함 = 김안숙 권사', page.inner_text('#certName').strip() == '김안숙 권사',
              page.inner_text('#certName'))
        check('상장 내용 = 창세기 전 50장 완필', '창세기 전' in page.inner_text('#certBody')
              and '50장' in page.inner_text('#certBody'), page.inner_text('#certBody'))
        check('상장 날짜 표시', '년' in page.inner_text('#certDate'), page.inner_text('#certDate'))
        check('금빛 직인', page.is_visible('.cert-seal'))
        page.screenshot(path=os.path.join(SHOTS, '20_상장_미리보기_1280.png'))

        with page.expect_download(timeout=20000) as dl_info:
            page.click('#certPng')
        dl = dl_info.value
        png_path = dl.path()
        head = open(png_path, 'rb').read(8)
        size = os.path.getsize(png_path)
        check('상장 PNG 파일 이름', '완필상장-창세기.png' in dl.suggested_filename, dl.suggested_filename)
        check('상장 PNG 형식·용량', head == b'\x89PNG\r\n\x1a\n' and size > 40000, (head, size))
        check('인쇄하기 버튼 있음', page.is_visible('#certPrint'))
        page.click('#certClose')
        page.click('#hallClose')
        page.wait_for_timeout(200)
        check('상장 닫기', not page.is_visible('#certOverlay'))

        # ══════════════════════════════════════════════
        # B. 한 권 완필 → 상장 자동 팝업 + 등재
        # ══════════════════════════════════════════════
        ctx2 = browser.new_context(viewport={'width': 1280, 'height': 800})
        page2 = ctx2.new_page()
        page2.add_init_script(TOAST_RECORDER)
        # 완필 직전 상태를 미리 넣고 시작 (마지막 13절만 남김)
        page2.add_init_script("""(() => {
            const d = new Date();
            const p = (n) => String(n).padStart(2, '0');
            const today = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
            const v = {};
            for (let i = 1; i <= 12; i++) v[i] = Date.now();
            const state = {
                v: 1,
                books: { '2jn': { '1': { v, done: false, ts: 0 } } },
                days: { [today]: { v: 12, c: 0, ch: 120 } },
                stamps: [], certs: [],
                last: { code: '2jn', ch: 1, vi: 12 },
                settings: { fs: 'md' },
            };
            localStorage.setItem('bible-typing-v1', JSON.stringify(state));
        })();""")
        attach(page2)
        page2.goto(BASE, wait_until='networkidle')
        page2.wait_for_timeout(700)
        check('완필 직전 상태: 요한이서 1장 13절', ref(page2) == '요한이서 1장 13절', ref(page2))
        type_current_verse(page2, 900)
        page2.wait_for_timeout(400)
        check('마지막 절 완료 → 꽃 도장 오버레이', page2.is_visible('#chapterOverlay'))
        page2.wait_for_function("""() => !document.querySelector('#certOverlay').hidden""", timeout=6000)
        check('한 권 완필 → 완필 상장 자동 팝업', page2.is_visible('#certOverlay'))
        check('상장 내용 = 요한이서 전 1장', '요한이서 전' in page2.inner_text('#certBody')
              and '1장' in page2.inner_text('#certBody'), page2.inner_text('#certBody'))
        page2.screenshot(path=os.path.join(SHOTS, '21_한권완필_상장_1280.png'))

        with page2.expect_download(timeout=20000) as dl2_info:
            page2.click('#certPng')
        dl2 = dl2_info.value
        check('완필 상장 PNG 저장', os.path.getsize(dl2.path()) > 40000
              and open(dl2.path(), 'rb').read(8) == b'\x89PNG\r\n\x1a\n')
        page2.click('#certClose')
        page2.wait_for_timeout(200)
        if page2.is_visible('#chapterOverlay'):
            page2.click('#ovClose')
            page2.wait_for_timeout(200)

        st = state_of(page2)
        certs = st.get('certs') or []
        check('저장: 완필 상장 기록', any(c.get('id') == 'book-2jn' for c in certs), certs)

        page2.click('#openHall')
        page2.wait_for_timeout(400)
        check('명예의 전당: 완필 1권', '완필' in page2.inner_text('#hallPaneHall')
              and '1권' in page2.inner_text('#hallPaneHall'), page2.inner_text('#hallPaneHall'))
        page2.click('#hallTabCert')
        page2.wait_for_timeout(300)
        check('내 상장함에 요한이서 완필 상장', page2.locator('#certGrid .cert-card').count() == 1
              and '요한이서' in page2.inner_text('#certGrid'), page2.inner_text('#certGrid'))
        page2.screenshot(path=os.path.join(SHOTS, '22_내상장함_1280.png'))
        page2.click('#certGrid .cert-card')
        page2.wait_for_timeout(400)
        check('상장함에서 상장 다시 보기', page2.is_visible('#certOverlay')
              and '요한이서' in page2.inner_text('#certBody'))
        page2.click('#certClose')
        page2.click('#hallClose')

        # ══════════════════════════════════════════════
        # C. 세 브라우저 실시간 모임
        # ══════════════════════════════════════════════
        ctxs = {}
        for key, name in [('a', '김안숙 권사'), ('b', '백승우'), ('c', '정윤선')]:
            c = browser.new_context(viewport={'width': 1280, 'height': 800},
                                    permissions=['clipboard-read', 'clipboard-write'])
            c.add_init_script(TOAST_RECORDER)
            c.add_init_script(room_init_script(name))
            ctxs[key] = c

        pa = ctxs['a'].new_page(); attach(pa)
        pb = ctxs['b'].new_page(); attach(pb)
        pc = ctxs['c'].new_page(); attach(pc)
        pa.goto(f'{BASE}?room={ROOM}', wait_until='networkidle')
        pb.goto(BASE, wait_until='networkidle')
        pc.goto(BASE, wait_until='networkidle')
        for pg in (pa, pb, pc):
            wait_live(pg)

        check('초대 링크(?room=)로 바로 입장', pa.evaluate(
            "() => document.querySelector('#shareBtn').dataset.mode") == 'live',
            pa.evaluate("() => document.querySelector('#shareBtn').dataset.mode"))
        check('함께 쓰는 중 표시 · 방 코드', pa.inner_text('#shareLabel').strip() == '함께 쓰는 중'
              and ROOM in pa.inner_text('#shareCode'), (pa.inner_text('#shareLabel'), pa.inner_text('#shareCode')))
        check('제목 옆 · 함께 쓰는 중 배지', pa.is_visible('#brandBadge')
              and '함께 쓰는 중' in pa.inner_text('#brandBadge'), pa.inner_text('#brandBadge'))
        check('세 사람 모두 같은 방', pa.locator('#rankList .rank-row').count() == 3,
              pa.locator('#rankList .rank-row').count())

        # 초대 링크 복사
        pa.click('#copyInvite')
        pa.wait_for_timeout(500)
        clip = pa.evaluate("() => navigator.clipboard.readText()")
        check('초대 링크 복사 (?room= 포함)', f'room={ROOM}' in clip, clip[-80:])

        # C 먼저 1절 → B 2절 → A 3절 (A가 1등으로 올라서는 순간 축하 토스트)
        type_verses(pc, 1)
        type_verses(pb, 2)
        type_verses(pa, 3)
        pa.wait_for_timeout(1500)

        rows = pa.locator('#rankList .rank-row')
        first = rows.nth(0)
        second = rows.nth(1)
        third = rows.nth(2)
        check('실시간 등수: A가 1위', '김안숙 권사' in first.inner_text(), first.inner_text())
        check('1등 = 금꽃잎 + 3절', '금꽃잎' in first.inner_text() and '3' in first.inner_text(),
              first.inner_text())
        check('1등 꽃잎 = 금색 배지', 'gold' in (first.locator('.rank-petal').get_attribute('class') or ''),
              first.locator('.rank-petal').get_attribute('class'))
        check('실시간 등수: B 2위 은꽃', '백승우' in second.inner_text()
              and '은꽃' in second.inner_text(), second.inner_text())
        check('2등 꽃잎 = 은색 배지', 'silver' in (second.locator('.rank-petal').get_attribute('class') or ''),
              second.locator('.rank-petal').get_attribute('class'))
        check('실시간 등수: C 3위 동꽃', '정윤선' in third.inner_text()
              and '동꽃' in third.inner_text(), third.inner_text())
        check('3등 꽃잎 = 동색 배지', 'bronze' in (third.locator('.rank-petal').get_attribute('class') or ''),
              third.locator('.rank-petal').get_attribute('class'))
        check('1등 축하 토스트 (금꽃잎)', any('1등 금꽃잎' in t for t in toast_log(pa)),
              toast_log(pa))
        pa.screenshot(path=os.path.join(SHOTS, '23_실시간_등수_1280.png'))

        check('B 화면에도 A가 1위로 보임', '김안숙 권사' in pb.locator('#rankList .rank-row').nth(0).inner_text(),
              pb.locator('#rankList .rank-row').nth(0).inner_text())

        # 응원 박수: B → A
        b_row_a = pb.locator('#rankList .rank-row', has_text='김안숙 권사')
        b_row_a.locator('.clap-btn').click()
        pb.wait_for_timeout(600)
        pa.wait_for_function(
            """() => {
                const row = [...document.querySelectorAll('#rankList .rank-row')]
                    .find((r) => r.textContent.includes('김안숙 권사'));
                return row && row.querySelector('.clap-btn').textContent.includes('1');
            }""", timeout=8000)
        check('박수 👏 실시간 반영 (A 화면 1)', True)
        check('박수 알림 토스트', any('응원의 박수를' in t for t in toast_log(pa)), toast_log(pa))
        check('B 화면 박수 보냄 안내', any('박수를 보냈어요' in t for t in toast_log(pb)), toast_log(pb))

        room = fb_get()
        members = (room or {}).get('members') or {}
        claps = (room or {}).get('claps') or {}
        by_name = {v.get('name'): v for v in members.values() if isinstance(v, dict)}
        check('Firebase: 세 사람 기록 저장', len(members) == 3, list(by_name))
        check('Firebase: A 오늘 3절 · 글자수 기록',
              by_name.get('김안숙 권사', {}).get('todayVerses') == 3
              and by_name.get('김안숙 권사', {}).get('todayChars', 0) > 0, by_name.get('김안숙 권사'))
        check('Firebase: 박수 1개 저장', sum(len(v) for v in claps.values()) == 1, claps)

        # 명예의 전당: 세 사람 + 박수
        pa.click('#rankHall')
        pa.wait_for_timeout(500)
        check('명예의 전당에 세 사람', pa.locator('#hallPaneHall .hall-row').count() == 3,
              pa.locator('#hallPaneHall .hall-row').count())
        check('명예의 전당 누적·박수 표시', '박수' not in pa.inner_text('#hallPaneHall')
              and '👏' in pa.inner_text('#hallPaneHall'), pa.inner_text('#hallPaneHall')[:120])
        pa.screenshot(path=os.path.join(SHOTS, '24_명예의전당_모임_1280.png'))
        pa.click('#hallClose')

        # 닉네임 변경 (모임 중)
        pb.click('#shareBtn')
        pb.wait_for_timeout(300)
        pb.fill('#nickInput', '사위 백승우')
        pb.click('#shareStart')
        pb.wait_for_timeout(1200)
        pa.wait_for_function("""() => document.querySelector('#rankList').textContent.includes('사위 백승우')""",
                             timeout=8000)
        check('닉네임 변경이 실시간 반영', '사위 백승우' in pa.inner_text('#rankList'),
              pa.inner_text('#rankList'))
        check('닉네임 localStorage 저장', '사위 백승우' in pb.evaluate(
            "() => localStorage.getItem('bible-typing-room') || ''"))
        pb.click('#shareClose')

        # TOP 5 밖이면 내 순위 표시 (가짜 참가자 5명)
        today = by_name.get('김안숙 권사', {}).get('today')
        for i in range(5):
            fb_put(f'{DB}/bible_typing_rooms/{ROOM}/members/fake{i}.json', {
                'name': f'가짜{i + 1}', 'today': today, 'todayVerses': 100 - i,
                'todayChars': 1000, 'totalVerses': 100, 'totalChapters': 10,
                'bookCount': 0, 'books': {}, 'oneRead': False, 'updatedAt': int(time.time() * 1000),
            })
        pa.wait_for_function("""() => !document.querySelector('#rankMe').hidden""", timeout=10000)
        check('TOP 5만 표시 (5명)', pa.locator('#rankList .rank-row').count() == 5,
              pa.locator('#rankList .rank-row').count())
        check('5등 밖이면 내 순위 표시', '내 순위' in pa.inner_text('#rankMe'), pa.inner_text('#rankMe'))
        pa.screenshot(path=os.path.join(SHOTS, '27_내순위_1280.png'))
        for i in range(5):
            fb_delete_path(f'{DB}/bible_typing_rooms/{ROOM}/members/fake{i}.json')
        pa.wait_for_function("""() => document.querySelector('#rankMe').hidden""", timeout=10000)

        # 함께 쓰기 끄기 (C 나감)
        pc.click('#shareBtn')
        pc.wait_for_timeout(200)
        pc.click('#shareLeave')
        pc.wait_for_timeout(1200)
        check('함께 쓰기 끄기 → 로컬 모드', pc.evaluate(
            "() => document.querySelector('#shareBtn').dataset.mode") == 'local',
            pc.evaluate("() => document.querySelector('#shareBtn').dataset.mode"))
        check('끄면 다른 사람 순위표에서 빠짐', '정윤선' not in pa.inner_text('#rankList'),
              pa.inner_text('#rankList'))

        # 머리글: 모임 중에도 제목 한 줄 · 겹침 없음
        for w in (1280, 1150, 1024):
            pa.set_viewport_size({'width': w, 'height': 800})
            pa.wait_for_timeout(320)
            m = pa.evaluate("""() => {
                const b = document.querySelector('.brand-text b');
                const t = document.querySelector('.topbar-tools');
                const br = b.getBoundingClientRect(), tr = t.getBoundingClientRect();
                return { clip: b.scrollWidth - b.clientWidth,
                         overlap: !(br.right <= tr.left + 1 || br.bottom <= tr.top + 1),
                         ov: document.documentElement.scrollWidth - window.innerWidth };
            }""")
            check(f'{w}px 모임 중: 제목·머리글 넘침/겹침 없음',
                  m['clip'] <= 0 and not m['overlap'] and m['ov'] <= 0, m)
        pa.set_viewport_size({'width': 1280, 'height': 800})
        pa.wait_for_timeout(250)

        # 새로고침 후 이름·방 유지
        pa.reload(wait_until='networkidle')
        wait_live(pa)
        pa.wait_for_timeout(1200)
        check('새로고침 후 방·이름 유지', pa.inner_text('#shareLabel').strip() == '함께 쓰는 중'
              and ROOM in pa.inner_text('#shareCode'), pa.inner_text('#shareCode'))
        check('새로고침 후 내 기록 유지', pa.locator('#rankList .rank-row.is-me').count() == 1
              and '오늘' in pa.inner_text('#rankCard'), pa.inner_text('#rankCard')[:120])

        # 초대 링크로 처음 온 사람: 이름부터 정하게 (김안숙 권사로 둔갑하지 않음)
        gc = browser.new_context(viewport={'width': 390, 'height': 844})
        pg = gc.new_page()
        pg.add_init_script(TOAST_RECORDER)
        attach(pg)
        pg.goto(f'{BASE}?room={ROOM2}', wait_until='networkidle')
        pg.wait_for_timeout(1600)
        wait_live(pg)
        check('초대 링크로 온 사람: 이름 정하기 시트', pg.is_visible('#shareOverlay'))
        check('초대 링크로 온 사람: 이름 칸 비어 있음', pg.input_value('#nickInput') == '',
              pg.input_value('#nickInput'))
        check('초대 링크로 온 사람: 이름 안내 토스트',
              any('이름을 정해 주세요' in t for t in toast_log(pg)), toast_log(pg))
        pg.fill('#nickInput', '사위 백승우')
        pg.click('#shareStart')
        pg.wait_for_timeout(1200)
        check('이름 정한 뒤 함께 쓰기 연결', pg.evaluate(
            "() => document.querySelector('#shareBtn').dataset.mode") == 'live',
            pg.evaluate("() => document.querySelector('#shareBtn').dataset.mode"))
        check('이름이 순위표에 반영', '사위 백승우' in pg.inner_text('#rankList'), pg.inner_text('#rankList'))
        pg.screenshot(path=os.path.join(SHOTS, '28_초대링크_첫입장_390.png'))
        fb_delete_path(f'{DB}/bible_typing_rooms/{ROOM2}.json')
        gc.close()

        # ══════════════════════════════════════════════
        # D. 레이아웃 · 콘솔
        # ══════════════════════════════════════════════
        ov = pa.evaluate("() => document.documentElement.scrollWidth - window.innerWidth")
        check('1280px 가로 넘침 없음', ov <= 0, ov)
        pa.set_viewport_size({'width': 390, 'height': 844})
        pa.wait_for_timeout(500)
        ov = pa.evaluate("() => document.documentElement.scrollWidth - window.innerWidth")
        check('390px 가로 넘침 없음', ov <= 0, ov)
        check('390px 등수 패널 표시', pa.is_visible('#rankCard'))
        pa.screenshot(path=os.path.join(SHOTS, '25_실시간_등수_390.png'), full_page=True)
        pa.click('#rankHall')
        pa.wait_for_timeout(400)
        ov = pa.evaluate("() => document.documentElement.scrollWidth - window.innerWidth")
        check('390px 명예의 전당 넘침 없음', ov <= 0, ov)
        pa.screenshot(path=os.path.join(SHOTS, '26_명예의전당_390.png'))
        pa.click('#hallClose')
        pa.set_viewport_size({'width': 1280, 'height': 800})
        pa.wait_for_timeout(300)

        check('콘솔 오류 0건', len(console_errors) == 0, console_errors[:5])

        browser.close()
finally:
    fb_delete()

print()
print(f'방 코드: {ROOM}')
print(f'총 {len(PASSES) + len(FAILS)}개 — 통과 {len(PASSES)} · 실패 {len(FAILS)}')
if FAILS:
    print('실패 목록:')
    for f in FAILS:
        print('  -', f)
    raise SystemExit(1)
