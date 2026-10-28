const seen = new Set();
let root, grid, toggle;
let enabled = true;

function createUI() {
  root = document.createElement('div');
  root.id = 'igg-root';

  grid = document.createElement('div');
  grid.id = 'igg-grid';
  root.append(grid);

  toggle = document.createElement('button');
  toggle.id = 'igg-toggle';
  toggle.textContent = 'Original feed';
  toggle.addEventListener('click', () => {
    enabled = !enabled;
    toggle.textContent = enabled ? 'Original feed' : 'Grid view';
    update();
  });

  document.body.append(root, toggle);
}

// Right edge of Instagram's left nav column, so the overlay doesn't cover it.
function navRight() {
  let el = document.querySelector('a[href="/explore/"]');
  while (el && el !== document.body) {
    const r = el.getBoundingClientRect();
    if (r.height > innerHeight * 0.8 && r.left < 50 && r.width < innerWidth * 0.4) {
      return r.right;
    }
    el = el.parentElement;
  }
  return 80;
}

function pageBackground() {
  for (const el of [document.body, document.documentElement]) {
    const bg = getComputedStyle(el).backgroundColor;
    if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') return bg;
  }
  return '#fff';
}

function update() {
  const onHome = location.pathname === '/';
  const show = onHome && enabled;

  root.style.display = show ? 'block' : 'none';
  toggle.style.display = onHome ? 'block' : 'none';

  if (show) {
    root.style.left = navRight() + 'px';
    root.style.background = pageBackground();
  }
}

function pickMedia(article, isReel) {
  const video = article.querySelector('video');
  const imgs = [...article.querySelectorAll('img')]
    .filter((img) => !img.closest('header') && img.src && !/profile picture/i.test(img.alt))
    .sort((a, b) => b.getBoundingClientRect().width - a.getBoundingClientRect().width);

  const img = imgs[0];
  const src = (img && (img.currentSrc || img.src)) || (video && video.poster);
  return src ? { src, isVideo: isReel || !!video } : null;
}

function addTile(permalink, media, username) {
  const a = document.createElement('a');
  a.className = 'igg-tile';
  a.href = permalink;
  a.target = '_blank';
  a.rel = 'noopener';

  const img = document.createElement('img');
  img.src = media.src;
  img.loading = 'lazy';
  img.alt = '';
  a.append(img);

  if (media.isVideo) {
    const badge = document.createElement('span');
    badge.className = 'igg-badge';
    badge.textContent = '▶';
    a.append(badge);
  }

  if (username) {
    const name = document.createElement('span');
    name.className = 'igg-name';
    name.textContent = username;
    a.append(name);
  }

  grid.append(a);
}

// Read posts Instagram currently has mounted and add new ones to our grid.
function harvest() {
  document.querySelectorAll('main article').forEach((article) => {
    const link = article.querySelector('a[href*="/p/"], a[href*="/reel/"]');
    if (!link) return;

    const key = new URL(link.href).pathname;
    if (seen.has(key)) return;

    const media = pickMedia(article, key.includes('/reel/'));
    if (!media) return;

    const userLink = article.querySelector('header a');
    seen.add(key);
    addTile(link.href, media, userLink ? userLink.textContent.trim() : '');
  });
}

function init() {
  createUI();
  update();
  harvest();

  // Instagram is a single-page app: react to DOM and route changes.
  let timer;
  new MutationObserver(() => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      update();
      if (location.pathname === '/') harvest();
    }, 200);
  }).observe(document.body, { childList: true, subtree: true });

  // Infinite scroll: when our grid nears its bottom, nudge the hidden real feed
  // down one screen so Instagram loads (and mounts) more posts for us to read.
  setInterval(() => {
    if (!enabled || location.pathname !== '/') return;
    const nearBottom = root.scrollTop + root.clientHeight > root.scrollHeight - 1500;
    if (nearBottom) window.scrollBy(0, window.innerHeight);
  }, 800);

  window.addEventListener('resize', update);
}

init();