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

/* -------------------------------------------------------------------------
   Post engagement — upvotes + comments.
   If the engage element carries data-api (site.engagement_api set), talk to the
   Lambda Function URL. Otherwise fall back to the local-only prototype so the
   UI still works before/without a backend.
------------------------------------------------------------------------- */
function stableVoterId() {
  let id = '';
  try { id = localStorage.getItem('voterId') || ''; } catch (_) {}
  if (!/^[a-zA-Z0-9-]{8,64}$/.test(id)) {
    id = (crypto?.randomUUID?.() || ('v-' + Math.random().toString(36).slice(2) + Date.now().toString(36)))
      .replace(/[^a-zA-Z0-9-]/g, '').slice(0, 64);
    try { localStorage.setItem('voterId', id); } catch (_) {}
  }
  return id;
}

function fmtWhen(iso) {
  if (!iso) return 'just now';
  try { return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }); }
  catch (_) { return 'just now'; }
}

function renderComment(list, c) {
  const item = document.createElement('li');
  item.className = 'comment';
  const meta = document.createElement('div');
  meta.className = 'comment__meta';
  meta.textContent = (c.name || 'Anonymous') + ' · ' + fmtWhen(c.createdAt);
  const bodyEl = document.createElement('div');
  bodyEl.className = 'comment__body';
  bodyEl.textContent = c.body || '';
  item.append(meta, bodyEl);
  list.appendChild(item);
}

function initPostEngagement() {
  const engage = document.querySelector('.post__engage');
  if (!engage) return;
  const slug = engage.dataset.postSlug || 'unknown';
  const api = (engage.dataset.api || '').replace(/\/+$/, '');   // trim trailing slash
  const useApi = !!api;
  const base = useApi ? api + '/posts/' + encodeURIComponent(slug) : null;

  const btn = engage.querySelector('[data-upvote-btn]');
  const countEl = engage.querySelector('[data-upvote-count]');
  const form = engage.querySelector('[data-comment-form]');
  const list = engage.querySelector('[data-comment-list]');

  // ----- Upvote -----
  if (btn && countEl) {
    const key = 'upvote:' + slug;
    let voted = false, count = 0, busy = false;
    try {
      voted = localStorage.getItem(key + ':voted') === '1';
      count = parseInt(localStorage.getItem(key + ':count') || '0', 10);
    } catch (_) {}
    if (isNaN(count)) count = 0;

    const render = () => {
      countEl.textContent = String(count);
      btn.setAttribute('aria-pressed', voted ? 'true' : 'false');
    };
    const persistLocal = () => {
      try {
        localStorage.setItem(key + ':voted', voted ? '1' : '0');
        localStorage.setItem(key + ':count', String(count));
      } catch (_) {}
    };
    render();

    btn.addEventListener('click', async () => {
      if (busy) return;
      const next = !voted;
      // Optimistic update.
      voted = next; count = Math.max(0, count + (next ? 1 : -1));
      render();
      if (!useApi) { persistLocal(); return; }
      busy = true;
      try {
        const res = await fetch(base + '/upvote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ voterId: stableVoterId(), action: next ? 'up' : 'down' }),
        });
        if (res.ok) {
          const data = await res.json();
          if (typeof data.upvotes === 'number') count = data.upvotes;
          if (typeof data.voted === 'boolean') voted = data.voted;
        } else {
          // Roll back the optimistic change.
          voted = !next; count = Math.max(0, count + (next ? -1 : 1));
        }
      } catch (_) {
        voted = !next; count = Math.max(0, count + (next ? -1 : 1));
      } finally {
        busy = false;
        persistLocal();
        render();
      }
    });
  }

  // ----- Comments -----
  if (form && list) {
    const submitBtn = form.querySelector('[type="submit"]');

    if (useApi) {
      // Load existing comments + authoritative upvote count.
      fetch(base, { method: 'GET' })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (!data) return;
          if (countEl && typeof data.upvotes === 'number') countEl.textContent = String(data.upvotes);
          if (Array.isArray(data.comments)) {
            list.innerHTML = '';
            data.comments.forEach((c) => renderComment(list, c));
          }
        })
        .catch(() => {});
    }

    form.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const fd = new FormData(form);
      const name = String(fd.get('name') || '').trim();
      const body = String(fd.get('body') || '').trim();
      const hp = String(fd.get('hp') || '');
      if (!name || !body) return;
      if (hp) { form.reset(); return; }   // client-side honeypot short-circuit

      if (!useApi) {
        renderComment(list, { name, body, createdAt: null });
        form.reset();
        return;
      }

      if (submitBtn) submitBtn.disabled = true;
      try {
        const res = await fetch(base + '/comments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, body, hp }),
        });
        if (res.ok) {
          const data = await res.json().catch(() => ({}));
          renderComment(list, data.comment || { name, body, createdAt: new Date().toISOString() });
          form.reset();
        } else if (res.status === 429) {
          alert('You are commenting a little fast — give it a moment and try again.');
        } else {
          alert('Something went wrong posting your comment. Please try again.');
        }
      } catch (_) {
        alert('Could not reach the server. Please try again.');
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }
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
  safe('postEngagement', initPostEngagement);
});
