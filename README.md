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

```bash
cd "/Users/craigphilips/Documents/iPhaze/✂️ Design/App Design/InfiniTask/Website" && python3 -m http.server 8080
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

## Hosting

Any static host. Drag the whole `Website` folder onto:

- **Netlify** — drop it at <https://app.netlify.com/drop>, done in seconds
- **Cloudflare Pages** — free, fast, custom domain included
- **GitHub Pages** — free if the repo is public
- **Vercel** — `vercel deploy` from this folder

Apple needs both of these to be live, public URLs before you submit:

| App Store Connect field | Page |
|---|---|
| Support URL | `support.html` |
| Privacy Policy URL | `privacy.html` |

A broken Support URL is the single most common App Store rejection, so click
both once they are live.

> **Note on this folder's path.** It contains an emoji and spaces, which is
> fine for drag-and-drop hosting and for the local preview. If you ever want
> git-based deploys or CI, copy the folder somewhere with a plainer path first.

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
