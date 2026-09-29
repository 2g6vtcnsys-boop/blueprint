/* AVR Innovations — shared behaviour.
   Every block guards on element existence so the one script can serve every page. */
(function () {
  'use strict';
  var root = document.documentElement;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- Lenis smooth scroll.
     Purely additive: without it the page scrolls natively and everything above still
     works, because the parallax reads window.scrollY rather than any Lenis value.
     Guarded because a blocked CDN throwing here would kill the reveals below it — and
     the 3s failsafe is cleared at the bottom of this file, so a throw would leave the
     page hidden with nothing to rescue it. ---- */
  try {
    if (!reduced && typeof Lenis === 'function') {
      var lenis = new Lenis({ duration: 1.05, smoothWheel: true, smoothTouch: false });
      var raf = function (t) { lenis.raf(t); window.requestAnimationFrame(raf); };
      window.requestAnimationFrame(raf);
      window.__lenis = lenis;
    }
  } catch (e) { /* native scroll is a perfectly good outcome */ }

  /* ---- hero carousel.
     Swiper, configured the way the reference is: vertical, effect 'slide', speed 500,
     mousewheel. It SNAPS one slide per gesture — it is not scroll-linked. The parallax
     numbers live on the markup: 60% on the media so the photograph lags, 100% on the
     content so the type stays pinned while the next image rises over it.
     Guarded: if the CDN is blocked, Swiper is simply absent, the slides stack as plain
     blocks and the page still scrolls. Nothing below this depends on it. ---- */
  var heroEl  = document.querySelector('.hero-seq');
  var fixed   = document.querySelector('.hero-fixed');
  var countN  = fixed && fixed.querySelector('.hf-count b');
  var navEl   = document.querySelector('.nav');
  var hero    = null;
  var heroLeft = false;

  var setNavH = function () {
    if (navEl) root.style.setProperty('--navh', navEl.offsetHeight + 'px');
  };
  setNavH();
  window.addEventListener('resize', setNavH);

  if (heroEl && !reduced && typeof Swiper === 'function') {
    try {
      hero = new Swiper(heroEl, {
        direction: 'vertical',
        effect: 'slide',
        speed: 500,
        parallax: true,
        slidesPerView: 1,
        mousewheel: { releaseOnEdges: true, forceToAxis: true, thresholdDelta: 6 },
        keyboard: { enabled: true, onlyInViewport: true },
        a11y: { enabled: true },
        touchReleaseOnEdges: true,
        on: {
          init: function (sw) { paintChrome(sw); },
          slideChange: function (sw) { paintChrome(sw); }
        }
      });
      window.__hero = hero;
    } catch (e) { hero = null; }
  }

  function paintChrome (sw) {
    if (countN) {
      var n = ('0' + (sw.activeIndex + 1)).slice(-2);
      if (countN.textContent !== n) countN.textContent = n;
    }
    syncLenis();
  }

  /* Swiper and Lenis both want the wheel. While the hero is on screen and the
     carousel still has slides to give, Lenis is stopped so Swiper owns the gesture;
     the moment the carousel reaches its last slide, Lenis takes over and the page
     scrolls on. Without this the page scrolls underneath the carousel. */
  function syncLenis () {
    var lenis = window.__lenis;
    if (!lenis || !heroEl) return;
    var r = heroEl.getBoundingClientRect();
    var covering = r.top <= 1 && r.bottom >= (window.innerHeight - 1);
    // Only capture at the very top of the page. Capturing whenever the hero merely
    // covers the screen would trap someone scrolling back up through the carousel;
    // at scrollY 0 there is nowhere above to go, so it cannot trap anyone.
    var atTop = (window.scrollY || document.documentElement.scrollTop || 0) <= 2;
    // Reset only on a genuine RETURN — i.e. the hero had actually left the screen.
    // Resetting whenever (atTop && isEnd) fires while the visitor is still working
    // through the carousel and yanks them back to slide one.
    if (!covering) heroLeft = true;
    if (covering && atTop && heroLeft && hero && hero.isEnd) {
      hero.slideTo(0, 0);
      heroLeft = false;
    }
    if (covering && atTop) heroLeft = false;
    var hold = covering && atTop && hero && !hero.isEnd;
    if (hold) lenis.stop(); else lenis.start();
  }

  /* fixed chrome + floating nav follow the hero's position on the page */
  var hTick = false;
  function paintHero () {
    if (!heroEl) { hTick = false; return; }
    var vh = window.innerHeight || 1;
    var r  = heroEl.getBoundingClientRect();
    if (fixed) fixed.classList.toggle('gone', r.bottom <= vh * 0.6);
    if (navEl) navEl.classList.toggle('over', r.bottom > navEl.offsetHeight + 4);
    syncLenis();
    hTick = false;
  }
  window.addEventListener('scroll', function () {
    if (!hTick) { hTick = true; window.requestAnimationFrame(paintHero); }
  }, { passive: true });
  window.addEventListener('resize', paintHero);
  paintHero();

  /* ---- scroll reveals ---- */
  var rv = document.querySelectorAll('.rv');
  if (rv.length) {
    if (reduced || !('IntersectionObserver' in window)) {
      for (var i = 0; i < rv.length; i++) rv[i].classList.add('in');
    } else {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          var el = e.target;
          var d = parseInt(el.getAttribute('data-d') || '0', 10);
          setTimeout(function () { el.classList.add('in'); }, d);
          io.unobserve(el);
        });
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });
      for (var j = 0; j < rv.length; j++) io.observe(rv[j]);
    }
  }

  /* ---- close the mobile disclosure on navigation or Escape ---- */
  var burger = document.querySelector('.burger');
  if (burger) {
    burger.addEventListener('click', function (e) {
      if (e.target.closest('.panel a')) burger.removeAttribute('open');
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && burger.hasAttribute('open')) {
        burger.removeAttribute('open');
        var s = burger.querySelector('summary'); if (s) s.focus();
      }
    });
  }

  /* ---- inquiry form.
     The form has no endpoint yet, so rather than appear to send and silently drop the
     message, it says so and hands over the phone number. Delete this block at the same
     time as you set the form's action. ---- */
  var form = document.querySelector('form.inquiry[data-preview]');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var box = form.querySelector('.form-msg');
      if (!box) return;
      box.innerHTML = 'This form is not connected yet on the preview \u2014 nothing has been sent. ' +
        'Please call <a href="tel:+441905412995">01905 412995</a> or email ' +
        '<a href="mailto:info@avrinnovations.co.uk">info@avrinnovations.co.uk</a> and we will pick it up.';
      box.classList.add('show');
      box.scrollIntoView({ block: 'nearest' });
    });
  }

  /* ---- Clear the failsafe only now that the reveals are wired.
     Clearing it any earlier is a trap: if this script had thrown above, the timer
     would already be gone and the page would stay hidden with nothing to rescue it. */
  if (window.__avrGuard) { clearTimeout(window.__avrGuard); window.__avrGuard = null; }
  root.classList.add('ready');
})();
