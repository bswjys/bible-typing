#!/usr/bin/env python3
"""성경 타자 앱 아이콘(🌸)을 만듭니다."""
import math, os
from PIL import Image, ImageDraw

OUT = os.path.dirname(os.path.abspath(__file__))
S = 1024

CREAM = (251, 245, 233, 255)
PINK = (232, 148, 173, 255)
PINK_D = (214, 118, 148, 255)
GOLD = (240, 196, 108, 255)
GOLD_D = (226, 175, 82, 255)


def draw_flower(size, full_bleed=False):
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    if full_bleed:
        d.rectangle([0, 0, size, size], fill=CREAM)
    else:
        r = int(size * 0.22)
        d.rounded_rectangle([0, 0, size - 1, size - 1], radius=r, fill=CREAM)
        # 은은한 테두리
        d.rounded_rectangle([1, 1, size - 2, size - 2], radius=r, outline=(238, 222, 198, 255), width=max(2, size // 220))

    cx = cy = size / 2
    petal_long = size * 0.255
    petal_short = size * 0.165
    ring = size * 0.145

    for i in range(5):
        a = -math.pi / 2 + i * 2 * math.pi / 5
        px = cx + math.cos(a) * ring
        py = cy + math.sin(a) * ring
        box = [px - petal_long, py - petal_short, px + petal_long, py + petal_short]
        petal = Image.new('RGBA', (size, size), (0, 0, 0, 0))
        pd = ImageDraw.Draw(petal)
        pd.ellipse(box, fill=PINK_D)
        pd.ellipse([box[0] + size * 0.012, box[1] + size * 0.012,
                    box[2] - size * 0.012, box[3] - size * 0.012], fill=PINK)
        petal = petal.rotate(-math.degrees(a), center=(cx, cy), resample=Image.BICUBIC)
        img = Image.alpha_composite(img, petal)
        d = ImageDraw.Draw(img)

    # 꽃 가운데
    cr = size * 0.105
    d.ellipse([cx - cr, cy - cr, cx + cr, cy + cr], fill=GOLD_D)
    cr2 = size * 0.082
    d.ellipse([cx - cr2, cy - cr2, cx + cr2, cy + cr2], fill=GOLD)
    # 씨앗 점
    for i in range(6):
        a = i * math.pi / 3 + 0.3
        rr = size * 0.042
        px = cx + math.cos(a) * rr
        py = cy + math.sin(a) * rr
        s = size * 0.012
        d.ellipse([px - s, py - s, px + s, py + s], fill=(255, 246, 220, 235))
    return img


def save(img, size, name, full_bleed=False):
    resized = img.resize((size, size), Image.LANCZOS)
    resized.save(os.path.join(OUT, name))
    print('wrote', name, size)


if __name__ == '__main__':
    base = draw_flower(S, full_bleed=False)
    save(base, 1024, 'icon-1024.png')
    save(base, 512, 'icon-512.png')
    save(base, 192, 'icon-192.png')
    save(base, 180, 'icon-180.png')
    mask = draw_flower(S, full_bleed=True)
    save(mask, 512, 'icon-maskable-512.png')
