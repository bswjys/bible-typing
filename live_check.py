"""라이브(bswjys.github.io/bible-typing) 확인 — 배포 후 실제 주소에서 동작·스크린샷

    LD_LIBRARY_PATH=/workspace/.browserlibs/lib python3 live_check.py
"""
import json
import os
import time
import urllib.request

from playwright.sync_api import sync_playwright

URL = 'https://bswjys.github.io/bible-typing/'
DB = 'https://baby-feeding-9f820-default-rtdb.asia-southeast1.firebasedatabase.app'
ROOM = ('L' + str(int(time.time() * 1000))[-8:])[:12]
SHOTS = '/workspace/downloads/bible_typing'
os.makedirs(SHOTS, exist_ok=True)
PASSES, FAILS = [], []
errs = []


def check(name, cond, extra=''):
    (PASSES if cond else FAILS).append(name)
    print(('PASS  ' if cond else 'FAIL  ') + name + ('' if cond else f' — {extra}'))


def attach(page):
    page.on('console', lambda m: errs.append(f'{m.type}: {m.text}') if m.type == 'error' else None)
    page.on('pageerror', lambda e: errs.append(f'pageerror: {e}'))


def letters(text):
    skip = set(' \u00a0\t\n.,!?;:\'"“”‘’()[]{}<>《》〈〉「」『』·ㆍ…~-–—―/\\|•※')
    return ''.join(c for c in text if c not in skip)


def type_verses(page, n):
    for _ in range(n):
        before = page.inner_text('#refLabel').strip()
        page.fill('#typeInput', letters(page.inner_text('#verseText')))
        page.wait_for_timeout(1100)
        try:
            page.wait_for_function("([t]) => document.querySelector('#refLabel').textContent.trim() !== t",
                                   arg=[before], timeout=4000)
        except Exception:
            pass


def wait_live(page):
    page.wait_for_function("() => document.querySelector('#shareBtn').dataset.mode === 'live'",
                           timeout=30000)


with sync_playwright() as p:
    browser = p.chromium.launch()

    for asset in ['', 'index.html', 'app.js?v=4', 'styles.css?v=4', 'sw.js', 'data/index.json']:
        with urllib.request.urlopen(URL + asset, timeout=20) as r:
            check(f'HTTP 200 — /{asset}', r.status == 200, r.status)

    ctx = browser.new_context(viewport={'width': 1280, 'height': 800},
                              permissions=['clipboard-read', 'clipboard-write'])
    page = ctx.new_page()
    attach(page)
    page.goto(URL, wait_until='networkidle')
    page.wait_for_timeout(1200)
    check('라이브 제목', '솔까 김안숙 권사 전용 성경 타이핑' in page.title(), page.title())
    check('라이브 본문 로드', page.inner_text('#verseText').strip() == '태초에 하나님이 천지를 창조하시니라',
          page.inner_text('#verseText'))
    check('라이브 등수 패널', page.is_visible('#rankCard'))
    check('라이브 sw v4 등록', page.evaluate(
        "async () => { const r = await navigator.serviceWorker.getRegistration(); return !!r; }"))
    page.screenshot(path=os.path.join(SHOTS, 'live_main_1280.png'))

    page.click('#openHall')
    page.wait_for_timeout(500)
    check('라이브 명예의 전당', page.is_visible('#hallOverlay'))
    page.screenshot(path=os.path.join(SHOTS, 'live_hall_of_fame_1280.png'))
    page.click('#hallTabCert')
    page.wait_for_timeout(300)
    page.click('#certPreview')
    page.wait_for_timeout(800)
    check('라이브 상장 미리보기', page.is_visible('#certOverlay'))
    page.screenshot(path=os.path.join(SHOTS, 'live_certificate_1280.png'))
    with page.expect_download(timeout=25000) as d:
        page.click('#certPng')
    check('라이브 상장 PNG 저장', os.path.getsize(d.value.path()) > 40000)
    page.click('#certClose')
    page.click('#hallClose')
    page.wait_for_timeout(200)

    # 라이브 타자: 한 절 완료
    t = page.inner_text('#verseText')
    page.fill('#typeInput', letters(t))
    page.wait_for_timeout(1200)
    check('라이브 타자 → 다음 절', page.inner_text('#refLabel').strip() == '창세기 1장 2절',
          page.inner_text('#refLabel'))

    # v4: 자동 출석 · 칭호 · 이달의 성경 · 축하 소식
    check('라이브 자동 출석 (✅ 오늘 출석)', page.inner_text('#attToday').strip() == '✅ 오늘 출석',
          page.inner_text('#attToday'))
    check('라이브 연속 출석 (🔥 1일 연속)', '🔥 1일 연속' in page.inner_text('#attStreak'),
          page.inner_text('#attStreak'))
    check('라이브 칭호 배지 (순위표)', '타자수' in page.inner_text('#rankList'),
          page.inner_text('#rankList'))
    check('라이브 이달의 성경 카드', page.is_visible('#goalCard'))
    page.screenshot(path=os.path.join(SHOTS, 'live_v4_monthly_1280.png'))

    check('라이브 💬 축하 소식 버튼', page.is_visible('#openNews'))
    page.click('#openNews')
    page.wait_for_timeout(500)
    check('라이브 축하 소식 게시판 열림', page.is_visible('#newsOverlay'))
    page.fill('#newsInput', '오늘도 말씀과 함께 🌸')
    page.click('#newsSend')
    page.wait_for_timeout(500)
    check('라이브 한 줄 응원 등록', page.locator('#newsList .news-post').count() == 1,
          page.locator('#newsList .news-post').count())
    page.screenshot(path=os.path.join(SHOTS, 'live_v4_board_1280.png'))
    page.click('#newsClose')
    page.wait_for_timeout(200)

    # 라이브 실시간 모임 (두 브라우저)
    def init_room(name):
        return ("localStorage.setItem('bible-typing-room', JSON.stringify({room:'%s', name:'%s'}));"
                % (ROOM, name))

    ca = browser.new_context(viewport={'width': 1280, 'height': 800})
    ca.add_init_script(init_room('김안숙 권사'))
    cb = browser.new_context(viewport={'width': 390, 'height': 844})
    cb.add_init_script(init_room('사위 백승우'))
    pa, pb = ca.new_page(), cb.new_page()
    attach(pa)
    attach(pb)
    pa.goto(URL, wait_until='networkidle')
    pb.goto(URL, wait_until='networkidle')
    wait_live(pa)
    wait_live(pb)
    type_verses(pa, 2)
    type_verses(pb, 1)
    pa.wait_for_timeout(2500)
    rows = pa.locator('#rankList .rank-row')
    check('라이브 실시간: 두 사람 등수', rows.count() == 2, rows.count())
    check('라이브 실시간: 1위 김안숙 권사 금꽃잎', '김안숙 권사' in rows.nth(0).inner_text()
          and '금꽃잎' in rows.nth(0).inner_text(), rows.nth(0).inner_text())
    check('라이브 실시간: 2위 사위 백승우 은꽃', '사위 백승우' in rows.nth(1).inner_text()
          and '은꽃' in rows.nth(1).inner_text(), rows.nth(1).inner_text())
    pa.screenshot(path=os.path.join(SHOTS, 'live_rank_1280.png'))
    pb.screenshot(path=os.path.join(SHOTS, 'live_rank_390.png'))
    ov = pb.evaluate("() => document.documentElement.scrollWidth - window.innerWidth")
    check('라이브 390px 가로 넘침 없음', ov <= 0, ov)

    # Firebase 저장 확인
    with urllib.request.urlopen(f'{DB}/bible_typing_rooms/{ROOM}.json', timeout=15) as r:
        room = json.loads(r.read().decode() or 'null') or {}
    names = {v.get('name') for v in (room.get('members') or {}).values() if isinstance(v, dict)}
    check('라이브 Firebase 저장 (두 사람)', names == {'김안숙 권사', '사위 백승우'}, names)

    # 라이브 v4: 이달의 성경 진행률 · 월간 완필 상장 (시드로 빠르게 확인)
    SEED_HEAD = """(() => {
        const d = new Date(), p = (n) => String(n).padStart(2, '0');
        const today = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
        const ym = today.slice(0, 7);
        %s
        localStorage.setItem('bible-typing-v1', JSON.stringify(state));
    })();"""

    cs = browser.new_context(viewport={'width': 1280, 'height': 800}, accept_downloads=True)
    cs.add_init_script(SEED_HEAD % """
        const mat = {};
        for (let ch = 1; ch <= 28; ch++) mat[ch] = { v: {}, done: ch <= 12, ts: ch <= 12 ? Date.now() : 0 };
        const state = { v: 1, books: { mat }, days: { [today]: { v: 12, c: 12, ch: 600 } },
            stamps: [], certs: [], monthly: { [ym]: 'mat' }, posts: [],
            last: { code: 'mat', ch: 13, vi: 0 }, settings: { fs: 'md' } };
    """)
    ps = cs.new_page()
    attach(ps)
    ps.goto(URL, wait_until='networkidle')
    ps.wait_for_timeout(1200)
    goal_txt = ps.inner_text('#goalMain').replace('\n', ' / ')
    check('라이브 이달의 성경 진행률 (마태복음 12 / 28장)', '마태복음' in goal_txt and '12 / 28장' in goal_txt,
          goal_txt)
    check('라이브 이달의 성경 진행 막대', ps.locator('#goalCard .goal-bar span').count() == 1)
    ps.screenshot(path=os.path.join(SHOTS, 'live_v4_monthly_goal_1280.png'))
    cs.close()

    cs2 = browser.new_context(viewport={'width': 1280, 'height': 800}, accept_downloads=True)
    cs2.add_init_script(SEED_HEAD % """
        const v = {}; for (let i = 0; i < 12; i++) v[i] = Date.now();
        const state = { v: 1, books: { '2jn': { '1': { v, done: false, ts: 0 } } },
            days: { [today]: { v: 12, c: 0, ch: 100 } }, stamps: [], certs: [],
            monthly: { [ym]: '2jn' }, posts: [],
            last: { code: '2jn', ch: 1, vi: 12 }, settings: { fs: 'md' } };
    """)
    ps2 = cs2.new_page()
    attach(ps2)
    ps2.goto(URL, wait_until='networkidle')
    ps2.wait_for_timeout(1000)
    t = ps2.inner_text('#verseText')
    ps2.fill('#typeInput', letters(t))
    ps2.wait_for_timeout(1300)
    try:
        ps2.wait_for_function("() => !document.querySelector('#certOverlay').hidden", timeout=10000)
        check('라이브 이달의 성경 완필 상장 자동 발급',
              '이 달 의 성 경 상 장' in ps2.inner_text('#certTitle'), ps2.inner_text('#certTitle'))
        check('라이브 월간 상장 문구', '이달의 성경 [요한이서] 전 1장을' in ps2.inner_text('#certBody').replace('\n', ' '),
              ps2.inner_text('#certBody'))
        ps2.wait_for_timeout(900)   # 상장 카드 애니메이션이 끝난 뒤 촬영
        ps2.screenshot(path=os.path.join(SHOTS, 'live_v4_month_cert_1280.png'))
        with ps2.expect_download(timeout=25000) as d2:
            ps2.click('#certPng')
        check('라이브 월간 상장 PNG 저장', os.path.getsize(d2.value.path()) > 40000)
    except Exception as e:
        check('라이브 이달의 성경 완필 상장 자동 발급', False, e)
    cs2.close()

    check('라이브 콘솔 오류 0건', len(errs) == 0, errs[:5])
    browser.close()

req = urllib.request.Request(f'{DB}/bible_typing_rooms/{ROOM}.json', method='DELETE')
try:
    urllib.request.urlopen(req, timeout=15)
except Exception:
    pass

print()
print(f'총 {len(PASSES) + len(FAILS)}개 — 통과 {len(PASSES)} · 실패 {len(FAILS)}')
if FAILS:
    for f in FAILS:
        print('  -', f)
    raise SystemExit(1)
