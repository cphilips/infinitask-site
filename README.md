# InfiniTask website

Three static pages. No build step, no npm, no framework. Open `index.html` in a
browser and it works.

```
index.html      landing page
support.html    17 help articles + contact  (your App Store Support URL)
privacy.html    privacy policy              (your App Store Privacy Policy URL)
css/site.css    every token and every layout rule
js/site.js      nav blur, reveal on scroll, support filter, signup form
fonts/          self-hosted Nunito (SIL OFL) so nothing is fetched from Google
img/logo/       wordmark-white.png — used as a CSS mask for the logo (see below)
img/icon/       app icon and favicons
img/art/        Pro hero illustrations and feature icons from Assets.xcassets
img/shots/      app screenshots, resized to 620px wide for the web
```

Full-resolution screenshots (1206 × 2622, straight off the iPhone 17 Pro
simulator) are **not** in this folder. They live in
`../App Store Screenshots/` so the deployable site stays small. Those are the
ones to upload to App Store Connect.

---

## Preview it locally

> **Use the `~/infinitask-site` shortcut, not the real path.** The folder lives
> under `iPhaze/✂️ Design/`, and the emoji gets stripped when you paste that
> path into Terminal, which makes `cd` fail with a confusing
> "No such file or directory". The shortcut avoids it entirely. It is a
> symlink, so it always points at the real folder.


```bash
cd ~/infinitask-site
python3 -m http.server 8080
```

Then open <http://localhost:8080>. Stop it with Ctrl-C.

You can also just double-click `index.html`, though the launch form behaves
better over `http://` than `file://`.

---

## Before it goes live

1. **Set the email address.** `support@infinitask.app` appears in
   `index.html`, `support.html`, `privacy.html` and `js/site.js`. Change it
   everywhere, or set up that address.
2. **Wire up the signup form.** Open `js/site.js` and put your endpoint in
   `SIGNUP_ENDPOINT` at the top. [Formspree](https://formspree.io) or
   [Buttondown](https://buttondown.email) both work with no backend. Left
   empty, the form falls back to opening the visitor's email app, so the page
   is never broken.
3. **Swap the launch CTA.** When the app ships, replace the "Coming soon"
   badge and button in `index.html` with a real App Store link.
4. **Check the date** at the top of `privacy.html` still reflects the last
   real change.

---

## Hosting on GitHub Pages

The repo is already initialised here with a first commit on `main`. Everything
below runs from this folder.

### 1. Create the repo on GitHub

Make a **new, empty, public** repo called `infinitask-site` (no README, no
.gitignore, no licence, or the first push will be rejected).

> Public matters: Pages from a *private* repo needs GitHub Pro. This repo holds
> only the marketing site, so publishing it costs you nothing. Your app source
> stays where it is, in the separate `cphilips/InfiniTask` repo.

### 2. Push it

```bash
cd ~/infinitask-site
git remote add origin git@github.com:cphilips/infinitask-site.git
git push -u origin main
```

### 3. Turn Pages on

Repo → **Settings → Pages** → Source: **Deploy from a branch** → Branch `main`,
folder `/ (root)` → Save. First build takes a minute or two.

Live at **https://cphilips.github.io/infinitask-site/**

Every asset path is relative, so the site works at that subpath *and* at a root
domain later with no edits.

### 4. Later: your own domain

Once you own it, two halves:

**On GitHub** — Settings → Pages → Custom domain → enter it → Save. That writes
a `CNAME` file into the repo, so `git pull` afterwards. Tick **Enforce HTTPS**
once the certificate is issued (can take up to an hour).

**At your registrar** — for an apex domain like `infinitask.app`, four A records:

```
185.199.108.153
185.199.109.153
185.199.110.153
185.199.111.153
```

For `www.` instead, a single CNAME record pointing at `cphilips.github.io`.

Then update the App Store Connect Support and Privacy URLs to the new domain.

### Updating the site afterwards

```bash
cd ~/infinitask-site
git add -A
git commit -m "Update site"
git push
```

Pages redeploys on every push to `main`.

---

## Hosting elsewhere

Any static host works. Drag this whole folder onto:

- **Netlify** — drop it at <https://app.netlify.com/drop>, done in seconds
- **Cloudflare Pages** — free, fast, custom domain included
- **Vercel** — `vercel deploy` from this folder

Apple needs both of these live and public before you submit:

| App Store Connect field | Page |
|---|---|
| Support URL | `support.html` |
| Privacy Policy URL | `privacy.html` |

A broken Support URL is the single most common App Store rejection, so click
both once they are live.

---

## How the design system works

`css/site.css` is a direct port of
`../Xcode Project InfiniTask/InfiniTask/Theme.swift`. Colours, radii, shadows,
the type scale and the layout widths all come from there, so the site and the
app stay in step. **If a token changes, change it in `Theme.swift` first, then
mirror it here.** The file notes which Swift symbol each block came from.

Two things worth knowing:

- **Type.** Every style in the app is SF Rounded. The CSS asks for
  `ui-rounded` first, which resolves to real SF Pro Rounded in Safari and
  Chrome on Apple hardware. Nunito is the self-hosted fallback for Windows and
  Android.
- **The logo.** `Logomark-white` is flat white with an alpha channel, so it is
  applied as a **CSS mask** and painted with `currentColor` rather than being
  dropped in as an `<img>`. That is what lets it switch colour: white over the
  gradient hero, `--text-1` once the nav sticks or on any solid-nav page, which
  resolves to `#1C1C1C` in light and `#F0F0F5` in dark. To restyle it, change
  the `color` on `.nav__word`, `.hero__wordmark` or `.footer__brand span`; the
  artwork follows. The hero uses the same asset at a larger size, under the
  app icon.
  The word "InfiniTask" stays in the markup for screen readers, copy-paste and
  as the fallback if a browser has no mask support.
- **Folder colours** use the names customers see, not the enum cases. In the
  code `teal` renders as "Green", `blurple` as "Lavender", `gold` as
  "Manilla", `black` as "Orange", `slate` as "Grey" and `cyan` as "Teal".

Light and dark both follow the visitor's system setting automatically.

---

## Known gaps

- **`img/logo/wordmark.png` and `img/logo/logomark.png` are unused.** They were
  copied over early on and left in place rather than deleted. Safe to remove;
  the originals live in `Assets.xcassets`.
- **No SVG logo exists anywhere in the project.** `wordmark-white.png` is a
  900 × 170 raster. It is sharp enough for the sizes used here, but an SVG cut
  from `InfiniTask III.sketch` would be better, and would drop straight into
  the same mask rules.
- **No iPhone Duo screenshots.** `simctl` returns pure black for the Duo's
  inner display, and the app rendered blank on its outer display in testing.
  Those shots need capturing by hand.
- **Testimonials and press quotes are deliberately absent.** The app has not
  shipped, so there is nothing true to put there yet.
