/* =====================================================
   403 — script.js
   Efectos: text scramble, reveal on scroll,
   filtros, búsqueda, mobile nav, nav activo
   ===================================================== */

/* ─── UTILIDADES ─── */

// Detecta página actual
const currentPage = location.pathname.split('/').pop() || 'index.html';

function createThemeToggle () {
  const topbarMeta = document.querySelector('.topbar__meta');
  if (!topbarMeta) return null;
  let button = topbarMeta.querySelector('.theme-toggle');
  if (!button) {
    button = document.createElement('button');
    button.type = 'button';
    button.className = 'theme-toggle';
    topbarMeta.appendChild(button);
  }
  return button;
}

function setTheme (theme) {
  document.documentElement.dataset.theme = theme;
  const toggle = document.querySelector('.theme-toggle');
  if (toggle) {
    toggle.textContent = theme === 'dark' ? 'Modo claro' : 'Modo oscuro';
    toggle.setAttribute('aria-label', theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro');
  }
}

function getPreferredTheme () {
  const saved = localStorage.getItem('theme');
  if (saved === 'dark' || saved === 'light') return saved;
  return 'dark';
}

const themeToggle = createThemeToggle();
if (themeToggle) {
  themeToggle.addEventListener('click', () => {
    const nextTheme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('theme', nextTheme);
  });
}
setTheme(getPreferredTheme());

function getProjectMetadata (projectId) {
  return PROJECTS[projectId] || null;
}

let instagramEmbedScriptLoaded = false;

function loadInstagramEmbedScript () {
  if (instagramEmbedScriptLoaded || window.instgrm) return;
  instagramEmbedScriptLoaded = true;

  const script = document.createElement('script');
  script.src = 'https://www.instagram.com/embed.js';
  script.async = true;
  script.defer = true;
  document.body.appendChild(script);
}

function normalizeEmbedSrc (metadata) {
  if (!metadata || !metadata.embedSrc) return '';
  const src = metadata.embedSrc.trim();
  try {
    const url = new URL(src, location.href);
    const hostname = url.hostname.toLowerCase();

    if (hostname.includes('youtu.be')) {
      const id = url.pathname.slice(1);
      if (id) return `https://www.youtube.com/embed/${id}`;
    }

    if (hostname.includes('youtube.com')) {
      if (url.pathname === '/watch') {
        const id = url.searchParams.get('v');
        if (id) return `https://www.youtube.com/embed/${id}`;
      }
      const embedPath = url.pathname.match(/\/embed\/([^\/\?]+)/);
      if (embedPath) return src;
      const shortsPath = url.pathname.match(/\/shorts\/([^\/\?]+)/);
      if (shortsPath) return `https://www.youtube.com/embed/${shortsPath[1]}`;
      const id = url.searchParams.get('v');
      if (id) return `https://www.youtube.com/embed/${id}`;
    }

    if (hostname.includes('instagram.com')) {
      const cleanPath = url.pathname.replace(/\/+$/, '');
      const postMatch = cleanPath.match(/^\/(p|reel|tv)\/([^\/]+)/);
      if (postMatch) {
        return `https://www.instagram.com/${postMatch[1]}/${postMatch[2]}/`;
      }
      if (cleanPath.endsWith('/embed')) {
        return `https://www.instagram.com${cleanPath.replace(/\/embed$/, '/')}`;
      }
      return `https://www.instagram.com${cleanPath}/`;
    }
  } catch (error) {
    // fall back to raw src if URL parsing fails
  }

  return src;
}

function createProjectEmbed (metadata) {
  if (!metadata || !metadata.embedSrc) return null;
  const src = normalizeEmbedSrc(metadata);
  if (!src) return null;

  try {
    const embedUrl = new URL(src, location.href);
    if (embedUrl.hostname.toLowerCase().includes('instagram.com')) {
      const figure = document.createElement('div');
      figure.className = 'instagram-embed';

      const blockquote = document.createElement('blockquote');
      blockquote.className = 'instagram-media';
      blockquote.dataset.instgrmCaptioned = 'true';
      blockquote.dataset.instgrmVersion = '14';

      const anchor = document.createElement('a');
      anchor.href = src;
      anchor.textContent = metadata.embedTitle || metadata.title || 'Ver en Instagram';
      blockquote.appendChild(anchor);
      figure.appendChild(blockquote);

      loadInstagramEmbedScript();
      if (window.instgrm?.Embeds?.process) {
        window.instgrm.Embeds.process();
      }

      return figure;
    }
  } catch (error) {
    // fall back to default behavior
  }

  if (metadata.type === 'video' || metadata.type === 'audio') {
    const iframe = document.createElement('iframe');
    iframe.src = src;
    iframe.allow = metadata.type === 'audio' ? 'autoplay' : 'autoplay; fullscreen; encrypted-media; picture-in-picture';
    iframe.title = metadata.embedTitle || metadata.title || 'Proyecto';
    iframe.setAttribute('allowfullscreen', '');
    iframe.loading = 'lazy';
    return iframe;
  }
  if (metadata.type === 'visual' || metadata.type === 'image') {
    const img = document.createElement('img');
    img.src = metadata.embedSrc;
    img.alt = metadata.embedAlt || metadata.embedTitle || metadata.title || 'Proyecto';
    return img;
  }
  return null;
}

function renderProjectEmbed (projectId, container) {
  if (!projectId || !container) return;
  const metadata = getProjectMetadata(projectId);
  if (!metadata) return;
  const embed = createProjectEmbed(metadata);
  if (!embed) return;
  container.innerHTML = '';
  container.appendChild(embed);
}

function renderProjectCard (project) {
  const projectId = project.dataset.projectId || project.id;
  const metadata = getProjectMetadata(projectId);
  if (!metadata) return;

  const titleEl = project.querySelector('.project__title');
  const descEl = project.querySelector('.project__desc');
  const catEl = project.querySelector('.project__cat');
  const yearEl = project.querySelector('.project__year');

  if (titleEl) titleEl.textContent = metadata.title;
  if (descEl) descEl.textContent = metadata.description;
  if (catEl) catEl.textContent = metadata.category || metadata.type || '';
  if (yearEl) yearEl.textContent = metadata.year || '';
}

function renderProjectCards () {
  const grid = document.querySelector('.work-grid');
  if (!grid || typeof PROJECTS !== 'object') return;

  grid.innerHTML = '';

  Object.values(PROJECTS).forEach(metadata => {
    if (!metadata || !metadata.id) return;

    const article = document.createElement('article');
    article.id = metadata.id;
    article.dataset.projectId = metadata.id;
    article.dataset.cat = metadata.category || metadata.type || '';
    if (metadata.related?.length) {
      article.dataset.related = metadata.related.join(',');
    }
    article.className = 'project js-reveal';

    article.innerHTML = `
      <div class="project__media">
        <div class="project__media-placeholder">
          <span>${metadata.type || metadata.category || 'proyecto'} — embed aquí</span>
        </div>
      </div>
      <div class="project__info">
        <div>
          <p class="project__cat">${metadata.category || metadata.type || ''}</p>
          <h2 class="project__title">${metadata.title || ''}</h2>
          <p class="project__desc">${metadata.description || ''}</p>
        </div>
        <div class="project__related" aria-label="Páginas relacionadas del proyecto"></div>
        <div class="project__foot">
          <span class="project__year">${metadata.year || ''}</span>
          <a href="work/${metadata.id}.html" class="project__link">${metadata.type === 'audio' ? 'escuchar →' : 'ver proyecto →'}</a>
        </div>
      </div>
    `;

    grid.appendChild(article);
  });
}

function renderProjectPageMetadata (projectId) {
  const metadata = getProjectMetadata(projectId);
  if (!metadata) return;

  const titleEl = document.querySelector('.section-head__title');
  const metaEl = document.querySelector('.section-head__meta');
  const descBlock = document.querySelector('.about-text-block p');
  const pageMeta = document.querySelector('meta[name="description"]');

  if (titleEl) titleEl.textContent = metadata.title;
  if (metaEl) {
    metaEl.innerHTML = '';
    const info1 = document.createElement('p');
    const info2 = document.createElement('p');
    if (metadata.type && metadata.category && metadata.type !== metadata.category) {
      info1.textContent = `${metadata.type} — ${metadata.category}`;
    } else {
      info1.textContent = metadata.type || metadata.category || '';
    }
    info2.textContent = metadata.year || '';
    metaEl.append(info1, info2);
  }
  if (descBlock) descBlock.textContent = metadata.description;
  if (pageMeta) pageMeta.content = metadata.description;
  if (metadata.title) document.title = `${metadata.title} — 403`;
}

function renderProjectDetailRelatedLinks (projectId) {
  if (!projectId) return;
  const metadata = getProjectMetadata(projectId);
  if (!metadata?.related?.length) return;

  const container = document.querySelector('.project__related');
  if (!container) return;
  renderRelatedLinks(container, 'Relacionado', metadata.related);
}

function initProjectEmbeds () {
  renderProjectCards();

  document.querySelectorAll('.project').forEach(project => {
    const projectId = project.dataset.projectId || project.id;
    const media = project.querySelector('.project__media');
    if (projectId && media) renderProjectEmbed(projectId, media);
  });

  const pageWrap = document.querySelector('.page-wrap[data-project-id]');
  let projectId = pageWrap?.dataset.projectId;
  if (!projectId && currentPage.startsWith('project-')) {
    projectId = currentPage.replace('.html', '');
  }
  const detailMedia = document.querySelector('.project-detail__media') || document.querySelector('.project__media');
  if (projectId) renderProjectPageMetadata(projectId);
  if (projectId) renderProjectDetailRelatedLinks(projectId);
  if (projectId && detailMedia) renderProjectEmbed(projectId, detailMedia);
}

// Marca el link activo en la nav de cada página
function markActiveNav () {
  document.querySelectorAll('.inner-nav a, .hero__nav a, .nav-overlay__links a').forEach(a => {
    if (a.getAttribute('href') === currentPage) a.classList.add('active');
  });
}
markActiveNav();

function initBitacoraControls () {
  const controls = document.querySelector('.bitacora-controls');
  const bitacoraBody = document.querySelector('.bitacora-body');
  if (!controls || !bitacoraBody) return;

  const monthIndexes = {
    enero: 0, febrero: 1, marzo: 2, abril: 3, mayo: 4, junio: 5,
    julio: 6, agosto: 7, septiembre: 8, octubre: 9, noviembre: 10, diciembre: 11
  };

  const getEntryDate = (entry) => {
    if (entry.dataset.date) {
      return new Date(entry.dataset.date);
    }
    const label = entry.querySelector('.entry__date-col')?.getAttribute('aria-label') || '';
    const match = label.match(/(\d{1,2})\s+de\s+([a-zñ]+)\s+de\s+(\d{4})/i);
    if (!match) return new Date(0);
    const day = Number(match[1]);
    const month = monthIndexes[match[2].toLowerCase()] ?? 0;
    const year = Number(match[3]);
    return new Date(year, month, day);
  };

  const entries = Array.from(bitacoraBody.querySelectorAll('.entry'));

  const setActiveButton = (buttons, value) => {
    buttons.forEach(button => {
      button.classList.toggle('active', button.dataset.sort === value || button.dataset.view === value);
    });
  };

  const sortEntries = (order) => {
    const sorted = [...entries].sort((a, b) => {
      const dateA = getEntryDate(a).getTime();
      const dateB = getEntryDate(b).getTime();
      return order === 'asc' ? dateA - dateB : dateB - dateA;
    });
    sorted.forEach(entry => bitacoraBody.appendChild(entry));
  };

  const setView = (view) => {
    bitacoraBody.classList.toggle('compact', view === 'compact');
  };

  controls.querySelectorAll('[data-sort]').forEach(button => {
    button.addEventListener('click', () => {
      const order = button.dataset.sort;
      setActiveButton(controls.querySelectorAll('[data-sort]'), order);
      sortEntries(order);
    });
  });

  controls.querySelectorAll('[data-view]').forEach(button => {
    button.addEventListener('click', () => {
      const view = button.dataset.view;
      setActiveButton(controls.querySelectorAll('[data-view]'), view);
      setView(view);
    });
  });

  setActiveButton(controls.querySelectorAll('[data-sort]'), 'desc');
  setActiveButton(controls.querySelectorAll('[data-view]'), 'expanded');
  sortEntries('desc');
  setView('expanded');
}

initBitacoraControls();

function formatRelatedLabel (href) {
  const parts = href.split('#');
  const page = parts[0].split('/').pop().replace('.html', '');
  const anchor = parts[1] || '';
  let label = '';

  if (page === 'bitacora') label = 'Bitácora';
  else if (page === 'archivo') label = 'Archivo';
  else if (page === 'work') label = 'Work';
  else label = page;

  if (anchor) {
    const clean = anchor.replace(/^(entry-|item-|project-)/, '')
      .replace(/[_-]+/g, ' ')
      .trim();
    if (clean) label += ` — ${clean}`;
  }

  return label;
}

function renderRelatedLinks (container, heading, hrefs) {
  if (!hrefs.length) return;
  const wrapper = document.createElement('div');
  wrapper.className = container.className;

  const label = document.createElement('span');
  label.textContent = heading;
  wrapper.appendChild(label);

  hrefs.forEach(href => {
    const link = document.createElement('a');
    link.href = href;
    link.textContent = formatRelatedLabel(href);
    wrapper.appendChild(link);
  });

  container.replaceWith(wrapper);
  return wrapper;
}

function initProjectConnections () {
  document.querySelectorAll('.project').forEach(project => {
    let links = (project.dataset.related || '').split(',').map(link => link.trim()).filter(Boolean);
    if (!links.length) {
      const projectId = project.dataset.projectId || project.id;
      const metadata = getProjectMetadata(projectId);
      if (metadata?.related?.length) links = metadata.related;
    }
    if (!links.length) return;

    const container = project.querySelector('.project__related') || (() => {
      const el = document.createElement('div');
      el.className = 'project__related';
      project.querySelector('.project__info')?.appendChild(el);
      return el;
    })();
    renderRelatedLinks(container, 'Relacionado', links);
  });

  document.querySelectorAll('.entry[data-work]').forEach(entry => {
    const raw = entry.dataset.work || '';
    const links = raw.split(',').map(link => link.trim()).filter(Boolean);
    if (!links.length) return;
    const related = document.createElement('div');
    related.className = 'entry__related';
    renderRelatedLinks(related, 'Work', links);
    const text = entry.querySelector('.entry__text');
    if (text) text.insertAdjacentElement('afterend', related);
  });

  document.querySelectorAll('.archivo-item[data-work]').forEach(item => {
    const raw = item.dataset.work || '';
    const links = raw.split(',').map(link => link.trim()).filter(Boolean);
    if (!links.length) return;
    const related = document.createElement('div');
    related.className = 'archivo-item__related';
    renderRelatedLinks(related, 'Work', links);
    item.appendChild(related);
  });
}

initProjectConnections();
initProjectEmbeds();


/* ─── MOBILE NAV OVERLAY ─── */

const navToggle  = document.querySelector('.nav-toggle');
const navOverlay = document.querySelector('.nav-overlay');
const navClose   = document.querySelector('.nav-overlay__close');

if (navToggle && navOverlay) {
  navToggle.addEventListener('click', () => {
    navOverlay.classList.add('open');
    navToggle.setAttribute('aria-expanded', 'true');
  });
}

if (navClose && navOverlay) {
  navClose.addEventListener('click', () => {
    navOverlay.classList.remove('open');
    if (navToggle) navToggle.setAttribute('aria-expanded', 'false');
  });
}

// Cierra con Escape
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && navOverlay?.classList.contains('open')) {
    navOverlay.classList.remove('open');
  }
});


/* ─── TEXT SCRAMBLE en el archive-door ─── */

const SCRAMBLE_CHARS = '!<>-_\\/[]{}—=+*^?#░▒▓|';

class TextScramble {
  constructor (el) {
    this.el      = el;
    this.original = el.textContent;
    this.frame   = null;
    this.resolve = null;
  }

  setText (newText) {
    return new Promise(res => {
      this.resolve = res;
      const oldLength = this.el.textContent.length;
      const newLength = newText.length;
      const length    = Math.max(oldLength, newLength);
      const chars     = Array.from({ length }, (_, i) => ({
        from: this.el.textContent[i] || '',
        to:   newText[i] || '',
        pos:  0,
        done: false
      }));
      this.update(chars, newText);
    });
  }

  update (chars, finalText) {
    const output = chars.map(c => {
      if (c.done) return c.to;
      if (c.pos > 10) {
        c.done = true;
        return c.to;
      }
      c.pos++;
      return SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
    }).join('');

    this.el.textContent = output;

    if (chars.every(c => c.done)) {
      this.resolve?.();
      return;
    }

    this.frame = requestAnimationFrame(() => this.update(chars, finalText));
  }

  cancel () {
    cancelAnimationFrame(this.frame);
    this.el.textContent = this.original;
  }
}

// Aplica el scramble al texto del archive-door
const archiveDoors = document.querySelectorAll('.archive-door');

archiveDoors.forEach(door => {
  const doorText = door.querySelector('[data-scramble]');
  if (!doorText) return;

  const target = door.dataset.scrambleTarget || 'acceder al archivo';
  const scramble = new TextScramble(doorText);

  door.addEventListener('mouseenter', () => {
    scramble.setText(target);
  });

  door.addEventListener('mouseleave', () => {
    scramble.cancel();
  });
});


/* ─── GLITCH en el "403" del hero (Home) ─── */

const heroTitle = document.querySelector('.hero__title');

if (heroTitle) {
  let glitchTimer;

  const doGlitch = () => {
    const offX = (Math.random() * 8 - 4).toFixed(1);
    const offY = (Math.random() * 4 - 2).toFixed(1);
    heroTitle.style.textShadow =
      `${offX}px ${offY}px 0 rgba(194,59,30,0.5),
       ${-offX}px ${-offY}px 0 rgba(194,59,30,0.18)`;
    setTimeout(() => {
      heroTitle.style.textShadow = '4px 0 0 rgba(13,11,9,0.15)';
    }, 100);
  };

  const scheduleGlitch = () => {
    const delay = 3500 + Math.random() * 7000;
    glitchTimer = setTimeout(() => {
      doGlitch();
      scheduleGlitch();
    }, delay);
  };

  scheduleGlitch();
}


/* ─── REVEAL ON SCROLL ─── */

const revealEls = document.querySelectorAll('.js-reveal');

if (revealEls.length > 0) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        // pequeño delay escalonado por posición
        setTimeout(() => {
          entry.target.classList.add('visible');
        }, i * 60);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });

  revealEls.forEach(el => observer.observe(el));
}


/* ─── CURSOR CROSSHAIR personalizado (solo desktop) ─── */

if (window.matchMedia('(pointer: fine)').matches) {
  const dot = document.createElement('div');
  dot.style.cssText = `
    position: fixed;
    width: 10px;
    height: 10px;
    pointer-events: none;
    z-index: 9999;
    transform: translate(-50%, -50%);
    mix-blend-mode: multiply;
  `;
  dot.innerHTML = `<svg viewBox="0 0 10 10" xmlns="http://www.w3.org/2000/svg">
    <line x1="5" y1="0" x2="5" y2="10" stroke="#C23B1E" stroke-width="1"/>
    <line x1="0" y1="5" x2="10" y2="5" stroke="#C23B1E" stroke-width="1"/>
  </svg>`;
  document.body.appendChild(dot);

  let cx = 0, cy = 0;
  document.addEventListener('mousemove', e => {
    cx = e.clientX; cy = e.clientY;
    dot.style.left = cx + 'px';
    dot.style.top  = cy + 'px';
  });

  // se expande sobre elementos interactivos
  document.querySelectorAll('a, button').forEach(el => {
    el.addEventListener('mouseenter', () => dot.style.transform = 'translate(-50%,-50%) scale(2.5)');
    el.addEventListener('mouseleave', () => dot.style.transform = 'translate(-50%,-50%) scale(1)');
  });
  dot.style.transition = 'transform 0.2s cubic-bezier(0.16,1,0.3,1)';
}


/* ─── WORK — filtro por categoría ─── */

const workFilters = document.querySelectorAll('.wf-btn');

if (workFilters.length) {
  workFilters.forEach(btn => {
    btn.addEventListener('click', () => {
      const workCards = document.querySelectorAll('.project');

      workFilters.forEach(b => b.classList.toggle('active', b === btn));
      const cat = btn.dataset.cat;

      workCards.forEach(card => {
        const show = cat === 'all' || card.dataset.cat === cat;
        card.style.display = show ? '' : 'none';
        if (show) {
          card.style.animation = 'enterUp 0.35s cubic-bezier(0.16,1,0.3,1) both';
        }
      });
    });
  });
}


/* ─── ARCHIVO — búsqueda en tiempo real ─── */

const archiveInput  = document.querySelector('.archivo-search input');
const archiveItems  = document.querySelectorAll('.archivo-item');
const archiveStats  = document.querySelector('.archivo-stats');

if (archiveInput && archiveItems.length) {
  const updateStats = (visible) => {
    if (archiveStats) archiveStats.textContent = `${visible} / ${archiveItems.length} elementos`;
  };

  updateStats(archiveItems.length);

  archiveInput.addEventListener('input', () => {
    const q = archiveInput.value.toLowerCase().trim();
    let visible = 0;

    archiveItems.forEach(item => {
      const name  = item.querySelector('.archivo-item__name')?.textContent?.toLowerCase() || '';
      const type  = item.dataset.type?.toLowerCase() || '';
      const match = !q || name.includes(q) || type.includes(q);
      item.style.display = match ? '' : 'none';
      if (match) visible++;
    });

    updateStats(visible);
  });
}


/* ─── TIMESTAMP en tiempo real ─── */

const tsEl = document.querySelector('.js-timestamp');
if (tsEl) {
  const pad = n => String(n).padStart(2, '0');
  const tick = () => {
    const d = new Date();
    tsEl.textContent =
      `${d.getFullYear()}.${pad(d.getMonth()+1)}.${pad(d.getDate())} `
      + `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  };
  tick();
  setInterval(tick, 1000);
}

function openPopup() {
  document.getElementById("calculator-popup").classList.remove("hidden");
}

document.addEventListener("DOMContentLoaded", function () {
  // other code here
});