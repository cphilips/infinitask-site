"""Rewrite the status-bar clock in a screenshot to Apple's 9:41.

    python3 -c "import sys; sys.path.insert(0,'tools'); \
      from importlib import import_module; \
      m=__import__('set-status-time'.replace('-','_'))" 

Simpler: copy set_time() into a throwaway script, or run it as

    python3 tools/set-status-time.py img/shots/*.webp

The clock is baked into the pixels, so this finds it, rebuilds the background
underneath, and redraws the time in SF at the matched size, weight and colour.

Two things it gets right that a naive version does not:

- The text colour is whichever sampled pixel sits FURTHEST from the
  background, not "dark background means light text". The Focus timer is a
  dark teal screen with BLACK text and that assumption washed it out.
- The contrast threshold is relative to the strongest pixel in the region, so
  faint UI behind the clock (the "ALL PROJECTS" heading on the Projects hero)
  is not swallowed into the bounding box and erased along with it.

The background is rebuilt by interpolating each row between the clean pixels
either side of the text. Exact for flat fills and for gradients in either
direction, and a smooth band across a photo backdrop.
"""

from PIL import Image, ImageDraw, ImageFont
import collections

FONT='/System/Library/Fonts/SFNS.ttf'
NEW='09:41'

def load_font(size):
    f=ImageFont.truetype(FONT, size)
    try:
        f.set_variation_by_axes([100, min(96,max(17,size)), 400, 590])  # Width, OpticalSize, GRAD, Weight
    except Exception:
        pass
    return f

def find_time(im):
    w,h=im.size; px=im.load()
    x0,x1=int(w*0.06), int(w*0.40)
    y0,y1=int(h*0.024), int(h*0.052)
    bg=collections.Counter(px[x,y] for y in range(y0,y1) for x in range(x0,x1)).most_common(1)[0][0]
    diffs=[(abs(px[x,y][0]-bg[0])+abs(px[x,y][1]-bg[1])+abs(px[x,y][2]-bg[2]), x, y)
           for y in range(y0,y1) for x in range(x0,x1)]
    mx=max(d[0] for d in diffs)
    thr=max(150, mx*0.60)                      # excludes faint UI text behind the clock
    pts=[(x,y) for d,x,y in diffs if d>=thr]
    if len(pts)<40: return None
    xs=[p[0] for p in pts]; ys=[p[1] for p in pts]
    # The text colour is whichever sampled pixel is FURTHEST from the
    # background, not "dark bg means light text": the Focus timer is a dark
    # teal screen with BLACK text, and that assumption washed it out.
    cols=[px[x,y] for x,y in pts]
    dist=[abs(c[0]-bg[0])+abs(c[1]-bg[1])+abs(c[2]-bg[2]) for c in cols]
    fg=cols[dist.index(max(dist))]
    return (min(xs),min(ys),max(xs)+1,max(ys)+1), bg, fg

def erase(im, box, pad=3):
    """Rebuild the background by interpolating each row between the clean
    pixels either side of the text. Exact for flat fills and for gradients in
    either direction; a smooth band across a photo."""
    px=im.load(); x0,y0,x1,y1=box
    L,R = x0-pad, x1+pad
    for y in range(y0-pad, y1+pad):
        a=px[L,y]; b=px[R,y]
        span=R-L
        for x in range(L+1, R):
            t=(x-L)/span
            px[x,y]=tuple(round(a[k]+(b[k]-a[k])*t) for k in range(3))

def set_time(path, out=None, dry=False):
    im=Image.open(path).convert('RGB')
    found=find_time(im)
    if not found: return None
    box,bg,fg=found
    x0,y0,x1,y1=box
    target_h=y1-y0
    # size the font so the rendered digits match the original cap height
    size=target_h
    for _ in range(24):
        f=load_font(size)
        bb=f.getbbox(NEW)
        hh=bb[3]-bb[1]
        if abs(hh-target_h)<=0.5: break
        size = size * target_h / max(1,hh)
    f=load_font(round(size))
    bb=f.getbbox(NEW)
    if not dry:
        erase(im, box)
        d=ImageDraw.Draw(im)
        cx=(x0+x1)/2; cy=(y0+y1)/2
        d.text((cx-(bb[2]+bb[0])/2, cy-(bb[3]+bb[1])/2), NEW, font=f, fill=fg)
        im.save(out or path, 'WEBP', quality=92, method=6)
    return dict(box=box, bg=bg, fg=fg, size=round(size), rendered=(bb[2]-bb[0], bb[3]-bb[1]))


if __name__ == '__main__':
    import sys
    for path in sys.argv[1:]:
        r = set_time(path)
        print('%-40s %s' % (path, r or 'no clock found'))
