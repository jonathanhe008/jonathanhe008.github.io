/* site.js — vanilla ES module. Each init is try-wrapped and reduced-motion-aware.
   Timing constants LOCKED at {200, 400, 500, 800}ms. Curve: cubic-bezier(0.16, 1, 0.3, 1). */

const DUR_QUICK = 200;
const DUR_MED   = 400;
const DUR_LONG  = 500;
const DUR_SIG   = 800;

const motion = {
  ok: () => !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
};
const canHover = () => window.matchMedia('(hover: hover) and (pointer: fine)').matches;
const isMobile = () => window.matchMedia('(max-width: 768px)').matches;

const safe = (name, fn) => {
  try { fn(); }
  catch (e) { console.warn('[site]', name, e); }
};

/* ------------------------------------------------------------------------- */
function initLoader() {
  const el = document.getElementById('loader');
  if (!el) return;
  let seen = false;
  try { seen = sessionStorage.getItem('loaded') === '1'; } catch (_) {}
  const revealSidebars = () => {
    document.querySelectorAll('.sidebar').forEach((s, i) => {
      setTimeout(() => s.classList.add('is-in'), i * 100);
    });
  };
  if (seen || !motion.ok()) {
    el.style.display = 'none';
    revealSidebars();
    return;
  }

  const mobileFast = isMobile();
  const t = mobileFast
    ? { navy: 60, draw: 200, seal: 500, hide: 800 }
    : { navy: 100, draw: 200, seal: 800, hide: 1200 };

  requestAnimationFrame(() => {
    setTimeout(() => el.classList.add('is-navy'),    t.navy);
    setTimeout(() => el.classList.add('is-drawing'), t.draw);
    setTimeout(() => el.classList.add('is-sealing'), t.seal);
    setTimeout(() => {
      el.classList.add('is-hiding');
      setTimeout(() => el.remove(), 300);
      try { sessionStorage.setItem('loaded', '1'); } catch (_) {}
      revealSidebars();
    }, t.hide);
  });
}

/* ------------------------------------------------------------------------- */
function initHeroPortrait() {
  // Onerror handler on the <img> already toggles .is-fallback on the parent figure.
  // Nothing runtime-JS needed here.
}

/* initSignature + initHeroKinetic removed: signature is now an <img> and the
   hero no longer has a kinetic H1 name. */

/* ------------------------------------------------------------------------- */
function initCTAUnlock() {
  document.querySelectorAll('.button[data-cta-key]').forEach((btn) => {
    const key = 'unlocked:' + btn.dataset.ctaKey;
    try { if (sessionStorage.getItem(key) === '1') btn.classList.add('button--unlocked'); } catch (_) {}

    if (!canHover()) {
      // Mobile: first tap unlocks + shows granted; second tap follows link.
      btn.addEventListener('click', (ev) => {
        if (!btn.classList.contains('button--unlocked')) {
          ev.preventDefault();
          btn.classList.add('is-hover', 'button--unlocked');
          try { sessionStorage.setItem(key, '1'); } catch (_) {}
        } else {
          try { sessionStorage.setItem(key, '1'); } catch (_) {}
        }
      });
    } else {
      btn.addEventListener('click', () => {
        btn.classList.add('button--unlocked');
        try { sessionStorage.setItem(key, '1'); } catch (_) {}
      });
    }
  });
}

/* ------------------------------------------------------------------------- */
function initFadeUp() {
  const targets = document.querySelectorAll('.fade-up');
  if (!('IntersectionObserver' in window) || !motion.ok()) {
    targets.forEach((t) => t.classList.add('is-in'));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -60px 0px' });
  targets.forEach((t) => io.observe(t));
}

/* ------------------------------------------------------------------------- */
function initTopnav() {
  const nav = document.querySelector('.topnav');
  if (!nav) return;
  let lastY = window.scrollY;
  let ticking = false;
  const onScroll = () => {
    const y = window.scrollY;
    nav.classList.toggle('is-scrolled', y > 40);
    if (y > lastY && y > 120) nav.classList.add('is-hidden');
    else nav.classList.remove('is-hidden');
    lastY = y;
    ticking = false;
  };
  window.addEventListener('scroll', () => {
    if (!ticking) { requestAnimationFrame(onScroll); ticking = true; }
  }, { passive: true });
}

/* ------------------------------------------------------------------------- */
function initTopnavLinks() {
  // Intercept nav clicks ONLY on the home page. Elsewhere (writing, posts),
  // let the browser do a full nav to "/#anchor" so the target section loads.
  const path = window.location.pathname;
  const onHome = path === '/' || path.endsWith('/index.html') || path === '';
  if (!onHome) return;
  document.querySelectorAll('[data-topnav-link]').forEach((link) => {
    link.addEventListener('click', (ev) => {
      const href = link.getAttribute('href') || '';
      const hashIdx = href.indexOf('#');
      if (hashIdx < 0) return;
      const id = href.slice(hashIdx + 1);
      const target = document.getElementById(id);
      if (!target) return;
      ev.preventDefault();
      const nav = document.querySelector('.topnav');
      if (nav) nav.classList.remove('is-hidden');
      const navHeight = nav ? nav.getBoundingClientRect().height : 40;
      const top = target.getBoundingClientRect().top + window.scrollY - navHeight - 10;
      window.scrollTo({ top, behavior: motion.ok() ? 'smooth' : 'auto' });
      history.pushState(null, '', '#' + id);
    });
  });
}

/* ------------------------------------------------------------------------- */
function initScrollIndicator() {
  const marker = document.querySelector('[data-scroll-indicator]');
  if (!marker) return;
  const numEl  = marker.querySelector('[data-section-num]');
  const fillEl = marker.querySelector('[data-section-progress]');
  if (!numEl || !fillEl) return;

  const sections = Array.from(document.querySelectorAll('.section-heading'));
  if (!sections.length) { marker.style.display = 'none'; return; }

  const inner = marker.querySelector('.sidebar-right__marker');
  let currentHeading = sections[0];
  let currentSection = currentHeading.closest('.section');

  const updateNum = (heading) => {
    if (heading === currentHeading) return;
    currentHeading = heading;
    currentSection = heading.closest('.section');
    const nEl = heading.querySelector('.section-heading__num');
    const num = ((nEl && nEl.textContent) || '').replace(/[^0-9]/g, '') || '00';
    if (!inner || !motion.ok()) { numEl.textContent = num; return; }
    inner.classList.add('is-changing');
    setTimeout(() => {
      numEl.textContent = num;
      inner.classList.remove('is-changing');
    }, DUR_QUICK);
  };

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      let best = null;
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        if (!best || e.intersectionRatio > best.intersectionRatio) best = e;
      });
      if (best) updateNum(best.target);
    }, { rootMargin: '-30% 0px -50% 0px', threshold: [0, 0.25, 0.5, 0.75, 1] });
    sections.forEach((s) => io.observe(s));
  }

  // Progress fill — how far into the current section have we scrolled.
  let ticking = false;
  const updateFill = () => {
    if (!currentSection) { ticking = false; return; }
    const rect = currentSection.getBoundingClientRect();
    const vh   = window.innerHeight;
    const traveled = Math.max(0, -rect.top);
    const total    = Math.max(1, rect.height - vh);
    const pct = Math.max(0, Math.min(100, (traveled / total) * 100));
    fillEl.style.height = pct + '%';
    ticking = false;
  };
  const onScroll = () => {
    if (!ticking) { requestAnimationFrame(updateFill); ticking = true; }
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  updateFill();

  // Initialize with first section — force-set without transition.
  const nEl = sections[0].querySelector('.section-heading__num');
  numEl.textContent = ((nEl && nEl.textContent) || '').replace(/[^0-9]/g, '') || '00';
}

/* ------------------------------------------------------------------------- */
function initTabs() {
  const root = document.querySelector('[data-jobs]');
  if (!root) return;
  const tabs   = Array.from(root.querySelectorAll('.jobs__tab'));
  const panels = Array.from(root.querySelectorAll('.jobs__panel'));
  if (!tabs.length) return;

  let switching = false;

  const activate = (i) => {
    if (switching) return;
    tabs.forEach((t, idx) => {
      const active = idx === i;
      t.setAttribute('aria-selected', active ? 'true' : 'false');
      t.setAttribute('tabindex', active ? '0' : '-1');
    });
    if (!motion.ok()) {
      panels.forEach((p, idx) => {
        if (idx === i) p.removeAttribute('hidden');
        else p.setAttribute('hidden', '');
      });
      return;
    }
    switching = true;
    /* 1. Fade currently visible panels out (200ms). */
    const visible = panels.filter((p) => !p.hasAttribute('hidden'));
    visible.forEach((p) => {
      p.style.transition = 'opacity ' + DUR_QUICK + 'ms cubic-bezier(0.16, 1, 0.3, 1)';
      p.style.opacity = '0';
    });
    setTimeout(() => {
      /* 2. Swap hidden state. */
      panels.forEach((p, idx) => {
        if (idx === i) {
          p.removeAttribute('hidden');
          p.style.opacity = '0';
        } else {
          p.setAttribute('hidden', '');
          p.style.opacity = '';
          p.style.transition = '';
        }
      });
      /* 3. Fade the new panel in (400ms). */
      requestAnimationFrame(() => {
        const active = panels[i];
        active.style.transition = 'opacity ' + DUR_MED + 'ms cubic-bezier(0.16, 1, 0.3, 1)';
        active.style.opacity = '1';
        setTimeout(() => {
          active.style.transition = '';
          switching = false;
        }, DUR_MED);
      });
    }, DUR_QUICK);
  };

  tabs.forEach((t, i) => {
    t.addEventListener('click', () => activate(i));
    t.addEventListener('keydown', (ev) => {
      let next = -1;
      if (ev.key === 'ArrowDown' || ev.key === 'ArrowRight') next = (i + 1) % tabs.length;
      else if (ev.key === 'ArrowUp' || ev.key === 'ArrowLeft') next = (i - 1 + tabs.length) % tabs.length;
      else if (ev.key === 'Home') next = 0;
      else if (ev.key === 'End')  next = tabs.length - 1;
      if (next >= 0) { ev.preventDefault(); tabs[next].focus(); activate(next); }
    });
  });
}

/* ------------------------------------------------------------------------- */
function initGPACountUp() {
  const el = document.querySelector('.gpa-count');
  if (!el) return;
  const target = parseFloat(el.dataset.target || '3.95');
  if (!motion.ok() || !('IntersectionObserver' in window)) { el.textContent = target.toFixed(2); return; }
  let played = false;
  try { played = sessionStorage.getItem('seen:gpa') === '1'; } catch (_) {}
  if (played) { el.textContent = target.toFixed(2); return; }

  el.textContent = '0.00';
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      io.unobserve(e.target);
      const start = performance.now();
      const step = (now) => {
        const t = Math.min(1, (now - start) / DUR_SIG);
        const eased = 1 - Math.pow(1 - t, 3);
        el.textContent = (target * eased).toFixed(2);
        if (t < 1) requestAnimationFrame(step);
        else { try { sessionStorage.setItem('seen:gpa', '1'); } catch (_) {} }
      };
      requestAnimationFrame(step);
    });
  }, { threshold: 0.5 });
  io.observe(el);
}

/* ------------------------------------------------------------------------- */
function initScrollProgress() {
  const fill = document.querySelector('.scroll-progress__fill');
  if (!fill) return;
  let ticking = false;
  const update = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const pct = max > 0 ? (window.scrollY / max) * 100 : 0;
    document.documentElement.style.setProperty('--progress', pct + '%');
    ticking = false;
  };
  window.addEventListener('scroll', () => {
    if (!ticking) { requestAnimationFrame(update); ticking = true; }
  }, { passive: true });
  update();
}

/* ------------------------------------------------------------------------- */
function initSpotlight() {
  if (!canHover() || !motion.ok()) return;
  document.body.classList.add('spotlight-on');
  let ticking = false;
  let mx = window.innerWidth / 2, my = window.innerHeight / 2;
  const write = () => {
    document.documentElement.style.setProperty('--mx', mx + 'px');
    document.documentElement.style.setProperty('--my', my + 'px');
    ticking = false;
  };
  window.addEventListener('pointermove', (ev) => {
    mx = ev.clientX; my = ev.clientY;
    if (!ticking) { requestAnimationFrame(write); ticking = true; }
  }, { passive: true });
}

/* ------------------------------------------------------------------------- */
function initCursor() {
  const el = document.querySelector('.cursor-reticle');
  if (!el) return;
  if (!canHover() || !motion.ok()) { el.remove(); return; }
  el.classList.add('is-active');
  const interactiveSel = 'a, button, [role="button"], [tabindex]:not([tabindex="-1"])';
  window.addEventListener('pointermove', (ev) => {
    const t = ev.target && ev.target.closest ? ev.target.closest(interactiveSel) : null;
    el.classList.toggle('is-hover', !!t);
  }, { passive: true });
  window.addEventListener('mousedown', () => el.classList.add('is-click'));
  window.addEventListener('mouseup',   () => el.classList.remove('is-click'));
  window.addEventListener('blur',      () => el.classList.remove('is-active'));
  window.addEventListener('focus',     () => el.classList.add('is-active'));
}

/* ------------------------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', () => {
  safe('topnav',         initTopnav);
  safe('topnavLinks',    initTopnavLinks);
  safe('loader',         initLoader);
  safe('heroPortrait',   initHeroPortrait);
  safe('ctaUnlock',      initCTAUnlock);
  safe('fadeUp',         initFadeUp);
  safe('tabs',           initTabs);
  safe('gpaCountUp',     initGPACountUp);
  safe('scrollProgress', initScrollProgress);
  safe('spotlight',      initSpotlight);
  safe('cursor',         initCursor);
  safe('scrollIndicator',initScrollIndicator);
});
