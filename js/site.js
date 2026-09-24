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

  /* ---------------------------------------------- day / night preview
     Starts on whatever the visitor's OS is set to. Keeps following the OS
     until they pick a side, after which their choice sticks for the visit. */
  var seg = document.querySelector('.seg');
  if (seg) {
    var shots = document.querySelectorAll('.daynight__shot');
    var segBtns = seg.querySelectorAll('.seg__btn');
    var mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
    var chosen = false;

    function setMode(mode) {
      Array.prototype.forEach.call(shots, function (s) {
        s.classList.toggle('is-active', s.getAttribute('data-mode') === mode);
      });
      Array.prototype.forEach.call(segBtns, function (b) {
        b.setAttribute('aria-pressed', String(b.getAttribute('data-mode') === mode));
      });
    }

    setMode(mq && mq.matches ? 'dark' : 'light');

    if (mq) {
      var follow = function (e) { if (!chosen) { setMode(e.matches ? 'dark' : 'light'); } };
      if (mq.addEventListener) { mq.addEventListener('change', follow); }
      else if (mq.addListener) { mq.addListener(follow); }   // older Safari
    }

    Array.prototype.forEach.call(segBtns, function (b) {
      b.addEventListener('click', function () {
        chosen = true;
        setMode(b.getAttribute('data-mode'));
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
}());
