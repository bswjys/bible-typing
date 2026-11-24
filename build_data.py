#!/usr/bin/env python3
"""개역개정 성경 JSON(GAE_*.json)을 권별 data 파일로 나눕니다.

입력: downloads/jangsin_bible/bible_src/GAE_{code}.json  ({장: {절: 본문}})
출력: work/bible-typing/data/{code}.json  (장 index 순서의 배열)
      work/bible-typing/data/index.json   (66권 목록 + 장/절 수)
"""
import json, os, glob, datetime

SRC = os.path.join(os.path.dirname(__file__), '..', '..', 'downloads', 'jangsin_bible', 'bible_src')
OUT = os.path.join(os.path.dirname(__file__), 'data')

# (코드, 한글 이름, 짧은 이름, 약자)
BOOKS = [
    ('gen', '창세기', '창'), ('exo', '출애굽기', '출'), ('lev', '레위기', '레'), ('num', '민수기', '민'),
    ('deu', '신명기', '신'), ('jos', '여호수아', '수'), ('jdg', '사사기', '삿'), ('rut', '룻기', '룻'),
    ('1sa', '사무엘상', '삼상'), ('2sa', '사무엘하', '삼하'), ('1ki', '열왕기상', '왕상'), ('2ki', '열왕기하', '왕하'),
    ('1ch', '역대상', '대상'), ('2ch', '역대하', '대하'), ('ezr', '에스라', '스'), ('neh', '느헤미야', '느'),
    ('est', '에스더', '에'), ('job', '욥기', '욥'), ('psa', '시편', '시'), ('pro', '잠언', '잠'),
    ('ecc', '전도서', '전'), ('sng', '아가', '아'), ('isa', '이사야', '사'), ('jer', '예레미야', '렘'),
    ('lam', '예레미야애가', '애'), ('ezk', '에스겔', '겔'), ('dan', '다니엘', '단'), ('hos', '호세아', '호'),
    ('jol', '요엘', '욜'), ('amo', '아모스', '암'), ('oba', '오바댜', '옵'), ('jnh', '요나', '욘'),
    ('mic', '미가', '미'), ('nam', '나훔', '나'), ('hab', '하박국', '합'), ('zep', '스바냐', '습'),
    ('hag', '학개', '학'), ('zec', '스가랴', '슥'), ('mal', '말라기', '말'),
    ('mat', '마태복음', '마'), ('mrk', '마가복음', '막'), ('luk', '누가복음', '눅'), ('jhn', '요한복음', '요'),
    ('act', '사도행전', '행'), ('rom', '로마서', '롬'), ('1co', '고린도전서', '고전'), ('2co', '고린도후서', '고후'),
    ('gal', '갈라디아서', '갈'), ('eph', '에베소서', '엡'), ('php', '빌립보서', '빌'), ('col', '골로새서', '골'),
    ('1th', '데살로니가전서', '살전'), ('2th', '데살로니가후서', '살후'), ('1ti', '디모데전서', '딤전'), ('2ti', '디모데후서', '딤후'),
    ('tit', '디도서', '딛'), ('phm', '빌레몬서', '몬'), ('heb', '히브리서', '히'), ('jas', '야고보서', '약'),
    ('1pe', '베드로전서', '벧전'), ('2pe', '베드로후서', '벧후'), ('1jn', '요한일서', '요일'), ('2jn', '요한이서', '요이'),
    ('3jn', '요한삼서', '요삼'), ('jud', '유다서', '유'), ('rev', '요한계시록', '계'),
]

# 장 수 검증용 (성경 표준)
EXPECT_CH = {
    'gen': 50, 'exo': 40, 'lev': 27, 'num': 36, 'deu': 34, 'jos': 24, 'jdg': 21, 'rut': 4,
    '1sa': 31, '2sa': 24, '1ki': 22, '2ki': 25, '1ch': 29, '2ch': 36, 'ezr': 10, 'neh': 13,
    'est': 10, 'job': 42, 'psa': 150, 'pro': 31, 'ecc': 12, 'sng': 8, 'isa': 66, 'jer': 52,
    'lam': 5, 'ezk': 48, 'dan': 12, 'hos': 14, 'jol': 3, 'amo': 9, 'oba': 1, 'jnh': 4,
    'mic': 7, 'nam': 3, 'hab': 3, 'zep': 3, 'hag': 2, 'zec': 14, 'mal': 4,
    'mat': 28, 'mrk': 16, 'luk': 24, 'jhn': 21, 'act': 28, 'rom': 16, '1co': 16, '2co': 13,
    'gal': 6, 'eph': 6, 'php': 4, 'col': 4, '1th': 5, '2th': 3, '1ti': 6, '2ti': 4,
    'tit': 3, 'phm': 1, 'heb': 13, 'jas': 5, '1pe': 5, '2pe': 3, '1jn': 5, '2jn': 1,
    '3jn': 1, 'jud': 1, 'rev': 22,
}

def main():
    os.makedirs(OUT, exist_ok=True)
    index = {'version': 1, 'translation': '개역개정 (GAE)',
             'generated': datetime.date.today().isoformat(), 'books': []}
    total_ch = total_v = 0
    problems = []
    for i, (code, name, short) in enumerate(BOOKS):
        path = os.path.join(SRC, f'GAE_{code}.json')
        with open(path, encoding='utf-8') as f:
            raw = json.load(f)
        ch_keys = sorted(raw, key=lambda k: int(k))
        chapters = []
        for k in ch_keys:
            verses_raw = raw[k]
            vkeys = sorted(verses_raw, key=lambda x: int(x))
            verses = [verses_raw[v].strip() for v in vkeys]
            if not verses or any(not v for v in verses):
                problems.append(f'{code} {k}: 빈 절')
            chapters.append(verses)
        expect = EXPECT_CH[code]
        if len(chapters) != expect:
            problems.append(f'{code}: 장 수 {len(chapters)} != {expect}')
        n_v = sum(len(c) for c in chapters)
        total_ch += len(chapters); total_v += n_v
        payload = {'code': code, 'name': name, 'short': short,
                   'testament': 'old' if i < 39 else 'new', 'order': i + 1,
                   'chapters': chapters}
        with open(os.path.join(OUT, f'{code}.json'), 'w', encoding='utf-8') as f:
            json.dump(payload, f, ensure_ascii=False, separators=(',', ':'))
        index['books'].append({'code': code, 'name': name, 'short': short,
                               'testament': 'old' if i < 39 else 'new', 'order': i + 1,
                               'chapters': len(chapters), 'verses': n_v})
    index['chapterCount'] = total_ch
    index['verseCount'] = total_v
    with open(os.path.join(OUT, 'index.json'), 'w', encoding='utf-8') as f:
        json.dump(index, f, ensure_ascii=False, separators=(',', ':'))
    print(f'books={len(BOOKS)} chapters={total_ch} verses={total_v}')
    print('problems:', problems or 'none')

if __name__ == '__main__':
    main()
