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

    for asset in ['', 'index.html', 'app.js?v=3', 'styles.css?v=3', 'sw.js', 'data/index.json']:
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
    check('라이브 sw v3 등록', page.evaluate(
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
