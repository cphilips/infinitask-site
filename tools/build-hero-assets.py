"""Build the device frames and screenshots for the start-screen carousel.

    python3 tools/build-hero-assets.py

Run from the Website folder. Writes into img/frames and img/shots.

FRAMES. The folded Duo and the iPad Pro (M5) 13" are Apple's official bezels,
which Craig supplied on 15 November 2026. The originals live OUTSIDE the site,
in App Store Screenshots/Bezels, so the full-size files are not published.
From each this writes a web copy for the upright device and a turned copy
for landscape:

- Folded Duo, landscape: turned clockwise, so the camera ends up bottom
  right, as in Craig's mock.
- iPad landscape: turned anticlockwise, so the camera (on the right-hand
  edge when upright) runs along the top.

Turning a frame swaps the axes of every rectangle in it, so the CSS for the
landscape frames (--fw, --bx ... --sr in site.css) follows from the upright
measurements, see the comments below. Both bezels' screens match the
captures they hold: 957 x 1392 against the cover screen's 1398 x 2034, and
1316 x 1757 against the iPad's 2064 x 2752, each within 0.3%.

The opened Duo and the iPhone use the site's existing frames (duo.webp and
iphone.webp). The iPhone one is the same artwork as Apple's official bezel.

SCREENSHOTS are resized copies of Craig's captures; SOURCES says where each
one came from. The Desktop ones were taken on 15 November 2026 for this.
"""

import os
import shutil
from PIL import Image, ImageDraw

HOME = os.path.expanduser('~')
SHOTS = os.path.join(HOME, 'Developer/InfiniTask/App Store Screenshots')
BEZELS = os.path.join(SHOTS, 'Bezels')
DESK = os.path.join(HOME, 'Desktop')
HERO = os.path.join(SHOTS, 'Website Hero')     # Craig's 920 x 2000 exports for the site

# out name -> (source, output width, crop box or None)
SOURCES = {
    '50-hero-duo-folded.webp':
        (DESK + '/Screenshot iPhone Duo 15-11-2026 at 10.06.29.png', 900, None),
    '51-hero-duo-folded-land.webp':
        (DESK + '/Screenshot iPhone Duo 15-11-2026 at 10.33.23.png', 1300, None),
    # The iPhone card's four, chosen by Craig (2026-11-15).
    '52-hero-iphone-projects.webp':
        (HERO + '/iPhone - Projects (Light).webp', 920, None),
    '53-hero-iphone-notebooks.webp':
        (HERO + '/iPhone - Notebooks (Moon Grey).webp', 920, None),
    '54-hero-iphone-journal.webp':
        (HERO + '/iPhone - Travel Journal (Light).webp', 920, None),
    '55-hero-iphone-add-things.webp':
        (HERO + '/iPhone - Add Things (Dark).webp', 920, None),
    # Whole: the iPad Pro bezel's screen is 4:3, like the capture.
    '56-hero-ipad-land.webp':
        (DESK + '/Screenshot iPad Pro 13-inch (M5) 15-11-2026 at 10.02.32.png', 2000, None),
}

# The folded Duo's screen is nearly square on the hinge side and round on
# the other, and a square-cornered capture showed past the bezel at the far
# corners (Craig, 2026-11-15). The CSS clips them too, but these captures
# carry the shape themselves, so nothing can poke out whatever the browser
# makes of the CSS. Each is first trimmed to its screen's exact proportions
# (a fraction of a percent), then its corners are cut out.
# name -> (screen w, h as CSS places it, corner radii tl, tr, br, bl), all
# in the bezel's own pixels; scaled to the capture here.
CORNERS = {
    '50-hero-duo-folded.webp':      (965, 1400, (12, 120, 120, 12)),
    '51-hero-duo-folded-land.webp': (1400, 965, (12, 12, 120, 120)),   # turned clockwise
}

# The upright iPad (img/shots/40-start-ipad.webp) is not rebuilt here: it is
# the only upright capture there is, and it was cut to the old, narrower iPad
# frame, so the CSS crops its foot to fit the 4:3 screen. A fresh 2064 x 2752
# capture would fill it whole; add it to SOURCES when there is one.

# out name -> (bezel, turn or None). Measured in the upright bezel, as CSS
# wants them (screen 4px into the bezel, so no hairline shows):
#   folded Duo  canvas 1083 x 1506, body x11 y24 1042 x 1458,
#               screen x59 y53 965 x 1400
#   iPad Pro    canvas 1470 x 1915, body x19 y22 1432 x 1871,
#               screen x73 y75 1324 x 1765
# Clockwise, a rect (x, y, w, h) lands at (H - y - h, x, h, w); anticlockwise
# at (y, W - x - w, h, w), W and H being the upright canvas.
FRAMES = {
    'duo-folded.webp':      ('iPhone Duo - folded.png', None),
    'duo-folded-land.webp': ('iPhone Duo - folded.png', Image.ROTATE_270),   # clockwise
    'ipad-pro.webp':        ('iPad Pro (M5) 13in - Space Black.png', None),
    'ipad-pro-land.webp':   ('iPad Pro (M5) 13in - Space Black.png', Image.ROTATE_90),  # anticlockwise
}


def frames():
    for name, (src, turn) in FRAMES.items():
        im = Image.open(os.path.join(BEZELS, src)).convert('RGBA')
        if turn is not None:
            im = im.transpose(turn)
        im.save('img/frames/' + name, 'WEBP', quality=92, alpha_quality=100, method=6)
        print('frame  %-22s %dx%d  from %s' % (name, im.size[0], im.size[1], src))


def round_corners(im, radii):
    """Cut the corners out of an image, supersampled for a clean edge."""
    w, h = im.size
    k = 4
    mask = Image.new('L', (w * k, h * k), 255)
    d = ImageDraw.Draw(mask)
    corners = [(0, 0, 1, 1), (w * k, 0, -1, 1), (w * k, h * k, -1, -1), (0, h * k, 1, -1)]
    for (cx, cy, sx, sy), r in zip(corners, radii):
        r = round(r * k)
        if r <= 0:
            continue
        box = [min(cx, cx + sx * r), min(cy, cy + sy * r), max(cx, cx + sx * r) - 1, max(cy, cy + sy * r) - 1]
        d.rectangle(box, fill=0)
        ox, oy = cx + sx * r, cy + sy * r
        d.ellipse([ox - r, oy - r, ox + r - 1, oy + r - 1], fill=255)
    im = im.convert('RGBA')
    im.putalpha(mask.resize((w, h), Image.LANCZOS))
    return im


def shots():
    for name, (src, width, crop) in SOURCES.items():
        im = Image.open(src).convert('RGB')
        # Already a web file at the right size: copy it rather than
        # re-encode, which would only lose quality.
        if src.endswith('.webp') and im.size[0] == width and not crop and name not in CORNERS:
            shutil.copyfile(src, 'img/shots/' + name)
            print('shot   %-30s %dx%d  copied from %s' % (name, im.size[0], im.size[1], os.path.basename(src)))
            continue
        if crop:
            im = im.crop(crop)
        if name in CORNERS:
            # Trim to the screen's proportions the way CSS cover + top would:
            # from the foot if too tall, evenly off the sides if too wide.
            sw, sh, radii = CORNERS[name]
            w, h = im.size
            if w / h < sw / sh:
                im = im.crop((0, 0, w, round(w * sh / sw)))
            else:
                nw = round(h * sw / sh)
                im = im.crop(((w - nw) // 2, 0, (w - nw) // 2 + nw, h))
        height = round(im.size[1] * width / im.size[0])
        im = im.resize((width, height), Image.LANCZOS)
        if name in CORNERS:
            sw, sh, radii = CORNERS[name]
            im = round_corners(im, [r * width / sw for r in radii])
        im.save('img/shots/' + name, 'WEBP', quality=84, alpha_quality=100, method=6)
        print('shot   %-30s %dx%d  from %s%s' % (name, width, height, os.path.basename(src),
                                                  '  (corners cut)' if name in CORNERS else ''))


if __name__ == '__main__':
    frames()
    shots()
