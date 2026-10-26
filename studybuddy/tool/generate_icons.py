"""Draws the app icon in every size Android, the web and Google Play need.

The mark is the Material "school" glyph (Apache-2.0, bundled with Flutter)
in gold on the emerald brand colour, the same logo the app shows in-app.

    python3 tool/generate_icons.py
"""
import pathlib

from PIL import Image, ImageDraw, ImageFont

ROOT = pathlib.Path(__file__).resolve().parent.parent
FONT = pathlib.Path('/opt/sdk/flutter/bin/cache/artifacts/material_fonts/MaterialIcons-Regular.otf')
GLYPH = chr(0xF012E)  # Icons.school_rounded
EMERALD = (0, 135, 81)
EMERALD_DARK = (0, 92, 55)
GOLD = (255, 199, 44)


def gradient(size):
    """Diagonal emerald gradient, lighter at the top-left."""
    img = Image.new('RGB', (size, size))
    px = img.load()
    for y in range(size):
        for x in range(size):
            t = (x + y) / (2 * (size - 1))
            px[x, y] = tuple(round(a + (b - a) * t) for a, b in zip(EMERALD, EMERALD_DARK))
    return img


def glyph(size, scale, color):
    """The cap centred on a transparent square, `scale` of its width."""
    layer = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    font = ImageFont.truetype(str(FONT), round(size * scale))
    draw = ImageDraw.Draw(layer)
    l, t, r, b = draw.textbbox((0, 0), GLYPH, font=font)
    draw.text(((size - (r - l)) / 2 - l, (size - (b - t)) / 2 - t), GLYPH, font=font, fill=color)
    return layer


def square_icon(size, scale=0.62, radius=0.0):
    """Gradient square with the gold cap; rounded when radius > 0."""
    big = size * 4  # supersample for smooth edges
    img = gradient(big).convert('RGBA')
    img.alpha_composite(glyph(big, scale, GOLD + (255,)))
    if radius:
        mask = Image.new('L', (big, big), 0)
        ImageDraw.Draw(mask).rounded_rectangle((0, 0, big - 1, big - 1), round(big * radius), fill=255)
        img.putalpha(mask)
    return img.resize((size, size), Image.LANCZOS)


def save(img, rel):
    path = ROOT / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(path, optimize=True)


def main():
    res = 'android/app/src/main/res'
    densities = {'mdpi': 1, 'hdpi': 1.5, 'xhdpi': 2, 'xxhdpi': 3, 'xxxhdpi': 4}
    for name, k in densities.items():
        # Legacy icon (Android 7.x): rounded square, 48dp.
        save(square_icon(round(48 * k), radius=0.22), f'{res}/mipmap-{name}/ic_launcher.png')
        # Adaptive layers, 108dp; the cap stays inside the 66dp safe zone.
        fg = glyph(round(108 * k) * 4, 0.46, GOLD + (255,)).resize((round(108 * k),) * 2, Image.LANCZOS)
        save(fg, f'{res}/mipmap-{name}/ic_launcher_foreground.png')
        mono = glyph(round(108 * k) * 4, 0.46, (255, 255, 255, 255)).resize((round(108 * k),) * 2, Image.LANCZOS)
        save(mono, f'{res}/mipmap-{name}/ic_launcher_monochrome.png')

    # Google Play: a full-bleed square, Play applies its own rounded mask.
    save(square_icon(512).convert('RGB'), 'store/icon-512.png')

    # Web (PWA) icons; maskable ones keep the cap inside the centre circle.
    save(square_icon(192, radius=0.22), 'web/icons/Icon-192.png')
    save(square_icon(512, radius=0.22), 'web/icons/Icon-512.png')
    save(square_icon(192, scale=0.48).convert('RGB'), 'web/icons/Icon-maskable-192.png')
    save(square_icon(512, scale=0.48).convert('RGB'), 'web/icons/Icon-maskable-512.png')
    save(square_icon(32, radius=0.22), 'web/favicon.png')
    print('icons written')


if __name__ == '__main__':
    main()
