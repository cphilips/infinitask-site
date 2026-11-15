# Rebuilding the device unfold sequence

The "Room to spread out" section scrubs a frame sequence, not a `<video>`.
Seeking a video with `currentTime` is async and stutters unless every frame is
a keyframe, which we cannot re-encode for here (no ffmpeg on the machine).

Two steps, both using only what ships with macOS and Xcode.

## 1. Decode every frame

```bash
xcrun swift tools/decode-frames.swift "/path/to/recording.mov" /tmp/frames 4000
```

Walks the file with `AVAssetReader` (not `AVAssetImageGenerator`, which returns
black frames on these recordings) and writes `f-0000.png` upward at up to the
given width.

## 2. Resample, key and export

```bash
python3 tools/build-unfold.py /tmp/frames img/unfold 56 1000 82
```

Two things happen here that matter:

**Resampling on visual change, not time.** The source recording spends about
three quarters of its runtime on roughly 4% of the motion: a static folded
device at the head, a near-static black slab mid-rotation, and a static
unfolded device at the tail. Sampling on equal time would spend three quarters
of the scroll on nothing. Frames are picked at equal steps of *cumulative
frame-to-frame difference* instead, so the scrub moves at a constant
perceptual speed and the dead air drops out on its own.

**Keying the white background.** The recording is on flat white. A flood fill
inward from the border marks the background (interior whites, such as the app's
own cards, are protected because they are enclosed), then the alpha edge is
blurred and re-mapped to pull it in by a hair, so no white sliver survives
against the dark band.

`CROP` at the top of the script is the union bounding box of the device across
the whole sequence. Re-measure it if the recording is reframed.

Then update `data-frames` on the `.unfold` stage in `index.html` if the count
changed.

# Rebuilding the start-screen carousel's frames and screenshots

```bash
python3 tools/build-hero-assets.py
```

Run from the Website folder. It derives three extra device frames from the
licensed ones in `img/frames` (a folded Duo, the folded Duo on its side, and
an iPad in landscape) and writes resized copies of the carousel screenshots
into `img/shots` as `50-hero-*` to `56-hero-*`. The docstring explains how the
folded Duo is spliced together and where each screenshot came from; the CSS
measurements for the new frames (`.tour__dev--*` in `site.css`) follow from it.
