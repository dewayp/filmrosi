/* =============================================
   MOVIEBOX ROSI — Home Page
   ============================================= */

const HomPage = (() => {

  async function render(container) {
    container.innerHTML = `<div class="page" id="home-page"><div style="padding:var(--space-md);padding-top:0"><div class="skeleton" style="height:70vw;max-height:480px;border-radius:0;margin:-0px -16px 0;"></div></div></div>`;

    try {
      const cacheKey = 'homepage';
      let data = Cache.get(cacheKey);
      if (!data) {
        data = await API.getHomepage();
        Cache.set(cacheKey, data, 5 * 60 * 1000);
      }

      let html = '';
      const ops = data.operatingList || [];

      // Find banner section
      const bannerOp = ops.find(o => o.type === 'BANNER' && o.banner?.items?.length);
      if (bannerOp) {
        html += Hero.createHTML(bannerOp.banner.items);
      }

      // Find FILTER (categories)
      const filterOp = ops.find(o => o.type === 'FILTER' && o.filters?.length);
      if (filterOp) {
        html += buildCategories(filterOp.filters);
      }

      // ⭐ Continue Watching (local history)
      html += buildContinueWatching();

      // All SUBJECTS_MOVIE sections
      const subjectOps = ops.filter(o => o.type === 'SUBJECTS_MOVIE' && o.subjects?.length);
      subjectOps.forEach((op, i) => {
        const seeAllRoute = op.title.toLowerCase() === 'trending' ? '/trending' : `/section?id=${op.opId}`;
        html += Section.createHTML(op.title, op.subjects, seeAllRoute);
      });

      // SPORT_LIVE sections
      const liveOps = ops.filter(o => o.type === 'SPORT_LIVE' && o.liveList?.length);
      liveOps.forEach(op => {
        html += buildLiveSection(op.title, op.liveList);
      });

      const page = document.getElementById('home-page');
      if (!page) return;
      page.innerHTML = html;

      // Init hero
      if (bannerOp) {
        Hero.init(bannerOp.banner.items);
      }

      // Lazy load all images
      Utils.lazyLoad(page);

      // Make header transparent over hero
      const header = document.getElementById('app-header');
      if (header && bannerOp) {
        header.classList.add('transparent');
      }

    } catch (err) {
      console.error('Home load error:', err);
      container.innerHTML = buildError('Gagal memuat konten', 'Periksa koneksi internet Anda dan coba lagi', () => render(container));
    }
  }

  function buildContinueWatching() {
    const history = State.getHistory();
    if (!history || history.length === 0) return '';

    const recent = history.slice(0, 12);
    const cards = recent.map(item => {
      const typeLabel = item.subjectType === 1 ? 'Film' : 'Serial';
      const timeAgo = formatTimeAgo(item.watchedAt);
      return `
        <div class="continue-card" onclick="Router.navigate('/detail', { subjectId: '${item.subjectId}' })">
          <div class="continue-poster-wrap">
            <img class="continue-poster" src="${item.cover}" alt="${item.title}" loading="lazy" onerror="Utils.imgFallback(this)"/>
            <div class="continue-play-icon">
              <svg viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>
            </div>
            <button class="continue-remove-btn" onclick="event.stopPropagation(); HomPage.removeFromHistory('${item.subjectId}')" title="Hapus">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
          <div class="continue-info">
            <div class="continue-title">${item.title}</div>
            <div class="continue-meta">${typeLabel} · ${timeAgo}</div>
          </div>
        </div>
      `;
    }).join('');

    return `
      <section class="content-section continue-section section-appear" id="continue-watching-section">
        <div class="section-header">
          <h2 class="section-title">▶ Lanjutkan Menonton</h2>
          <span class="section-see-all" onclick="HomPage.clearHistory()">Hapus Semua</span>
        </div>
        <div class="section-scroll continue-scroll">${cards}</div>
      </section>
    `;
  }

  function formatTimeAgo(timestamp) {
    if (!timestamp) return '';
    const diff = Date.now() - timestamp;
    const min = Math.floor(diff / 60000);
    const hr = Math.floor(min / 60);
    const day = Math.floor(hr / 24);
    if (day > 0) return `${day} hari lalu`;
    if (hr > 0) return `${hr} jam lalu`;
    if (min > 0) return `${min} menit lalu`;
    return 'Baru saja';
  }

  function removeFromHistory(subjectId) {
    const history = State.getHistory();
    const updated = history.filter(e => e.subjectId !== subjectId);
    State.set('watchHistory', updated);
    try { localStorage.setItem('mbr_history', JSON.stringify(updated)); } catch (_) { }
    // Re-render the continue watching section
    const section = document.getElementById('continue-watching-section');
    if (section) {
      if (updated.length === 0) {
        section.remove();
      } else {
        section.outerHTML = buildContinueWatching();
        Utils.lazyLoad(document.getElementById('home-page') || document);
      }
    }
  }

  function clearHistory() {
    State.set('watchHistory', []);
    try { localStorage.removeItem('mbr_history'); } catch (_) { }
    const section = document.getElementById('continue-watching-section');
    if (section) section.remove();
  }

  function buildCategories(filters) {
    const chips = filters.map(f => {
      const img = f.image?.url || '';
      return `
        <div class="category-chip" onclick="Router.navigate('/search', { q: '${encodeURIComponent(f.title)}' })">
          <img class="category-chip-img" src="${img}" alt="${f.title}" loading="lazy" onerror="Utils.imgFallback(this)"/>
          <span class="category-chip-label">${f.title}</span>
        </div>
      `;
    }).join('');

    return `
      <section class="category-section section-appear">
        <div class="section-header">
          <h2 class="section-title">Kategori</h2>
        </div>
        <div class="category-chips">${chips}</div>
      </section>
    `;
  }

  function buildLiveSection(title, matches) {
    const cards = matches.slice(0, 6).map(m => {
      const isLive = m.status === 'MatchIng';
      return `
        <div class="live-card" onclick="window.open('${m.url}', '_blank')">
          ${isLive ? `<div class="live-badge"><div class="live-dot"></div>LIVE</div>` : '<div style="font-size:0.6rem;color:var(--text-muted);font-weight:600;">UPCOMING</div>'}
          <div class="live-teams">
            <div class="live-team">
              <img class="live-team-logo" src="${m.team1.avatar}" alt="${m.team1.name}" onerror="Utils.imgFallback(this)">
              <div class="live-team-name">${m.team1.abbreviation || m.team1.name}</div>
            </div>
            <div style="display:flex;flex-direction:column;align-items:center;gap:2px;">
              ${isLive ? `<div class="live-score">${m.team1.score} - ${m.team2.score}</div>` : `<div class="live-vs">VS</div>`}
            </div>
            <div class="live-team">
              <img class="live-team-logo" src="${m.team2.avatar}" alt="${m.team2.name}" onerror="Utils.imgFallback(this)">
              <div class="live-team-name">${m.team2.abbreviation || m.team2.name}</div>
            </div>
          </div>
        </div>
      `;
    }).join('');

    return `
      <section class="live-section content-section section-appear">
        <div class="section-header">
          <h2 class="section-title">🔴 ${title}</h2>
        </div>
        <div class="live-scroll">${cards}</div>
      </section>
    `;
  }

  function buildError(title, text, onRetry) {
    return `
      <div class="error-state" style="padding-top:120px;">
        <div style="font-size:48px;">😕</div>
        <p style="font-size:1rem;font-weight:700;">${title}</p>
        <p>${text}</p>
        <button class="btn btn-primary" onclick="(${onRetry.toString()})()">Coba Lagi</button>
      </div>
    `;
  }

  return { render, removeFromHistory, clearHistory };
})();
