"""Turn a decoded frame dump into a scroll-scrub sequence.

The recording spends three quarters of its runtime on almost nothing: a static
folded device at the head, a black slab mid-rotation, and a static unfolded
device at the tail. Sampling it on equal TIME would spend three quarters of the
scroll on 4% of the motion. So frames are resampled on equal CUMULATIVE VISUAL
CHANGE instead, which gives a constant perceptual speed under the thumb and
drops the dead air automatically.
"""
from PIL import Image, ImageChops, ImageFilter
from collections import deque
import glob, os, sys, bisect

SRC   = sys.argv[1]
OUT   = sys.argv[2]
N     = int(sys.argv[3]) if len(sys.argv) > 3 else 56
WIDTH = int(sys.argv[4]) if len(sys.argv) > 4 else 1000
CROP  = (117, 90, 2226, 1776)
QUAL  = int(sys.argv[5]) if len(sys.argv) > 5 else 82

def bg_mask(rgb, tol=246):
    w, h = rgb.size
    px = rgb.load()
    seen = bytearray(w * h)
    q = deque()
    def white(p): return p[0] >= tol and p[1] >= tol and p[2] >= tol
    for x in range(w):
        for y in (0, h - 1):
            i = y * w + x
            if not seen[i] and white(px[x, y]): seen[i] = 1; q.append((x, y))
    for y in range(h):
        for x in (0, w - 1):
            i = y * w + x
            if not seen[i] and white(px[x, y]): seen[i] = 1; q.append((x, y))
    while q:
        x, y = q.popleft()
        for dx, dy in ((1,0),(-1,0),(0,1),(0,-1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < w and 0 <= ny < h:
                i = ny * w + nx
                if not seen[i] and white(px[nx, ny]):
                    seen[i] = 1; q.append((nx, ny))
    return Image.frombytes('L', (w, h), bytes(255 if v else 0 for v in seen))

files = sorted(glob.glob(os.path.join(SRC, 'f-*.png')))
print(f'{len(files)} source frames')

# --- cumulative visual change, measured on the cropped region -----------------
thumbs = [Image.open(f).convert('RGB').crop(CROP).resize((96, 76)) for f in files]
cum = [0.0]
for i in range(1, len(thumbs)):
    d = ImageChops.difference(thumbs[i], thumbs[i - 1])
    px = list(d.getdata())
    cum.append(cum[-1] + sum(sum(p) for p in px) / (len(px) * 3))
total = cum[-1]

# trim the dead head and tail, then take N steps of equal change
lo = bisect.bisect_left(cum, 0.004 * total)
hi = bisect.bisect_left(cum, 0.996 * total)
picks = []
for k in range(N):
    target = cum[lo] + (cum[hi] - cum[lo]) * k / (N - 1)
    picks.append(min(max(bisect.bisect_left(cum, target), lo), hi))
# de-duplicate while keeping the count, so a flat stretch can't stall the scrub
seen_idx, final = set(), []
for p in picks:
    while p in seen_idx and p < hi: p += 1
    seen_idx.add(p); final.append(p)
print(f'trimmed to source frames {lo}..{hi}; picked {len(final)} unique {len(set(final))}')

os.makedirs(OUT, exist_ok=True)
for f in glob.glob(os.path.join(OUT, '*.webp')): os.remove(f)

h = None
bytes_total = 0
for k, idx in enumerate(final):
    im = Image.open(files[idx]).convert('RGB').crop(CROP)
    if h is None: h = round(WIDTH * im.height / im.width)
    im = im.resize((WIDTH, h), Image.LANCZOS)
    alpha = bg_mask(im).point(lambda v: 255 - v)
    alpha = alpha.filter(ImageFilter.GaussianBlur(0.8)).point(
        lambda v: 0 if v < 110 else min(255, int((v - 110) * 255 / 110)))
    out = im.convert('RGBA'); out.putalpha(alpha)
    path = os.path.join(OUT, 'unfold-%02d.webp' % k)
    out.save(path, 'WEBP', quality=QUAL, method=6)
    bytes_total += os.path.getsize(path)
print(f'wrote {len(final)} frames at {WIDTH}x{h}, {bytes_total/1024:.0f} KB total, '
      f'{bytes_total/len(final)/1024:.1f} KB each')
