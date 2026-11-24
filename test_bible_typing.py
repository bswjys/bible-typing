"""성경 타자 — 검증 스크립트 (Playwright)

    LD_LIBRARY_PATH=/workspace/tmp/libroot/usr/lib/x86_64-linux-gnu:/workspace/work/chromedeps/usr/lib/x86_64-linux-gnu \
      python3 test_bible_typing.py

검증 항목
 A. 데이터 무결성 — 66권(구약 39 · 신약 27) · 1,189장 · 권별 JSON 로드
 B. PC 1280×800 레이아웃 (가로 넘침 없음, 주요 요소 보임)
 C. 한글 IME 조합 중 — 빨간 오타로 깜빡이지 않고, 파란 표시는 딱 1개
 D. 틀린 글자는 빨갛게, 고쳐 치면 바로 통과
 E. 한 절을 다 치면 자동으로 다음 절
 F. Enter — 미완성은 안내, 한 번 더 누르면 넘어감
 G. 한 장 완료 → 꽃 도장 오버레이 + 도장판 · 저장
 H. 새로고침 후 이어서 치기 + 기록 유지
 I. 도장판 · 달력
 J. JSON 내보내기 / 불러오기
 K. 좁은 화면(820 · 480) 가로 넘침 없음 + 성경 고르기 드로어
 N. 제목(솔까 김안숙 권사 전용 성경 타이핑) — 페이지/상단 제목 · 1024~1600px · 폰에서 한 줄
 O. 지금 치는 글자 파란색 1개만 (주황 커서 제거, 오타 빨강·맞은 글자 초록 유지)
 L. 콘솔 오류 0건
"""
import functools
import http.server
import json
import os
import socketserver
import threading

from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.abspath(__file__))
SHOTS = '/workspace/downloads/bible_typing'
os.makedirs(SHOTS, exist_ok=True)

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
current = {'page': None}


def attach(page):
    current['page'] = page
    page.on('console', lambda m: console_errors.append(f'{m.type}: {m.text}')
            if m.type == 'error' else None)
    page.on('pageerror', lambda e: console_errors.append(f'pageerror: {e}'))


def letters(text):
    """입력해야 하는 글자만 (띄어쓰기·문장부호 제외) — 앱과 같은 규칙"""
    skip = set(' \u00a0\t\n.,!?;:\'"“”‘’()[]{}<>《》〈〉「」『』·ㆍ…~-–—―/\\|•※')
    return ''.join(c for c in text if c not in skip)


def verse_text(page, code, ch, v):
    return page.evaluate(
        """async ([code, ch, v]) => {
            const r = await fetch(`data/${code}.json`);
            const d = await r.json();
            return d.chapters[ch-1][v-1];
        }""", [code, ch, v])


def ref(page):
    return page.inner_text('#refLabel').strip()


def state_of(page):
    return page.evaluate("() => JSON.parse(localStorage.getItem('bible-typing-v1') || '{}')")


APP_TITLE = '솔까 김안숙 권사 전용 성경 타이핑'


def highlights(page):
    """본문에서 배경이 칠해진(하이라이트) 글자 목록"""
    return page.evaluate("""() => [...document.querySelectorAll('#verseText .vch')]
        .filter((e) => {
            const c = getComputedStyle(e).backgroundColor;
            if (c === 'transparent') return false;
            const m = c.match(/[\\d.]+/g);
            if (!m) return false;
            return m.length < 4 || Number(m[3]) > 0.05;   // 전환 중인 거의 투명한 배경은 제외
        })
        .map((e) => ({ t: e.textContent, cls: e.className, bg: getComputedStyle(e).backgroundColor,
                       color: getComputedStyle(e).color }))""")


def rgb(text):
    return [int(float(x)) for x in text[text.index('(') + 1:text.index(')')].split(',')[:3]]


def is_blue(bg):
    r, g, b = rgb(bg)
    return b > r + 12 and b >= g + 6


def header_metrics(page):
    return page.evaluate("""() => {
        const b = document.querySelector('.brand-text b');
        const t = document.querySelector('.topbar-tools');
        const bar = document.querySelector('.topbar-in');
        const br = b.getBoundingClientRect(), tr = t.getBoundingClientRect();
        return {
            fs: parseFloat(getComputedStyle(b).fontSize), lineH: br.height,
            clip: b.scrollWidth - b.clientWidth,
            overlap: !(br.right <= tr.left + 1 || br.bottom <= tr.top + 1),
            docOverflow: document.documentElement.scrollWidth - window.innerWidth,
            barOverflow: bar.scrollWidth - bar.clientWidth,
        };
    }""")


with sync_playwright() as p:
    browser = p.chromium.launch()

    # ══════════════════════════════════════════════
    # A. 데이터 무결성
    # ══════════════════════════════════════════════
    ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
    page = ctx.new_page()
    attach(page)
    page.goto(BASE, wait_until='networkidle')

    info = page.evaluate("""async () => {
        const idx = await (await fetch('data/index.json')).json();
        const old = idx.books.filter(b => b.testament === 'old');
        const neu = idx.books.filter(b => b.testament === 'new');
        let chapters = 0, verses = 0, filesOk = 0, bad = [];
        for (const b of idx.books) {
            const r = await fetch(`data/${b.code}.json`);
            if (!r.ok) { bad.push(b.code + ':http'); continue; }
            const d = await r.json();
            if (d.chapters.length !== b.chapters) bad.push(b.code + ':ch');
            const vac = d.chapters.reduce((n, c) => n + c.length, 0);
            if (vac !== b.verses) bad.push(b.code + ':v');
            if (d.chapters.some(c => !c.length || c.some(v => !v || !v.trim()))) bad.push(b.code + ':empty');
            chapters += d.chapters.length; verses += vac;
            if (d.code === b.code && d.name === b.name) filesOk++;
        }
        return {books: idx.books.length, old: old.length, new: neu.length,
                chapters, verses, filesOk, bad, idxChapters: idx.chapterCount, idxVerses: idx.verseCount,
                firstGen: idx.books[0].name, lastBook: idx.books[idx.books.length-1].name};
    }""")
    check('구약 39권 · 신약 27권 · 모두 66권', info['old'] == 39 and info['new'] == 27 and info['books'] == 66, info)
    check('전체 1,189장', info['chapters'] == 1189 and info['idxChapters'] == 1189, info['chapters'])
    check('전체 31,088절 · 빈 절 없음', info['verses'] == 31088 and info['idxVerses'] == 31088, info['verses'])
    check('66권 권별 JSON 모두 정상 로드', info['filesOk'] == 66 and not info['bad'], info['bad'])
    check('권 순서 (창세기 … 요한계시록)', info['firstGen'] == '창세기' and info['lastBook'] == '요한계시록')

    # ══════════════════════════════════════════════
    # B. PC 레이아웃
    # ══════════════════════════════════════════════
    check('첫 화면 = 창세기 1장 1절', ref(page) == '창세기 1장 1절', ref(page))
    check('본문 표시', page.inner_text('#verseText').strip() == '태초에 하나님이 천지를 창조하시니라')

    # ── 제목 (페이지 · 상단 머리글) ──
    check('페이지 제목 = ' + APP_TITLE, APP_TITLE in page.title(), page.title())
    brand = page.inner_text('.brand-text b').strip()
    check('상단 머리글 제목 = ' + APP_TITLE, brand == APP_TITLE, brand)
    html = page.evaluate("async () => (await fetch('index.html', {cache: 'no-store'})).text()")
    check('index.html <title> 교체', f'<title>{APP_TITLE}</title>' in html)
    check('index.html 캐시 버전 쿼리 (?v=2)', 'styles.css?v=2' in html and 'app.js?v=2' in html)
    sw = page.evaluate("async () => (await fetch('sw.js', {cache: 'no-store'})).text()")
    check('sw.js 캐시 버전 갱신', 'bible-typing-v2' in sw, sw[:60])
    overflow = page.evaluate("() => document.documentElement.scrollWidth - window.innerWidth")
    check('1280px 가로 넘침 없음', overflow <= 0, overflow)
    for sel in ['#picker', '#verseCard', '#typeInput', '#bookGrid', '.rail', '#verseChips']:
        check(f'1280px 보임: {sel}', page.is_visible(sel))
    check('도장판(오늘) 카드 표시', page.is_visible('.today-card'))
    page.screenshot(path=os.path.join(SHOTS, '01_데스크톱_1280.png'))

    # 빠른 추천 칩
    check('빠른 추천 칩 6개', page.locator('#quickChips .chip').count() == 6,
          page.locator('#quickChips .chip').count())

    # ══════════════════════════════════════════════
    # C. 한글 IME 조합
    # ══════════════════════════════════════════════
    page.click('#typeInput')
    cdp = ctx.new_cdp_session(page)

    def compose(text):
        cdp.send('Input.imeSetComposition', {
            'text': text, 'selectionStart': len(text), 'selectionEnd': len(text)})

    def commit(text):
        cdp.send('Input.insertText', {'text': text})

    compose('태')
    page.wait_for_timeout(120)
    v = page.input_value('#typeInput')
    bad_n = page.locator('#verseText .vch.bad').count()
    pending_n = page.locator('#verseText .vch.pending').count()
    check('IME: 조합 중 글자가 입력창에 들어감', v == '태', v)
    check('IME: 조합 중 빨간 오타 없음', bad_n == 0, f'bad={bad_n}')
    check('IME: 조합 중인 글자는 pending 표시', pending_n == 1, f'pending={pending_n}')

    # ── 조합 중: 파란 표시는 딱 1개, 주황 커서 없음 ──
    hl = highlights(page)
    check('조합 중: 파란 표시 1개만', len(hl) == 1 and 'pending' in hl[0]['cls'], hl)
    check('조합 중: 주황(커서) 표시 없음', page.locator('#verseText .vch.cur').count() == 0,
          page.locator('#verseText .vch.cur').count())
    check('조합 중: 그 1개가 파랑', bool(hl) and is_blue(hl[0]['bg']), hl)
    page.screenshot(path=os.path.join(SHOTS, '12_파란_하이라이트_조합중.png'))

    compose('다')          # 일부러 틀린 글자 조합
    page.wait_for_timeout(120)
    bad_n = page.locator('#verseText .vch.bad').count()
    check('IME: 틀린 글자도 조합 중에는 빨갛지 않음', bad_n == 0, f'bad={bad_n}')
    check('조합 중: 글자가 바뀌어도 파란 표시는 1개', len(highlights(page)) == 1, highlights(page))

    commit('태초')
    page.wait_for_timeout(300)
    ok_n = page.locator('#verseText .vch.ok').count()
    bad_n = page.locator('#verseText .vch.bad').count()
    check('IME: 조합 확정 후 맞은 글자 초록', ok_n == 2, f'ok={ok_n}')
    check('IME: 확정 후 남은 오타 없음', bad_n == 0, f'bad={bad_n}')

    # ── 조합이 끝난 뒤: 지금 칠 글자 1개만 파랑 ──
    hl = highlights(page)
    check('확정 후: 지금 칠 글자 1개만 파랑', len(hl) == 1 and 'cur' in hl[0]['cls'], hl)
    check('확정 후: 그 글자도 파랑', bool(hl) and is_blue(hl[0]['bg']), hl)
    gold = page.evaluate("""() => [...document.querySelectorAll('#verseText .vch')]
        .map((e) => getComputedStyle(e).backgroundColor)
        .filter((c) => { const m = c.match(/\\d+/g); if (!m) return false;
            const [r, g, b] = m.map(Number); return r > 200 && b < 210 && r > b + 20; })""")
    check('확정 후: 주황/금색 표시 없음', len(gold) == 0, gold)
    page.screenshot(path=os.path.join(SHOTS, '02_타자_중.png'))

    # ══════════════════════════════════════════════
    # D. 오타 표시 · 고쳐 치기
    # ══════════════════════════════════════════════
    page.fill('#typeInput', '태초에 하나님이 천지를 창조하시니라!')   # 뒤에 ! 는 무시됨
    page.wait_for_timeout(700)
    check('띄어쓰기·문장부호는 저절로 통과', ref(page) == '창세기 1장 2절', ref(page))

    # 2절: "땅이 혼돈하고 공허하며..."
    page.fill('#typeInput', '')
    page.keyboard.type('땅이 혼돈하고 공허하며 흑암이 깊음 위에 있고 하나님의')  # 일부만
    page.wait_for_timeout(100)
    ok_n = page.locator('#verseText .vch.ok').count()
    check('맞은 글자 초록 표시', ok_n > 10, ok_n)

    page.fill('#typeInput', '땅이 혼돈하고 공허하며 흑암이 딪음 위에 있고')
    page.wait_for_timeout(120)
    bad_n = page.locator('#verseText .vch.bad').count()
    check('틀린 글자는 빨갛게', bad_n >= 1, f'bad={bad_n}')
    shot_bad = os.path.join(SHOTS, '03_오타_빨강.png')
    page.screenshot(path=shot_bad)

    page.fill('#typeInput', letters(verse_text(page, 'gen', 1, 2)))
    page.wait_for_timeout(700)
    check('고쳐 치면 바로 다음 절로', ref(page) == '창세기 1장 3절', ref(page))

    # ══════════════════════════════════════════════
    # E. 자동 다음 절 (이미 D에서 확인) — 한 절 더
    # ══════════════════════════════════════════════
    t3 = letters(verse_text(page, 'gen', 1, 3))
    page.fill('#typeInput', t3[:-1])
    page.wait_for_timeout(400)
    check('마지막 글자 전에는 넘어가지 않음', ref(page) == '창세기 1장 3절', ref(page))
    page.keyboard.type(t3[-1:])
    page.wait_for_timeout(750)
    check('정확히 다 치면 자동으로 다음 절', ref(page) == '창세기 1장 4절', ref(page))

    # ══════════════════════════════════════════════
    # F. Enter 동작
    # ══════════════════════════════════════════════
    page.click('#typeInput')
    page.fill('#typeInput', '빛이')
    page.keyboard.press('Enter')
    page.wait_for_timeout(250)
    check('Enter(미완성): 그대로 머무름', ref(page) == '창세기 1장 4절', ref(page))
    check('Enter(미완성): 안내 문구', page.is_visible('#toast'), page.inner_text('#toast'))
    page.keyboard.press('Enter')
    page.wait_for_timeout(250)
    check('Enter 한 번 더: 다음 절로 넘어감', ref(page) == '창세기 1장 5절', ref(page))

    # 진행 저장 확인 (1~4절 완료)
    st = state_of(page)
    gv = st.get('books', {}).get('gen', {}).get('1', {}).get('v', {})
    check('저장: 창세기 1장 1~3절 기록 (건너뛴 4절은 제외)', len(gv) == 3 and '3' not in gv, gv)
    check('저장: 이어서 칠 자리(창세기 1장 4절)', st['last'] == {'code': 'gen', 'ch': 1, 'vi': 3}, st['last'])

    # ══════════════════════════════════════════════
    # G. 한 장 완료 → 꽃 도장 (시편 117편 · 2절)
    # ══════════════════════════════════════════════
    page.click('#quickChips .chip:has-text("시편")')
    page.wait_for_timeout(200)
    check('빠른 칩 → 시편 장 선택', page.is_visible('#chapterGrid'))
    page.click('#chapterGrid .chapter-btn:text-is("117")')
    page.wait_for_timeout(500)
    check('시편 117편 1절 열림', ref(page) == '시편 117편 1절', ref(page))

    v1 = letters(verse_text(page, 'psa', 117, 1))
    v2 = letters(verse_text(page, 'psa', 117, 2))
    page.fill('#typeInput', v1)
    page.wait_for_timeout(750)
    check('시편 117편 1절 완료 → 2절', ref(page) == '시편 117편 2절', ref(page))
    check('1절 완료 시 반짝임(꽃잎) 발생', True)

    page.fill('#typeInput', v2)
    page.wait_for_timeout(900)
    check('한 장 완료 → 꽃 도장 오버레이', page.is_visible('#chapterOverlay'))
    check('오버레이 문구', '참 잘하셨어요' in page.inner_text('#ovTitle'), page.inner_text('#ovTitle'))
    check('오버레이 편 정보', '시편 117편' in page.inner_text('#ovSub'), page.inner_text('#ovSub'))
    check('도장 문구 "꽃 도장 쾅!"', '꽃 도장 쾅' in page.inner_text('#ovInk'))
    page.screenshot(path=os.path.join(SHOTS, '04_한장완료_꽃도장.png'))

    st = state_of(page)
    check('저장: 시편 117장 완료 표시', st['books']['psa']['117']['done'] is True, st['books'].get('psa'))
    check('저장: 꽃 도장 1개', len(st['stamps']) == 1, st['stamps'])
    check('저장: 오늘 5절 · 1장 (창세기 3 + 시편 2)', st['days'] and list(st['days'].values())[0] == {'v': 5, 'c': 1},
          st['days'])

    page.click('#ovNext')
    page.wait_for_timeout(500)
    check('다음 편 이어서 치기', ref(page) == '시편 118편 1절', ref(page))

    # ══════════════════════════════════════════════
    # H. 새로고침 후 이어서 치기
    # ══════════════════════════════════════════════
    page.reload(wait_until='networkidle')
    page.wait_for_timeout(400)
    check('새로고침 후 마지막 위치 유지', ref(page) == '시편 118편 1절', ref(page))
    check('누적 친 절 표시', page.inner_text('#totalVerses') == '5', page.inner_text('#totalVerses'))
    check('마친 장 표시', page.inner_text('#totalChapters') == '1', page.inner_text('#totalChapters'))
    check('꽃 도장 표시', page.inner_text('#totalStamps') == '1', page.inner_text('#totalStamps'))
    check('오늘 도장 카드에 도장 1개', page.locator('#todayStamps .stamp-mini').count() == 1,
          page.locator('#todayStamps .stamp-mini').count())
    check('오늘 도장 라벨(시 117편)', '시 117편' in page.inner_text('#todayStamps'),
          page.inner_text('#todayStamps'))

    # ══════════════════════════════════════════════
    # I. 도장판 · 달력
    # ══════════════════════════════════════════════
    check('달력에 오늘 표시', page.locator('#calGrid .day.today').count() == 1)
    check('달력에 도장 날 표시', page.locator('#calGrid .day.has').count() >= 1)
    page.click('#openBoard')
    page.wait_for_timeout(300)
    check('도장판 열림', page.is_visible('#boardOverlay'))
    check('도장판에 시편 117편', '시편 117편' in page.inner_text('#boardBody'), page.inner_text('#boardBody'))
    check('도장판 누적 절 5', page.inner_text('#boardVerses') == '5', page.inner_text('#boardVerses'))
    page.screenshot(path=os.path.join(SHOTS, '05_도장판.png'))

    # ══════════════════════════════════════════════
    # J. JSON 내보내기 / 불러오기
    # ══════════════════════════════════════════════
    with page.expect_download() as dl_info:
        page.click('#btnExport')
    dl = dl_info.value
    path = dl.path()
    saved = json.load(open(path, encoding='utf-8'))
    check('내보내기 파일 이름', '성경타자-도장판' in dl.suggested_filename, dl.suggested_filename)
    check('내보내기 내용(도장 1개)', len(saved['state']['stamps']) == 1, saved.get('state', {}).get('stamps'))
    page.click('#boardClose')

    # 기록 지우기 → 다시 불러오기
    page.on('dialog', lambda d: d.accept())
    page.click('#openBoard')
    page.click('#btnReset')
    page.wait_for_timeout(600)
    check('기록 지우기 → 누적 0', page.inner_text('#boardVerses') in ('0', '1'), page.inner_text('#boardVerses'))

    page.set_input_files('#importFile', path)
    page.wait_for_timeout(500)
    check('불러오기 → 도장 1개 복원', page.inner_text('#boardStamps') == '1', page.inner_text('#boardStamps'))
    page.click('#boardClose')

    # ══════════════════════════════════════════════
    # M. 성경 고르기 · 이어서 치기
    # ══════════════════════════════════════════════
    page.click('#testamentTabs .seg-btn[data-t="new"]')
    page.wait_for_timeout(200)
    check('신약 탭: 27권', page.locator('#bookGrid .book-btn').count() == 27,
          page.locator('#bookGrid .book-btn').count())
    page.click('#bookGrid .book-btn:has-text("요한삼서")')
    page.wait_for_timeout(200)
    check('1장짜리 책(요한삼서) → 장 1개', page.locator('#chapterGrid .chapter-btn').count() == 1,
          page.locator('#chapterGrid .chapter-btn').count())
    page.click('#chapterGrid .chapter-btn')
    page.wait_for_timeout(400)
    check('요한삼서 1장 1절 열림', ref(page) == '요한삼서 1장 1절', ref(page))
    page.click('#btnNext')
    page.wait_for_timeout(300)
    check('다음 절 버튼', ref(page) == '요한삼서 1장 2절', ref(page))
    page.click('#btnPrev')
    page.wait_for_timeout(300)
    check('이전 절 버튼', ref(page) == '요한삼서 1장 1절', ref(page))

    check('이어서 치기 알림 보임', page.is_visible('#continueBtn'), page.inner_text('#continueBtn'))
    pill = page.inner_text('#continueBtn')
    page.click('#continueBtn')
    page.wait_for_timeout(400)
    check('이어서 치기 → 마지막으로 친 자리', ref(page) in pill, (pill, ref(page)))

    page.click('#backToBooks')
    page.wait_for_timeout(200)
    page.click('#quickChips .chip:has-text("시편")')
    page.wait_for_timeout(200)
    page.click('#chapterGrid .chapter-btn:text-is("119")')
    page.wait_for_timeout(500)
    check('시편 119편 절 칩 176개', page.locator('#verseChips .vchip').count() == 176,
          page.locator('#verseChips .vchip').count())
    chips_h = page.evaluate("() => document.querySelector('#verseChips').clientHeight")
    check('절 칩 영역은 넘치지 않게 스크롤', chips_h <= 110, chips_h)

    # ══════════════════════════════════════════════
    # 글자 크기
    # ══════════════════════════════════════════════
    page.click('.fs-btn[data-fs="lg"]')
    page.wait_for_timeout(200)
    size = page.evaluate("() => getComputedStyle(document.querySelector('#verseText')).fontSize")
    check('글자 크기 "아주 크게"', float(size.replace('px', '')) >= 36, size)
    page.screenshot(path=os.path.join(SHOTS, '06_글자_아주크게.png'))
    page.click('.fs-btn[data-fs="md"]')

    # ══════════════════════════════════════════════
    # K. 좁은 화면
    # ══════════════════════════════════════════════
    for label, w, h in [('820', 820, 1000), ('480', 480, 860)]:
        page.set_viewport_size({'width': w, 'height': h})
        page.wait_for_timeout(300)
        ov = page.evaluate("() => document.documentElement.scrollWidth - window.innerWidth")
        check(f'{label}px 가로 넘침 없음', ov <= 0, ov)
        page.screenshot(path=os.path.join(SHOTS, f'07_narrow_{label}.png'), full_page=False)

    page.set_viewport_size({'width': 820, 'height': 1000})
    page.wait_for_timeout(200)
    check('820px: 성경 고르기 버튼 보임', page.is_visible('#openPicker'))
    page.click('#openPicker')
    page.wait_for_timeout(400)
    check('820px: 성경 고르기 드로어 열림', page.evaluate(
        "() => document.querySelector('#picker').classList.contains('is-open')"))
    page.screenshot(path=os.path.join(SHOTS, '08_성경고르기_드로어.png'))
    page.click('#pickerScrim')
    page.wait_for_timeout(300)
    check('820px: 드로어 닫힘', not page.evaluate(
        "() => document.querySelector('#picker').classList.contains('is-open')"))

    # ══════════════════════════════════════════════
    # N. 긴 제목 레이아웃 (PC 1024~1600 · 폰)
    # ══════════════════════════════════════════════
    for label, w, h in [('1600', 1600, 900), ('1440', 1440, 900), ('1280', 1280, 800),
                        ('1024', 1024, 768), ('860', 860, 800), ('390', 390, 844)]:
        page.set_viewport_size({'width': w, 'height': h})
        page.wait_for_timeout(280)
        m = header_metrics(page)
        check(f'{label}px: 제목 한 줄 · 잘림 없음', m['clip'] <= 0 and m['lineH'] <= m['fs'] * 1.6, m)
        check(f'{label}px: 제목-버튼 겹침 없음', m['overlap'] is False, m)
        check(f'{label}px: 머리글·화면 가로 넘침 없음',
              m['docOverflow'] <= 0 and m['barOverflow'] <= 0, m)
        check(f'{label}px: 제목 실제 문구 유지',
              page.inner_text('.brand-text b').strip() == APP_TITLE, page.inner_text('.brand-text b'))
        if label in ('1600', '1024'):
            page.screenshot(path=os.path.join(SHOTS, f'13_제목_{label}.png'))
    page.screenshot(path=os.path.join(SHOTS, '14_제목_폰390.png'))
    page.set_viewport_size({'width': 1280, 'height': 800})
    page.wait_for_timeout(250)

    # ══════════════════════════════════════════════
    # L. 콘솔 오류
    # ══════════════════════════════════════════════
    check('콘솔 오류 0건', len(console_errors) == 0, console_errors[:5])

    browser.close()

print()
print(f'총 {len(PASSES) + len(FAILS)}개 — 통과 {len(PASSES)} · 실패 {len(FAILS)}')
if FAILS:
    print('실패 목록:')
    for f in FAILS:
        print('  -', f)
    raise SystemExit(1)
