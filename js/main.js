/**
 * CHILL STUDIO — main.js
 *
 * Modules (self-contained, easy to enable/disable):
 *   1. Film Grain Canvas
 *   2. Navigation Scroll Behavior
 *   3. Mobile Menu
 *   4. Parallax Scroll
 *   5. Scroll-Reveal Animations (IntersectionObserver)
 *   6. Smooth Anchor Scroll
 */

'use strict';

/* ================================================================
   1. FILM GRAIN CANVAS
   Renders animated noise onto a fixed <canvas> overlay.
   Opacity + blend-mode is set in CSS (#grain-canvas).
   Automatically resizes on window resize.
   ================================================================ */
(function initGrain() {
  const canvas = document.getElementById('grain-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let animFrame;
  let lastTime = 0;
  const FPS = 14; // ~14fps looks like real film grain without burning CPU

  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  function drawGrain(timestamp) {
    if (timestamp - lastTime < 1000 / FPS) {
      animFrame = requestAnimationFrame(drawGrain);
      return;
    }
    lastTime = timestamp;

    const w = canvas.width;
    const h = canvas.height;

    // Create ImageData and fill with random luminance noise
    const imageData = ctx.createImageData(w, h);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      const v = (Math.random() * 255) | 0;
      data[i]     = v; // R
      data[i + 1] = v; // G
      data[i + 2] = v; // B
      data[i + 3] = 255;
    }

    ctx.putImageData(imageData, 0, 0);
    animFrame = requestAnimationFrame(drawGrain);
  }

  // Respect reduced motion preference
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    canvas.style.display = 'none';
    return;
  }

  resize();
  window.addEventListener('resize', resize, { passive: true });
  animFrame = requestAnimationFrame(drawGrain);
})();


/* ================================================================
   2. NAVIGATION SCROLL BEHAVIOR
   Adds .is-scrolled to <header> when user scrolls past 60px.
   ================================================================ */
(function initNav() {
  const header = document.getElementById('site-header');
  if (!header) return;

  const THRESHOLD = 60;

  function onScroll() {
    if (window.scrollY > THRESHOLD) {
      header.classList.add('is-scrolled');
    } else {
      header.classList.remove('is-scrolled');
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll(); // run on load in case page is already scrolled
})();


/* ================================================================
   3. MOBILE MENU
   Toggles the off-canvas mobile navigation panel.
   Traps focus inside the panel while open.
   ================================================================ */
(function initMobileMenu() {
  const toggle   = document.getElementById('nav-toggle');
  const menu     = document.getElementById('mobile-menu');
  const closeBtn = document.getElementById('mobile-menu-close');
  const backdrop = document.getElementById('mobile-menu-backdrop');

  if (!toggle || !menu) return;

  const links = menu.querySelectorAll('.mobile-nav-link, .mobile-cta');

  function openMenu() {
    menu.hidden = false;
    // Defer one frame so the CSS transition fires on the newly-visible element
    requestAnimationFrame(() => menu.classList.add('is-open'));
    toggle.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
    // Move focus to close button
    setTimeout(() => closeBtn && closeBtn.focus(), 60);
  }

  function closeMenu() {
    menu.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
    // Wait for CSS transition before hiding
    menu.addEventListener('transitionend', () => {
      menu.hidden = true;
    }, { once: true });
    toggle.focus();
  }

  toggle.addEventListener('click', openMenu);
  closeBtn && closeBtn.addEventListener('click', closeMenu);
  backdrop && backdrop.addEventListener('click', closeMenu);

  // Close when a nav link is clicked
  links.forEach(link => link.addEventListener('click', closeMenu));

  // Close on Escape
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !menu.hidden) closeMenu();
  });
})();


/* ================================================================
   4. PARALLAX SCROLL
   Translates elements with [data-parallax-speed] on scroll.
   Uses requestAnimationFrame + a dirty flag to batch paint calls.
   Only active above 768px to avoid hurting mobile perf.
   ================================================================ */
(function initParallax() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const targets = document.querySelectorAll('.parallax-target');
  if (!targets.length) return;

  let ticking = false;
  let scrollY = window.scrollY;

  function applyParallax() {
    targets.forEach(el => {
      const speed  = parseFloat(el.dataset.parallaxSpeed) || 0.3;
      const rect   = el.parentElement.getBoundingClientRect();
      const offset = (rect.top + scrollY) * speed;
      el.style.transform = `translateY(${offset * 0.12}px)`;
    });
    ticking = false;
  }

  function onScroll() {
    scrollY = window.scrollY;
    if (!ticking) {
      requestAnimationFrame(applyParallax);
      ticking = true;
    }
  }

  // Only run on viewport widths where parallax is visible
  const mq = window.matchMedia('(min-width: 769px)');

  if (mq.matches) {
    window.addEventListener('scroll', onScroll, { passive: true });
    applyParallax();
  }

  mq.addEventListener('change', e => {
    if (e.matches) {
      window.addEventListener('scroll', onScroll, { passive: true });
      applyParallax();
    } else {
      window.removeEventListener('scroll', onScroll);
      // Reset transforms
      targets.forEach(el => el.style.transform = '');
    }
  });
})();


/* ================================================================
   5. SCROLL-REVEAL ANIMATIONS
   Uses IntersectionObserver to add .is-visible to elements with
   .reveal-fade or .reveal-slide when they enter the viewport.
   data-delay (ms) staggers grouped elements.
   ================================================================ */
(function initScrollReveal() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    // Make everything visible immediately
    document.querySelectorAll('.reveal-fade, .reveal-slide').forEach(el => {
      el.classList.add('is-visible');
    });
    return;
  }

  const targets = document.querySelectorAll('.reveal-fade, .reveal-slide');
  if (!targets.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;

      const el    = entry.target;
      const delay = parseInt(el.dataset.delay, 10) || 0;

      setTimeout(() => el.classList.add('is-visible'), delay);

      // Unobserve after triggering — animation only plays once
      observer.unobserve(el);
    });
  }, {
    threshold: 0.12,
    rootMargin: '0px 0px -40px 0px'
  });

  targets.forEach(el => observer.observe(el));

  // Trigger hero elements immediately (they're above the fold)
  const heroEls = document.querySelectorAll('.hero .reveal-fade, .hero .reveal-slide');
  heroEls.forEach(el => {
    const delay = parseInt(el.dataset.delay, 10) || 0;
    setTimeout(() => el.classList.add('is-visible'), delay + 200);
    observer.unobserve(el);
  });
})();


/* ================================================================
   6. SMOOTH ANCHOR SCROLL
   Intercepts same-page anchor clicks and scrolls smoothly,
   offsetting for the fixed nav height.
   ================================================================ */
(function initSmoothScroll() {
  const NAV_OFFSET = 80;

  document.addEventListener('click', e => {
    const link = e.target.closest('a[href^="#"]');
    if (!link) return;

    const targetId = link.getAttribute('href');
    if (targetId === '#') {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const target = document.querySelector(targetId);
    if (!target) return;

    e.preventDefault();
    const top = target.getBoundingClientRect().top + window.scrollY - NAV_OFFSET;
    window.scrollTo({ top, behavior: 'smooth' });

    // Update URL without triggering a jump
    history.pushState(null, '', targetId);
  });
})();
