/* InfiniTask site — no dependencies, no third-party requests. */
(function () {
  'use strict';

  /* ------------------------------------------------------------------
     TODO (Craig): paste your form endpoint here to collect signups.
     Formspree:  https://formspree.io  -> 'https://formspree.io/f/xxxxxxx'
     Buttondown: https://buttondown.email -> your form action URL
     Leave it empty and the form falls back to opening a plain email,
     so the page is never broken.
     ------------------------------------------------------------------ */
  var SIGNUP_ENDPOINT = '';
  var CONTACT_EMAIL = 'support@infinitask.app';

  /* ---------------------------------------------- year */
  var y = document.getElementById('year');
  if (y) { y.textContent = String(new Date().getFullYear()); }

  /* ---------------------------------------------- sticky nav */
  var nav = document.getElementById('nav');
  if (nav && !nav.classList.contains('nav--solid')) {
    var onScroll = function () {
      nav.classList.toggle('is-stuck', window.scrollY > 40);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ---------------------------------------------- brand pill
     The icon-and-wordmark pill top left (wide windows only; CSS does the
     motion). It shows once the start screen's own logo has gone up under the
     nav, and hides when it comes back, so the two never show together. That
     is an observer, so nothing runs on every scroll. Pages without that logo
     show it as soon as you scroll. On the home page the same .has-brand
     brings in the links pill as well (.nav--reveal in site.css). */
  (function () {
    var navEl = document.getElementById('nav');
    var pill = navEl && navEl.querySelector('.nav__brand');
    if (!pill) { return; }
    var show = function (on) { navEl.classList.toggle('has-brand', on); };
    var heroBrand = document.querySelector('.start__brand');
    if (heroBrand && 'IntersectionObserver' in window) {
      // The top of the "screen" is pulled down to the nav's lower edge, so the
      // logo counts as gone once it has passed under the pills.
      new IntersectionObserver(function (entries) {
        show(!entries[0].isIntersecting);
      }, { rootMargin: '-64px 0px 0px 0px' }).observe(heroBrand);
    } else {
      var onBrandScroll = function () { show(window.scrollY > 40); };
      onBrandScroll();
      window.addEventListener('scroll', onBrandScroll, { passive: true });
    }
  })();

  /* ---------------------------------------------- Pricing confetti
     The app's Pro celebration (ConfettiRainView in BolderFoldersSheet.swift),
     redrawn for the web on the Pricing section only (Craig, 2026-11-15): 240
     pieces in both gradient stops of every Folder colour, as rectangles, dots
     and check marks, with the app's sizes, spin, drift and timing. It rains
     one screen's height down from the top of the section when you arrive
     there. It belongs to the section, so it scrolls with it and never shows
     over its neighbours, and it fades away as you scroll on past (or back up
     away from it). It plays again only once the section has left the screen
     entirely. Reduce Motion gets the app's still version: pieces fade in where
     they rest, hold, and fade out. */
  (function () {
    var section = document.querySelector('[data-confetti]');
    var canvas = document.createElement('canvas');
    if (!section || !canvas.getContext || !('IntersectionObserver' in window)) { return; }
    canvas.className = 'confetti';
    canvas.setAttribute('aria-hidden', 'true');
    section.appendChild(canvas);
    var ctx = canvas.getContext('2d');

    // FolderColor.gradientTop and .gradientBottom, all fifteen (Theme.swift).
    var PALETTE = [
      '#BD74FF', '#9A61ED', '#F371C5', '#D05EA8', '#00D4B8', '#01BABA',
      '#10D3FE', '#008DF1', '#F9E1AA', '#EAB578', '#FFBC82', '#F08121',
      '#D85E76', '#A63D53', '#6B6E8A', '#3D4161', '#D0E900', '#B5DC00',
      '#41E9F4', '#00CDDF', '#FAD2DA', '#F1A9B8', '#5FB87E', '#2F7A4C',
      '#B7C9A8', '#93A982', '#9C8EFF', '#675AE2', '#C9C1BD', '#9C918D'
    ];
    var pieces = [], started = 0, raf = 0, armed = true, still = false;
    var W = 0, H = 0, dpr = 1;
    var rand = function (a, b) { return a + Math.random() * (b - a); };

    var size = function () {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = section.clientWidth; H = section.clientHeight;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    };

    // SwiftUI's .easeIn is cubic-bezier(.42, 0, 1, 1): solve x for t, return y.
    var easeIn = function (x) {
      var lo = 0, hi = 1, t = x;
      for (var i = 0; i < 20; i++) {
        t = (lo + hi) / 2;
        var bx = 3 * (1 - t) * (1 - t) * t * .42 + 3 * (1 - t) * t * t + t * t * t;
        if (bx < x) { lo = t; } else { hi = t; }
      }
      return 3 * (1 - t) * t * t + t * t * t;
    };

    var draw = function (p, x, y, turn, alpha) {
      var s = p.size;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(x, y);
      ctx.rotate(turn);
      ctx.fillStyle = ctx.strokeStyle = p.color;
      ctx.beginPath();
      if (p.kind === 0) {                       // RoundedRectangle(cornerRadius: 2)
        if (ctx.roundRect) { ctx.roundRect(-s / 2, -s * .275, s, s * .55, 2); }
        else { ctx.rect(-s / 2, -s * .275, s, s * .55); }
        ctx.fill();
      } else if (p.kind === 1) {                // Circle
        ctx.arc(0, 0, s / 2, 0, Math.PI * 2);
        ctx.fill();
      } else {                                  // the heavy SF checkmark
        ctx.lineWidth = s * .2; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.moveTo(-s * .42, s * .02); ctx.lineTo(-s * .12, s * .32); ctx.lineTo(s * .44, -s * .32);
        ctx.stroke();
      }
      ctx.restore();
    };

    var frame = function (now) {
      raf = 0;
      var t = (now - started) / 1000;
      var r = section.getBoundingClientRect(), vh = window.innerHeight;
      // Full strength while the section holds the screen; gone as its foot
      // rises through the top tenth (scrolling on) or its top sinks through
      // the bottom tenth (scrolling back), over 30% of the screen each way.
      var fade = Math.max(0, Math.min(1, (r.bottom - vh * .1) / (vh * .3), (vh * .9 - r.top) / (vh * .3)));
      canvas.style.opacity = fade;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      var live = false;
      for (var i = 0; i < pieces.length; i++) {
        var p = pieces[i];
        if (still) {
          var off = p.delay + p.duration * .7;
          if (t < off + .4) { live = true; }
          var a = Math.min(1, Math.max(0, (t - p.delay) / .4)) * (1 - Math.min(1, Math.max(0, (t - off) / .4)));
          if (a > 0 && fade > 0) { draw(p, p.x * W, p.rest, p.spin / 6, a); }
        } else {
          var k = (t - p.delay) / p.duration;
          if (k < 1) { live = true; }
          if (k <= 0 || k >= 1 || fade === 0) { continue; }
          var e = easeIn(k);
          draw(p, p.x * W + p.drift * e, p.from + (p.to - p.from) * e, p.spin * e, 1);
        }
      }
      if (live) { raf = requestAnimationFrame(frame); }
      else { pieces = []; canvas.width = canvas.height = 0; }  // hand the memory back
    };

    var fire = function () {
      still = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
      size();
      var vh = window.innerHeight;
      var top = Math.max(0, -section.getBoundingClientRect().top);  // section y at the top of the screen
      pieces = [];
      for (var i = 0; i < 240; i++) {
        pieces.push({
          x: Math.random(),
          rest: Math.min(H - 8, top + rand(.04, .96) * vh),
          from: top - 60, to: top + vh + 60,
          color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
          kind: Math.floor(Math.random() * 3),
          size: rand(8, 15),
          spin: rand(-420, 420) * Math.PI / 180,
          // Most drop at once, a few a little later, so it reads less uniform.
          delay: Math.pow(Math.random(), 1.8) * 1.3,
          duration: rand(1.5, 2.6),
          drift: rand(-80, 80)
        });
      }
      started = performance.now();
      if (!raf) { raf = requestAnimationFrame(frame); }
    };

    // Arrived: the section's top has come up to a quarter of the way down
    // the screen (or it was already past that, after a jump).
    new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting && armed) { armed = false; fire(); }
    }, { rootMargin: '-25% 0px -74% 0px' }).observe(section);
    // Left: entirely off the screen, so the next visit rains again.
    new IntersectionObserver(function (entries) {
      if (!entries[0].isIntersecting) { armed = true; }
    }).observe(section);
    window.addEventListener('resize', function () { if (raf) { size(); } }, { passive: true });
  })();

  /* ---------------------------------------------- reveal on scroll */
  var reveals = document.querySelectorAll('.reveal');
  if (reveals.length) {
    if (!('IntersectionObserver' in window)) {
      Array.prototype.forEach.call(reveals, function (el) { el.classList.add('is-in'); });
    } else {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
        });
      }, { rootMargin: '0px 0px -12% 0px', threshold: 0.05 });
      Array.prototype.forEach.call(reveals, function (el) { io.observe(el); });
    }
  }

  /* ---------------------------------------------- device entrances
     Each tilted phone fades and lifts on ITS OWN visibility rather than its
     row's. Three of the rows carry prop clusters under the copy and so are
     taller, and a taller row trips the reveal at a different moment relative
     to the phone inside it, which made two of the five look like they were
     not animating at all. Watching the phone itself makes every section
     behave the same whatever is stacked beside it. */
  (function () {
    var tilts = document.querySelectorAll('.feature [class*="device--tilt"]');
    if (!tilts.length) { return; }
    var reveal = function (el) { el.classList.add('is-shown'); };
    if (!('IntersectionObserver' in window)) {
      Array.prototype.forEach.call(tilts, reveal);
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { reveal(e.target); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.18 });
    Array.prototype.forEach.call(tilts, function (el) { io.observe(el); });
  }());

  /* ---------------------------------------------- signup */
  var form = document.getElementById('signup');
  var msg = document.getElementById('formMsg');

  function say(text, state) {
    if (!msg) { return; }
    msg.textContent = text;
    msg.setAttribute('data-state', state);
  }

  if (form) {
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var field = form.querySelector('input[type="email"]');
      var value = (field && field.value || '').trim();

      if (!value || value.indexOf('@') < 1 || value.lastIndexOf('.') < value.indexOf('@')) {
        say('That email does not look quite right.', 'error');
        if (field) { field.focus(); }
        return;
      }

      // No endpoint configured yet: fall back to a plain mailto so nothing breaks.
      if (!SIGNUP_ENDPOINT) {
        say('Opening your email app so you can send it over.', 'ok');
        window.location.href = 'mailto:' + CONTACT_EMAIL +
          '?subject=' + encodeURIComponent('Tell me when InfiniTask launches') +
          '&body=' + encodeURIComponent('Please let me know when InfiniTask is on the App Store.\n\n' + value);
        return;
      }

      say('Sending…', '');
      fetch(SIGNUP_ENDPOINT, {
        method: 'POST',
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: value })
      }).then(function (res) {
        if (res.ok) {
          form.reset();
          say('Lovely. I will let you know the day it lands.', 'ok');
        } else {
          say('That did not send. Try again in a moment?', 'error');
        }
      }).catch(function () {
        say('That did not send. Try again in a moment?', 'error');
      });
    });
  }

  /* ---------------------------------------------- nav placement
     On the home page the pinned app icon sits centred at the top, so on a
     narrow window it runs into the links pill on the right. A fixed breakpoint
     cannot catch that: the pill's width follows its text, which moves with
     font size and zoom. Measure the real gap instead and drop the pill to the
     bottom of the screen when it runs out, where it is closer to thumbs
     anyway.

     Every page runs the same test with the same numbers, including Support and
     Privacy, which carry no icon of their own. There is nothing for the pill
     to hit there, but the nav should not jump sides halfway through the site.
     Depends only on the viewport and the pill, never on scroll. */
  (function () {
    var navEl = document.getElementById('nav');
    var navPill = document.querySelector('.nav__links');
    if (!navEl || !navPill) { return; }
    var atBottom = null;

    var placeNav = function () {
      var vw = document.documentElement.clientWidth;
      var big = Math.max(88, Math.min(124, vw * 0.13));  // hero icon, as in paint()
      var small = 56;                                    // pinned icon
      // Worst case, not the final case: halfway through the morph the icon is
      // still (big + small) / 2 across and already sitting on the nav line,
      // which is where it actually touches the links.
      var widest = (big + small) / 2;
      var pad = parseFloat(getComputedStyle(navEl).paddingLeft) || 12;
      // Where the pill WOULD sit at the top right, not where it is now.
      // Measuring the moved pill flips the test back, and the nav oscillates.
      var leftIfTop = vw - pad - navPill.getBoundingClientRect().width;
      var bottom = (vw / 2 + widest / 2 + 24) > leftIfTop;

      if (bottom === atBottom) { return; }
      atBottom = bottom;
      navEl.classList.toggle('nav--bottom', bottom);
      document.body.classList.toggle('has-bottom-nav', bottom);
    };

    placeNav();
    window.addEventListener('resize', placeNav, { passive: true });
    // The pill is as wide as its text, so re-measure once the real face lands.
    if (document.fonts && document.fonts.ready) { document.fonts.ready.then(placeNav); }
  })();

  /* ---------------------------------------------- scroll veil
     Drives the iOS-style blur and fade at the top of the page. Two jobs:
     fade the whole effect in as you start scrolling, and keep its scrim the
     colour of whatever section is currently passing underneath, so it does not
     wash the dark Pro band towards the light page background.
     Every number lives in css/site.css. This only reads them. */
  (function () {
    var veil = document.querySelector('.veil');
    if (!veil) { return; }

    var root = document.documentElement;
    var knobs = { start: 40, ramp: 170, h: 140 };
    var bands = [];
    var vTicking = false;
    var lastTint = null;
    var isOn = false;

    var px = function (name, fallback) {
      var v = parseFloat(getComputedStyle(root).getPropertyValue(name));
      return isNaN(v) ? fallback : v;
    };

    // Re-read the knobs. Called at startup, on resize, and by the tuner.
    var measure = function () {
      knobs.start = px('--veil-start', 40);
      knobs.ramp = Math.max(1, px('--veil-ramp', 170));
      knobs.h = px('--veil-h', 140);

      bands = [];
      var sections = document.querySelectorAll('main > section, main > .band');
      for (var i = 0; i < sections.length; i++) {
        var el = sections[i];
        var r = el.getBoundingClientRect();
        bands.push({
          top: r.top + window.scrollY,
          bottom: r.bottom + window.scrollY,
          tint: el.getAttribute('data-veil')
        });
      }
    };

    var paintVeil = function () {
      vTicking = false;
      var y = window.scrollY;

      var p = Math.min(1, Math.max(0, (y - knobs.start) / knobs.ramp));
      var ease = p * p * (3 - 2 * p);                  // smoothstep, as the icon uses

      if ((ease > 0) !== isOn) {
        isOn = ease > 0;
        veil.classList.toggle('is-on', isOn);
      }
      root.style.setProperty('--veil', ease.toFixed(3));
      if (!isOn) { return; }

      // Which section is under the middle of the strip right now?
      var probe = y + knobs.h * 0.5;
      var tint = null;
      for (var i = 0; i < bands.length; i++) {
        if (probe >= bands[i].top && probe < bands[i].bottom) { tint = bands[i].tint; break; }
      }
      if (tint !== lastTint) {
        lastTint = tint;
        // Clearing it falls back to the stylesheet's var(--app-bg), which is
        // what keeps the default following light and dark on its own.
        if (tint) { root.style.setProperty('--veil-scrim', tint); }
        else { root.style.removeProperty('--veil-scrim'); }
      }
    };

    var onVeil = function () {
      if (!vTicking) { vTicking = true; window.requestAnimationFrame(paintVeil); }
    };

    measure();
    paintVeil();
    window.addEventListener('scroll', onVeil, { passive: true });
    window.addEventListener('resize', function () { measure(); onVeil(); }, { passive: true });
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () { measure(); onVeil(); });
    }
    window.addEventListener('load', function () { measure(); onVeil(); });

    // Expose just enough for the tuner below to re-read after it changes a knob.
    window.__veil = { measure: measure, repaint: paintVeil };
  })();

  /* The app icon above the thesis headline used to live here: a fixed element
     that JS re-placed every frame so it morphed into a pinned corner button on
     scroll. Removed (Craig, 2026-11-14) — it did nothing useful and its
     per-frame writes made scrolling worse. It is now a plain <img
     class="brand-logo"> in the flow, styled entirely in CSS. */

  /* The purple that rose from the foot of the start screen as you scrolled
     used to be driven from here, on every scroll. Removed with it
     (Craig, 2026-11-15). */

  /* ---------------------------------------------- start-screen tour
     The three device cards under the header. The row is a plain scroller with
     snap points, so swiping, a trackpad and the keyboard already work; this
     adds the timer, the progress bar and the buttons.

     The timer IS the progress bar's CSS animation: when it ends, the next card
     comes in. Pausing it (the button, the tab going to the background, the
     row being scrolled out of view, keyboard focus inside it) pauses the
     animation itself, so the bar and the timer can never disagree, and none
     of it costs a script on every frame. Anyone who prefers reduced motion
     gets no animation, so it never moves on its own for them. */
  (function () {
    var tour = document.querySelector('.tour');
    if (!tour) { return; }
    var track = tour.querySelector('.tour__track');
    var cards = [].slice.call(track.querySelectorAll('.tour__card'));
    var fill = tour.querySelector('.tour__fill');
    var segs = [].slice.call(tour.querySelectorAll('.tour__seg'));
    var pauseBtn = tour.querySelector('.tour__pause');
    var n = cards.length;
    if (!n || !fill) { return; }

    var index = 0;
    var paused = false;                  // the visitor pressed Pause
    var holds = { view: false, hidden: false, focus: false };
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

    var held = function () { return paused || holds.view || holds.hidden || holds.focus; };
    var owed = false;                    // the timer ran out while something held it
    var applyHold = function () {
      tour.classList.toggle('is-held', held());
      if (owed && !held()) { owed = false; go(index + 1); }
      tour.classList.toggle('is-paused', paused);
      if (pauseBtn) { pauseBtn.setAttribute('aria-label', paused ? 'Play the tour' : 'Pause the tour'); }
      // Read changes out only when they are the visitor's doing, not the timer's.
      track.setAttribute('aria-live', paused ? 'polite' : 'off');
    };

    // Start this card's third of the bar from empty.
    var runFill = function () {
      tour.style.setProperty('--from', (index / n).toFixed(4));
      tour.style.setProperty('--to', ((index + 1) / n).toFixed(4));
      fill.classList.remove('is-running');
      void fill.offsetWidth;             // restart, not resume
      fill.classList.add('is-running');
    };

    var mark = function () {
      segs.forEach(function (s, i) {
        if (i === index) { s.setAttribute('aria-current', 'true'); }
        else { s.removeAttribute('aria-current'); }
      });
    };

    // Where the track has to be for card i to sit on the header's line.
    var leftFor = function (i) {
      var pad = parseFloat(getComputedStyle(track).scrollPaddingLeft) || 0;
      return Math.max(0, cards[i].offsetLeft - pad);
    };

    var go = function (i, instant) {
      index = (i + n) % n;
      // scrollTo on the track, never scrollIntoView: that would also scroll
      // the page to bring the card into view, every six seconds.
      track.scrollTo({ left: leftFor(index), behavior: (instant || reduce.matches) ? 'auto' : 'smooth' });
      mark();
      runFill();
    };

    // A hold pauses the animation, so it should not run out while held; but
    // a hold can land in the very frame it ends. Dropping that end would
    // leave the tour stuck on this card for good, so it is owed instead and
    // paid when the hold lifts.
    fill.addEventListener('animationend', function (e) {
      if (e.animationName !== 'tour-fill') { return; }
      if (held()) { owed = true; } else { go(index + 1); }
    });

    tour.querySelector('.tour__arrow--prev').addEventListener('click', function () { go(index - 1); });
    tour.querySelector('.tour__arrow--next').addEventListener('click', function () { go(index + 1); });
    segs.forEach(function (s) {
      s.addEventListener('click', function () { go(parseInt(s.getAttribute('data-go'), 10) || 0); });
    });
    if (pauseBtn) {
      pauseBtn.addEventListener('click', function () { paused = !paused; applyHold(); });
    }

    // A swipe or a trackpad scroll moves the cards without us: once the row
    // settles, adopt whichever card it settled on and give it a full turn.
    // Only the visitor's own input counts. If one of OUR smooth scrolls is cut
    // short (it can be, in a tab that is not painting), the row would settle
    // on the old card, and adopting that would quietly undo the move; so in
    // that case the move is finished instead.
    var userMoved = false;
    var byUser = function () { userMoved = true; };
    track.addEventListener('pointerdown', byUser, { passive: true });
    track.addEventListener('touchstart', byUser, { passive: true });
    track.addEventListener('keydown', byUser);
    track.addEventListener('wheel', function (e) {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) { userMoved = true; }   // sideways only
    }, { passive: true });

    var settle = function () {
      var x = track.scrollLeft, best = 0, bestD = Infinity;
      for (var i = 0; i < n; i++) {
        var d = Math.abs(leftFor(i) - x);
        if (d < bestD) { bestD = d; best = i; }
      }
      if (best === index) { userMoved = false; return; }
      if (userMoved) { userMoved = false; index = best; mark(); runFill(); }
      else { track.scrollTo({ left: leftFor(index), behavior: 'auto' }); }
    };
    var settleTimer = 0;
    if ('onscrollend' in window) {
      track.addEventListener('scrollend', settle);
    } else {
      track.addEventListener('scroll', function () {
        clearTimeout(settleTimer);
        settleTimer = setTimeout(settle, 140);
      }, { passive: true });
    }

    // Nothing moves while it is off screen or the tab is in the background,
    // and it picks up where it left off when it is back.
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        holds.view = !entries[0].isIntersecting;
        applyHold();
      }, { threshold: 0.35 }).observe(track);
    }
    document.addEventListener('visibilitychange', function () {
      holds.hidden = document.hidden;
      applyHold();
    });
    // Someone tabbing through the controls should not have the cards move
    // under them. Mouse clicks do not count: the arrows would stop the timer.
    tour.addEventListener('focusin', function (e) {
      if (e.target.matches && e.target.matches(':focus-visible')) { holds.focus = true; applyHold(); }
    });
    tour.addEventListener('focusout', function (e) {
      if (!tour.contains(e.relatedTarget)) { holds.focus = false; applyHold(); }
    });

    // A resize moves every card's left edge; put the current one back.
    var resizeTimer = 0;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        track.scrollTo({ left: leftFor(index), behavior: 'auto' });
      }, 120);
    }, { passive: true });

    applyHold();
    mark();
    runFill();
  })();

  /* ---------------------------------------------- hero fan
     Drives --fan from 0 to 1 across the first screenful of scrolling, so the
     three screens swing apart as you come down the page. rAF-throttled, and
     skipped entirely for anyone who prefers reduced motion. */
  var fan = document.querySelector('.fan');
  if (fan && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    var ticking = false;
    var applyFan = function () {
      ticking = false;
      var travel = Math.max(window.innerHeight * 0.7, 380);
      var p = Math.min(1, Math.max(0, window.scrollY / travel));
      fan.style.setProperty('--fan', p.toFixed(3));
    };
    var onFanScroll = function () {
      if (!ticking) { ticking = true; window.requestAnimationFrame(applyFan); }
    };
    applyFan();
    window.addEventListener('scroll', onFanScroll, { passive: true });
    window.addEventListener('resize', onFanScroll, { passive: true });
  }

  /* ---------------------------------------------- themes preview
     Starts on Light or Dark to match the visitor's OS, and keeps following the
     OS until they pick a swatch, after which their choice sticks for the visit. */
  var themes = document.querySelector('.themes');
  if (themes) {
    var band = themes.closest('.daynight-band');
    var shots = band.querySelectorAll('.daynight__shot');
    var swatches = themes.querySelectorAll('.swatch');
    var mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
    var chosen = false;

    function setMode(mode) {
      Array.prototype.forEach.call(shots, function (s) {
        s.classList.toggle('is-active', s.getAttribute('data-mode') === mode);
      });
      Array.prototype.forEach.call(swatches, function (b) {
        var on = b.getAttribute('data-mode') === mode;
        b.setAttribute('aria-checked', String(on));
        b.tabIndex = on ? 0 : -1;             // one tab stop; arrows move within
        // The name under the circle is CSS (::after from aria-label), so the
        // aria-checked flip above is all it needs.
      });
      // The band repaints its page and its sky for whichever theme is on show.
      band.setAttribute('data-mode', mode);
    }

    setMode(mq && mq.matches ? 'dark' : 'light');

    if (mq) {
      var follow = function (e) { if (!chosen) { setMode(e.matches ? 'dark' : 'light'); } };   // the Pro themes are a deliberate choice only
      if (mq.addEventListener) { mq.addEventListener('change', follow); }
      else if (mq.addListener) { mq.addListener(follow); }   // older Safari
    }

    Array.prototype.forEach.call(swatches, function (b, i) {
      b.addEventListener('click', function () {
        chosen = true;
        setMode(b.getAttribute('data-mode'));
      });
      // Radio-group arrows, as a native radio set would have.
      b.addEventListener('keydown', function (e) {
        var step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
        if (!step) { return; }
        e.preventDefault();
        var next = swatches[(i + step + swatches.length) % swatches.length];
        chosen = true;
        setMode(next.getAttribute('data-mode'));
        next.focus();
      });
    });
  }

  /* ---------------------------------------------- support filter */
  var filter = document.getElementById('filter');
  if (filter) {
    var articles = Array.prototype.slice.call(document.querySelectorAll('.article'));
    var sections = Array.prototype.slice.call(document.querySelectorAll('.support-section'));
    var empty = document.getElementById('noResults');

    filter.addEventListener('input', function () {
      var q = filter.value.trim().toLowerCase();
      var hits = 0;

      articles.forEach(function (a) {
        var match = !q || a.textContent.toLowerCase().indexOf(q) !== -1;
        a.hidden = !match;
        if (match) { hits++; }
      });

      // hide a section heading when every article under it is filtered out
      sections.forEach(function (s) {
        var any = s.querySelector('.article:not([hidden])');
        s.hidden = !any;
      });

      if (empty) { empty.hidden = hits !== 0; }
    });
  }

  /* ---------------------------------------------- reading progress
     Fills the bar beside the Support page's section list. Progress is measured
     in sections, not in pixels: section index plus how far through it you are,
     over the section count. Raw scroll progress would drift away from the
     labels, because the sections are not the same length. */
  (function () {
    var sideNav = document.querySelector('.support-nav');
    if (!sideNav) { return; }

    var links = [].slice.call(sideNav.querySelectorAll('a[href^="#"]'));
    var marks = [];
    var rTicking = false;
    var current = -1;

    var measure = function () {
      marks = [];
      links.forEach(function (a) {
        var el = document.getElementById(a.getAttribute('href').slice(1));
        if (!el) { return; }
        var r = el.getBoundingClientRect();
        marks.push({ a: a, top: r.top + window.scrollY, h: Math.max(1, r.height) });
      });
    };

    var PROBE = 0.34;   // reading line, as a fraction down the viewport

    var paintRead = function () {
      rTicking = false;
      if (!marks.length) { return; }

      var n = marks.length;
      var y = window.scrollY;
      // Measure against a line a third down the viewport, not the very top,
      // since that is roughly what you are actually reading.
      var probe = y + window.innerHeight * PROBE;
      var p = 0;

      if (probe >= marks[0].top) {
        var i = n - 1;
        for (var k = 0; k < n; k++) { if (probe >= marks[k].top) { i = k; } }
        var f = Math.min(1, Math.max(0, (probe - marks[i].top) / marks[i].h));
        p = (i + f) / n;
      }

      // That line cannot travel the last (1 - PROBE) of a viewport, so the tail
      // of the page would snap to the end in one step. Blend it in over exactly
      // the distance the line comes up short by.
      var max = document.documentElement.scrollHeight - window.innerHeight;
      var tail = window.innerHeight * (1 - PROBE);
      if (max > 0 && tail > 0) {
        var t = Math.min(1, Math.max(0, (y - (max - tail)) / tail));
        p = p + (1 - p) * t;
      }

      sideNav.style.setProperty('--read', p.toFixed(4));

      // Derive the highlighted label from the bar, so the two can never
      // disagree about which section you are in.
      var at = Math.min(n - 1, Math.floor(p * n));
      if (at !== current) {
        current = at;
        links.forEach(function (a, k) { a.classList.toggle('is-current', k === at); });
      }
    };

    var onRead = function () {
      if (!rTicking) { rTicking = true; window.requestAnimationFrame(paintRead); }
    };

    measure();
    paintRead();
    window.addEventListener('scroll', onRead, { passive: true });
    window.addEventListener('resize', function () { measure(); onRead(); }, { passive: true });
    window.addEventListener('load', function () { measure(); onRead(); });
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () { measure(); onRead(); });
    }
    // The filter hides whole articles, so the sections change height under it.
    var filter = document.getElementById('filter');
    if (filter) { filter.addEventListener('input', function () { measure(); onRead(); }); }

    window.__read = { measure: measure, repaint: paintRead };
  })();

  /* ---------------------------------------------- config marquee
     The loop works by sliding the track exactly half its own width, so the two
     halves have to be identical and each half has to be wider than the screen,
     or a gap walks across the page once per cycle. Rather than hard-coding a
     pile of duplicate markup for the widest screen anyone might have, clone up
     to that width here and set the duration from the real distance, so the
     drift runs at the same speed whatever it ended up being. */
  (function () {
    var track = document.querySelector('.marquee__track');
    if (!track) { return; }

    var SPEED = 46;                 // px per second
    var base = [].slice.call(track.children);
    if (!base.length) { return; }

    var clone = function (node) {
      var c = node.cloneNode(true);
      c.setAttribute('aria-hidden', 'true');     // the originals carry the alt text
      var img = c.querySelector('img');
      if (img) { img.alt = ''; }
      track.appendChild(c);
    };

    // Measure against the widest the viewport could ever get on this device, not
    // the current window: a phone reports its portrait width, and turning it
    // sideways would otherwise walk a gap across the page once per cycle.
    var s = window.screen || {};
    var widest = Math.max(s.width || 0, s.height || 0, window.innerWidth);
    var target = widest * 1.15;
    var guard = 0;
    while (track.scrollWidth < target && guard++ < 20) { base.forEach(clone); }

    var half = track.scrollWidth;
    [].slice.call(track.children).forEach(clone);   // second half, for the loop

    track.style.setProperty('--marquee-s', (half / SPEED).toFixed(1) + 's');
    track.classList.add('is-running');
  })();

  /* ---------------------------------------------- device unfold
     A scroll-scrubbed frame sequence, not a <video>. Seeking a video with
     currentTime is the obvious approach and the wrong one: the seeks are async,
     and unless every frame is a keyframe the decoder lurches between the ones
     it has, which reads as stutter under the thumb. Frames are deterministic.

     Progress is measured against the TRACK, not the stage. The stage sticks to
     the middle of the viewport, so it does not move to measure against; the
     track's spare height is the scroll budget. Progress is 0 when the track's
     top reaches the top of the viewport, which is the moment the stage pins,
     and 1 when the track has been scrolled through, which is the moment it
     releases. data-lead and data-tail then hold each end of that range on a
     single frame, so the device sits folded, unfolds in place, and sits open.
     Holding both ends is why this is pinned at all: the holds need more scroll
     than the stage's own height could ever provide. */
  (function () {
    var stage = document.querySelector('[data-unfold]');
    if (!stage) { return; }
    var track = document.querySelector('[data-unfold-track]');

    var count = parseInt(stage.getAttribute('data-frames'), 10);
    var pattern = stage.getAttribute('data-src');
    // Holds at each end, as fractions of the travel: the device sits folded for
    // the lead-in and open flat for the tail, and the unfold itself runs across
    // whatever is left between them. Holding both ends is what makes it read as
    // an object that was sitting there and then settles, rather than something
    // permanently mid-move.
    var lead = parseFloat(stage.getAttribute('data-lead')) || 0;
    var tail = parseFloat(stage.getAttribute('data-tail')) || 0;
    if (!(lead >= 0 && lead < 1)) { lead = 0; }
    if (!(tail >= 0 && tail < 1)) { tail = 0; }
    // Leave the sequence somewhere to actually run, whatever the markup says.
    if (lead + tail > 0.9) { lead = 0; tail = 0; }
    var span = 1 - lead - tail;
    var canvas = stage.querySelector('.unfold__canvas');
    if (!count || !pattern || !canvas || !canvas.getContext) { return; }

    var still = document.querySelector('.unfold__still');
    var calm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
    if (calm && calm.matches) { return; }        // the still already shows the unfolded state

    var ctx = canvas.getContext('2d', { alpha: true });
    var frames = new Array(count);
    var loaded = 0;
    var ready = false;
    var revealed = false;
    var shown = -1;
    var queued = false;
    var dpr = 1;

    var src = function (i) {
      return pattern.replace('%d', i < 10 ? '0' + i : '' + i);
    };

    var size = function () {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      var w = canvas.clientWidth;
      if (!w) { return false; }
      var h = Math.round(w * canvas.height / canvas.width) || Math.round(w * 0.799);
      var cw = Math.round(w * dpr);
      if (canvas.width !== cw) {
        canvas.width = cw;
        canvas.height = Math.round(h * dpr);
        shown = -1;                              // the surface was cleared, force a redraw
      }
      return true;
    };

    var progress = function () {
      var vh = window.innerHeight || document.documentElement.clientHeight;
      var p;
      if (track) {
        var tr = track.getBoundingClientRect();
        var range = tr.height - vh;
        // A collapsed track (reduced motion, or a viewport taller than the
        // track) has nothing to scroll through, so settle on the open device.
        p = range > 0 ? (-tr.top) / range : 1;
      } else {
        var r = stage.getBoundingClientRect();
        var travel = Math.min(r.height, vh);
        if (travel <= 0) { return 0; }
        p = (vh - r.top) / travel;
      }
      p = p < 0 ? 0 : p > 1 ? 1 : p;
      if (span >= 1) { return p; }
      if (p <= lead) { return 0; }
      if (p >= 1 - tail) { return 1; }
      return (p - lead) / span;
    };

    var usable = function (i) {
      var img = frames[i];
      return !!(img && img.complete && img.naturalWidth);
    };

    // Never bail on a frame that is not ready. Bailing leaves `shown` pointing
    // at the last good frame with nothing queued to try again, so a single
    // frame that arrives late or badly freezes the whole scrub until the next
    // scroll event, and freezes it for good once the reader stops scrolling.
    // Walking outward to the nearest usable frame keeps the sequence moving,
    // and the late arrival repaints over it.
    var nearest = function (i) {
      if (usable(i)) { return i; }
      for (var d = 1; d < count; d++) {
        if (i - d >= 0 && usable(i - d)) { return i - d; }
        if (i + d < count && usable(i + d)) { return i + d; }
      }
      return -1;
    };

    var paint = function () {
      queued = false;
      if (!ready) { return; }
      var want = Math.round(progress() * (count - 1));
      var i = nearest(want);
      if (i < 0 || i === shown) { return; }
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(frames[i], 0, 0, canvas.width, canvas.height);
      shown = i;
    };

    var schedule = function () {
      if (queued) { return; }
      queued = true;
      requestAnimationFrame(paint);
    };

    // Reveal the canvas the moment it has something real to draw, and never
    // before. Revealing on a frame count instead would fade the still out on a
    // tab that loaded no images at all, leaving an empty canvas where the
    // device should be. Painting first also stops the swap flashing the folded
    // frame. Later frames simply repaint over their stand-ins.
    var reveal = function () {
      if (revealed) { return; }
      ready = true;
      size();
      paint();
      if (shown < 0) { ready = false; return; }  // nothing usable yet, keep the still
      revealed = true;
      stage.classList.add('is-scrubbing');
      if (still) { still.setAttribute('aria-hidden', 'true'); }
    };

    // Hold the fetch until the section is within a screen of the viewport, so
    // fifty-odd frames never compete with the hero for bandwidth. Then fetch
    // through a small window rather than firing all of them at once: the whole
    // burst in one go is what produced Image objects that reported complete
    // with a zero naturalWidth, and a narrow window costs nothing here because
    // the reader has a screen's worth of scrolling left before the first frame
    // is needed.
    var WINDOW = 12;
    var next = 0;

    var settle = function (slot) {
      if (slot.done) { return; }               // a timed-out frame must not count twice
      slot.done = true;
      clearTimeout(slot.timer);
      loaded++;
      reveal();
      pump();
    };

    var load = function (i, attempt) {
      var img = new Image();
      var slot = { done: false, timer: 0 };
      // A window is only as fast as its slowest member, so give every frame a
      // deadline. Without one, a single request that never settles holds its
      // slot for good and the sequence never finishes loading. A frame that
      // turns up after its deadline still repaints, it just stops blocking.
      slot.timer = setTimeout(function () { settle(slot); }, 8000);
      img.decoding = 'async';
      img.onload = function () {
        if (!img.naturalWidth && attempt < 2) { clearTimeout(slot.timer); load(i, attempt + 1); return; }
        if (revealed) { shown = -1; schedule(); }  // a late frame repaints over its stand-in
        settle(slot);
      };
      img.onerror = function () {
        if (attempt < 2) { clearTimeout(slot.timer); load(i, attempt + 1); return; }
        settle(slot);
      };
      img.src = src(i) + (attempt ? '?retry=' + attempt : '');
      frames[i] = img;
    };

    var pump = function () {
      while (next < count && next - loaded < WINDOW) { load(next++, 0); }
    };

    // Start fetching once the stage is within a screen of the viewport. This
    // rides the scroll handler that is here anyway rather than an
    // IntersectionObserver: one mechanism instead of two, it works on the
    // first paint for anyone who lands deep-linked or mid-page, and it does
    // not depend on intersections being computed, which a backgrounded tab
    // may not do at all.
    var fetched = false;
    var maybeFetch = function () {
      if (fetched) { return; }
      var r = (track || stage).getBoundingClientRect();
      var vh = window.innerHeight || document.documentElement.clientHeight;
      if (r.top < vh * 2 && r.bottom > -vh) { fetched = true; pump(); }
    };

    var onScroll = function () { maybeFetch(); schedule(); };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', function () { size(); schedule(); }, { passive: true });
    maybeFetch();
  })();

  /* ---------------------------------------------- modal scroll lock
     A native dialog opened with showModal() takes focus and blocks clicks
     behind it, but it does NOT stop the page scrolling: wheel over the
     backdrop and the whole site slides around underneath. Measured before
     writing this, the page moved 400px behind an open sheet.

     Watching the open attribute rather than patching every showModal and
     close call: there is no "open" event to listen for, there are two dialogs
     today, and anything added later is covered without remembering to wire it.

     The scrollbar's width is held in reserve while locked, or hiding it
     reflows the whole page a few pixels wider for as long as the modal is up.
     macOS overlay scrollbars measure 0 and skip it; Windows does not. */
  (function () {
    var dialogs = document.querySelectorAll('dialog');
    if (!dialogs.length || !('MutationObserver' in window)) { return; }

    var root = document.documentElement;
    var locked = false;
    var savedY = 0;

    var anyOpen = function () {
      for (var i = 0; i < dialogs.length; i++) {
        if (dialogs[i].open) { return true; }
      }
      return false;
    };

    var sync = function () {
      if (anyOpen()) {
        if (locked) { return; }
        locked = true;
        savedY = window.scrollY;
        var gap = window.innerWidth - root.clientWidth;
        if (gap > 0) { root.style.paddingRight = gap + 'px'; }
        root.style.overflow = 'hidden';
      } else {
        if (!locked) { return; }
        locked = false;
        root.style.overflow = '';
        root.style.paddingRight = '';
        // instant, because html carries scroll-behavior: smooth and restoring
        // the position should not look like a scroll the reader did not ask for
        window.scrollTo({ top: savedY, behavior: 'instant' });
      }
    };

    var mo = new MutationObserver(sync);
    Array.prototype.forEach.call(dialogs, function (d) {
      mo.observe(d, { attributes: true, attributeFilter: ['open'] });
      d.addEventListener('close', sync);
    });
  })();

  /* ---------------------------------------------- Add Things modal
     Tapping a tile in the Add Things grid opens the explainer at that feature.
     A native <dialog> does the heavy lifting: Esc, focus trapping and the
     backdrop are the platform's job, not ours. The rail is a real tab list, so
     arrow keys move between features the way a tab list is supposed to. */
  (function () {
    var dlg = document.getElementById('addThings');
    if (!dlg || typeof dlg.showModal !== 'function') { return; }

    var tabs = [].slice.call(dlg.querySelectorAll('.at__tab'));
    var rail = dlg.querySelector('.at__rail');
    var pane = dlg.querySelector('.at__pane');
    var opener = null;

    var select = function (key, moveFocus) {
      tabs.forEach(function (tab) {
        var on = tab.dataset.thing === key || tab.getAttribute('data-key') === key;
        tab.setAttribute('aria-selected', on ? 'true' : 'false');
        tab.tabIndex = on ? 0 : -1;
        document.getElementById(tab.getAttribute('aria-controls')).hidden = !on;
        if (on) {
          if (moveFocus) { tab.focus(); }
          // Keep the chosen feature in view when it is far down the rail.
          if (tab.offsetTop < rail.scrollTop ||
              tab.offsetTop + tab.offsetHeight > rail.scrollTop + rail.clientHeight) {
            rail.scrollTop = tab.offsetTop - rail.clientHeight / 2 + tab.offsetHeight / 2;
          }
          pane.scrollTop = 0;
        }
      });
    };

    var open = function (key, from) {
      opener = from || null;
      select(key || tabs[0].getAttribute('data-key'), false);
      dlg.showModal();
    };

    document.addEventListener('click', function (e) {
      var tile = e.target.closest('.addthings__tile');
      if (tile) { e.preventDefault(); open(tile.getAttribute('data-thing'), tile); }
    });

    dlg.addEventListener('click', function (e) {
      if (e.target.closest('.at__close')) { dlg.close(); return; }
      var tab = e.target.closest('.at__tab');
      if (tab) { select(tab.getAttribute('data-key'), false); return; }
      // Clicking the backdrop: the dialog element itself fills the whole
      // viewport, so a hit on it rather than on .at__inner is outside the card.
      if (e.target === dlg) { dlg.close(); }
    });

    rail.addEventListener('keydown', function (e) {
      var i = tabs.indexOf(document.activeElement);
      if (i < 0) { return; }
      var next = null;
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { next = (i + 1) % tabs.length; }
      else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { next = (i - 1 + tabs.length) % tabs.length; }
      else if (e.key === 'Home') { next = 0; }
      else if (e.key === 'End') { next = tabs.length - 1; }
      if (next === null) { return; }
      e.preventDefault();
      select(tabs[next].getAttribute('data-key'), true);
    });

    // Put focus back where it came from, or the tile is lost behind you.
    dlg.addEventListener('close', function () {
      if (opener && document.contains(opener)) { opener.focus(); }
      opener = null;
    });

    // No resize handler here on purpose. Add Things sizes itself from its own
    // content and the CSS cap; the equal-height pass belongs to the Pro sheets,
    // which cycle between panels and would otherwise jump.
  })();

  /* ---------------------------------------------- Pro sheets
     Six explainers in one <dialog>, swapped rather than rebuilt, so Prev and
     Next cycle through them without the dialog closing and reopening. Wraps at
     both ends: there is no first or last, just six. */
  (function () {
    var dlg = document.getElementById('proSheet');
    if (!dlg || typeof dlg.showModal !== 'function') { return; }

    var panels = [].slice.call(dlg.querySelectorAll('.ps__panel'));
    var keys = panels.map(function (p) { return p.getAttribute('data-sheet'); });
    var scroll = dlg.querySelector('.ps__scroll');
    var at = 0, opener = null;

    /* Hold every sheet at the same height, so cycling does not make the dialog
       jump. The height is the TALLEST panel's natural one, capped by the same
       ceiling the CSS uses, and the CSS hands the slack on a shorter sheet to
       the hero rather than to the rows.

       Measured by unhiding each panel, reading it and re-hiding, all in one
       synchronous pass so the browser never paints an intermediate state. The
       height has to be cleared first or each measurement would just return the
       height set last time. */
    var sized = false;
    var equalise = function () {
      if (!scroll) { return; }
      scroll.style.height = '';
      var tallest = 0;
      panels.forEach(function (p) {
        var was = p.hidden;
        p.hidden = false;
        if (p.offsetHeight > tallest) { tallest = p.offsetHeight; }
        p.hidden = was;
      });
      if (!tallest) { return; }
      var cap = Math.min(736, window.innerHeight - 104);
      scroll.style.height = Math.min(tallest, cap) + 'px';
      sized = true;
    };

    var show = function (i) {
      at = (i + panels.length) % panels.length;      // wrap both ways
      panels.forEach(function (p, n) { p.hidden = n !== at; });
      dlg.setAttribute('aria-label', panels[at].querySelector('.ps__title').textContent + ', Pro feature');
      if (scroll) { scroll.scrollTop = 0; }
    };

    document.addEventListener('click', function (e) {
      var card = e.target.closest('.pro__card');
      if (!card) { return; }
      e.preventDefault();
      opener = card;
      var i = keys.indexOf(card.getAttribute('data-sheet'));
      show(i < 0 ? 0 : i);
      dlg.showModal();
      if (!sized) { equalise(); }      // panels have no layout until it opens
    });

    dlg.addEventListener('click', function (e) {
      if (e.target.closest('.ps__close')) { dlg.close(); return; }
      if (e.target.closest('.ps__prev')) { show(at - 1); return; }
      if (e.target.closest('.ps__next')) { show(at + 1); return; }
      // the dialog element fills the viewport, so a hit on it is the backdrop
      if (e.target === dlg) { dlg.close(); }
    });

    // Left and right arrows move between sheets, as the buttons do.
    dlg.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') { e.preventDefault(); show(at - 1); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); show(at + 1); }
    });

    dlg.addEventListener('close', function () {
      if (opener && document.contains(opener)) { opener.focus(); }
      opener = null;
    });

    // The cap moves with the viewport, and so does how much a panel wraps.
    window.addEventListener('resize', function () {
      if (dlg.open) { equalise(); } else { sized = false; }
    }, { passive: true });
  })();

  /* ---------------------------------------------- veil tuner
     Add ?tune to any URL to get live sliders for the scroll veil. Never loads
     otherwise, so it costs visitors nothing and there is nothing to strip out
     before shipping. When it looks right, hit Copy and paste the block over
     the :root knobs in css/site.css. */
  if (/[?&]tune\b/.test(location.search) && document.querySelector('.veil')) {
    var KNOBS = [
      { p: '--veil-h',            label: 'Height',       min: 40,  max: 340, step: 2,   unit: 'px' },
      { p: '--veil-blur',         label: 'Blur',         min: 0,   max: 48,  step: 1,   unit: 'px' },
      { p: '--veil-scrim-alpha',  label: 'Fade',         min: 0,   max: 1,   step: .02, unit: ''   },
      { p: '--veil-scrim-stop',   label: 'Fade depth',   min: 5,   max: 100, step: 1,   unit: '%'  },
      { p: '--veil-shade-alpha',  label: 'Top shade',    min: 0,   max: 1,   step: .02, unit: ''   },
      { p: '--veil-shade-stop',   label: 'Shade depth',  min: 2,   max: 100, step: 1,   unit: '%'  },
      { p: '--veil-shade',        label: 'Shade colour', type: 'color' },
      { p: '--veil-start',        label: 'Starts at',    min: 0,   max: 400, step: 5,   unit: 'px' },
      { p: '--veil-ramp',         label: 'Ramp',         min: 20,  max: 600, step: 10,  unit: 'px' }
    ];
    var rootEl = document.documentElement;

    var panel = document.createElement('div');
    panel.id = 'veil-tuner';
    panel.innerHTML = '<h6>Scroll veil</h6><div class="vt-rows"></div>' +
      '<div class="vt-foot"><button type="button" class="vt-copy">Copy CSS</button>' +
      '<button type="button" class="vt-reset">Reset</button></div>' +
      '<pre class="vt-out"></pre>';

    var css = document.createElement('style');
    css.textContent =
      '#veil-tuner{position:fixed;right:14px;bottom:14px;z-index:9999;width:250px;' +
      'padding:14px 16px 12px;border-radius:16px;background:rgba(22,24,38,.93);' +
      'backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);color:#fff;' +
      'font:13px/1.35 ui-rounded,-apple-system,sans-serif;box-shadow:0 12px 40px rgba(0,0,0,.4)}' +
      '#veil-tuner h6{margin:0 0 10px;font-size:11px;letter-spacing:.5px;text-transform:uppercase;' +
      'opacity:.6;font-weight:700;color:#fff}' +
      '#veil-tuner label{display:block;margin-bottom:9px}' +
      '#veil-tuner .vt-k{display:flex;justify-content:space-between;font-size:11px;opacity:.75;margin-bottom:3px}' +
      '#veil-tuner input{width:100%;accent-color:#9A61ED;margin:0}' +
      '#veil-tuner .vt-foot{display:flex;gap:6px;margin-top:4px}' +
      '#veil-tuner button{flex:1;border:0;border-radius:9px;padding:7px 0;font:600 12px ui-rounded,sans-serif;' +
      'background:rgba(255,255,255,.14);color:#fff;cursor:pointer}' +
      '#veil-tuner button:hover{background:rgba(255,255,255,.24)}' +
      '#veil-tuner .vt-colour{height:26px;padding:0;border:0;border-radius:7px;background:none;cursor:pointer}' +
      '#veil-tuner .vt-rows{max-height:52vh;overflow:auto}' +
      '#veil-tuner .vt-out{margin:9px 0 0;padding:8px;border-radius:9px;background:rgba(0,0,0,.35);' +
      'font:11px/1.5 ui-monospace,monospace;white-space:pre-wrap;max-height:140px;overflow:auto;display:none}';
    document.head.appendChild(css);

    var initial = {};
    var rows = panel.querySelector('.vt-rows');

    var read = function (k) {
      var raw = getComputedStyle(rootEl).getPropertyValue(k.p).trim();
      if (k.type === 'color') { return hex(raw); }
      return parseFloat(raw);
    };
    // <input type="color"> only accepts #rrggbb, but a computed custom property
    // comes back however the browser feels like serialising it.
    var hex = function (raw) {
      if (/^#[0-9a-f]{6}$/i.test(raw)) { return raw; }
      var m = raw.match(/-?[\d.]+/g);
      if (!m || m.length < 3) { return '#000000'; }
      return '#' + m.slice(0, 3).map(function (n) {
        var v = parseFloat(n);
        if (v <= 1 && raw.indexOf('srgb') > -1) { v *= 255; }
        return ('0' + Math.round(v).toString(16)).slice(-2);
      }).join('');
    };
    var cssText = function () {
      return KNOBS.map(function (k) {
        return '  ' + k.p + ': ' + k.el.value + (k.unit || '') + ';';
      }).join('\n');
    };
    var show = function () {
      var out = panel.querySelector('.vt-out');
      out.style.display = 'block';
      out.textContent = cssText();
    };

    KNOBS.forEach(function (k) {
      initial[k.p] = read(k);
      var wrap = document.createElement('label');
      wrap.innerHTML = '<span class="vt-k"><span>' + k.label + '</span><b></b></span>';
      var input = document.createElement('input');
      if (k.type === 'color') {
        input.type = 'color';
        input.className = 'vt-colour';
      } else {
        input.type = 'range';
        input.min = k.min; input.max = k.max; input.step = k.step;
      }
      input.value = initial[k.p];
      wrap.appendChild(input);
      rows.appendChild(wrap);
      k.el = input;
      k.out = wrap.querySelector('b');
      k.out.textContent = input.value + (k.unit || '');

      input.addEventListener('input', function () {
        k.out.textContent = input.value + (k.unit || '');
        rootEl.style.setProperty(k.p, input.value + (k.unit || ''));
        if (window.__veil) { window.__veil.measure(); window.__veil.repaint(); }
        if (panel.querySelector('.vt-out').style.display === 'block') { show(); }
      });
    });

    panel.querySelector('.vt-copy').addEventListener('click', function () {
      show();
      if (navigator.clipboard) { navigator.clipboard.writeText(cssText()); }
      var b = panel.querySelector('.vt-copy');
      b.textContent = 'Copied';
      setTimeout(function () { b.textContent = 'Copy CSS'; }, 1200);
    });
    panel.querySelector('.vt-reset').addEventListener('click', function () {
      KNOBS.forEach(function (k) {
        rootEl.style.removeProperty(k.p);
        k.el.value = initial[k.p];
        k.out.textContent = k.el.value + (k.unit || '');
      });
      if (window.__veil) { window.__veil.measure(); window.__veil.repaint(); }
      panel.querySelector('.vt-out').style.display = 'none';
    });

    document.body.appendChild(panel);
  }

}());
