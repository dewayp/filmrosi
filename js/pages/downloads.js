/* =============================================
   MOVIEBOX ROSI — Downloads Page
   ============================================= */

const DownloadsPage = (() => {
  async function render(container, params = {}) {
    const downloads = Downloads.getStoredDownloads().filter(d => d.status === 'completed' || d.status === 'downloading');

    container.innerHTML = `
      <div class="page" id="downloads-page">
        <div class="search-page">
          <div class="section-header" style="padding: 20px 16px 10px;">
              <h2 class="section-title" style="font-size: 1.5rem;">Downloads Offline</h2>
          </div>
          <div id="downloads-results"></div>
        </div>
      </div>
    `;

    renderGrid(downloads);

    // Listen for download events to auto-refresh or update progress
    window.addEventListener('mbr-download-completed', handleUpdate);
    window.addEventListener('mbr-download-deleted', handleUpdate);
    window.addEventListener('mbr-download-progress', handleProgress);
  }

  function renderGrid(downloads) {
    const el = document.getElementById('downloads-results');
    if (!el) return;

    if (downloads.length === 0) {
      el.innerHTML = `
              <div class="empty-state">
                <div style="font-size:48px;">📥</div>
                <p class="empty-state-title">Belum Ada Download</p>
                <p class="empty-state-text">Film dan serial yang kamu download akan muncul di sini untuk ditonton saat offline.</p>
              </div>
            `;
      return;
    }

    const cards = downloads.map(item => {
      const isMovie = Number(item.subjectType) === 1;
      const subtitle = isMovie ? 'Film' : `S${item.season}E${item.episode}`;
      const isDownloading = item.status === 'downloading';
      const pctTxt = isDownloading ? (item.progress > 0 ? `Mengunduh ${item.progress}%` : 'Mengunduh...') : item.sizeFormatted;

      return `
              <div class="continue-card" style="margin-bottom: 12px;" onclick="DownloadsPage.playOffline('${item.subjectId}', ${item.subjectType}, '${item.title.replace(/'/g, "\\'")}', ${item.season}, ${item.episode})">
                <div class="continue-poster-wrap">
                  <img class="continue-poster" src="${item.cover}" alt="${item.title}" loading="lazy" onerror="Utils.imgFallback(this)"/>
                  <div class="continue-play-icon" style="opacity: ${isDownloading ? '0' : '1'}">
                    <svg viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>
                  </div>
                  <button class="continue-remove-btn" onclick="event.stopPropagation(); DownloadsPage.confirmDelete('${item.subjectId}', ${item.season}, ${item.episode})" title="Hapus">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                </div>
                <div class="continue-info">
                  <div class="continue-title" style="-webkit-line-clamp: 2;">${item.title}</div>
                  <div class="continue-meta" style="margin-top:4px;">${subtitle}</div>
                  <div class="detail-meta" id="dl-pct-${item.id}" style="${isDownloading ? 'color:var(--primary);' : ''}margin-top:4px;font-size:0.75rem;">${pctTxt}</div>
                </div>
              </div>
            `;
    }).join('');

    el.innerHTML = `<div class="section-scroll continue-scroll" style="display:flex; flex-direction:column; padding:0 16px 80px;">${cards}</div>`;
  }

  function handleUpdate() {
    const page = document.getElementById('downloads-page');
    if (page) {
      const downloads = Downloads.getStoredDownloads().filter(d => d.status === 'completed' || d.status === 'downloading');
      renderGrid(downloads);
    } else {
      // Clean up if page is gone
      window.removeEventListener('mbr-download-completed', handleUpdate);
      window.removeEventListener('mbr-download-deleted', handleUpdate);
      window.removeEventListener('mbr-download-progress', handleProgress);
    }
  }

  function handleProgress(e) {
    const { id, percent } = e.detail;
    const pctEl = document.getElementById(`dl-pct-${id}`);
    if (pctEl && percent !== null) {
      pctEl.textContent = `Mengunduh ${percent}%`;

      // Also save progress silently in background so if they navigate back, it's restored quickly
      const downloads = Downloads.getStoredDownloads();
      const idx = downloads.findIndex(d => d.id === id);
      if (idx !== -1) {
        downloads[idx].progress = percent;
        localStorage.setItem('mbr_downloads', JSON.stringify(downloads));
      }
    }
  }

  function confirmDelete(subjectId, season, episode) {
    if (confirm('Hapus video ini dari perangkat?')) {
      Downloads.deleteDownload(subjectId, season, episode);
    }
  }

  function playOffline(subjectId, subjectType, title, season, episode) {
    if (Downloads.isDownloading(subjectId, season, episode)) {
      Utils.showToast('Video sedang diunduh, harap tunggu', 'info');
      return;
    }

    const downloads = Downloads.getStoredDownloads();
    const item = downloads.find(d => d.subjectId === subjectId && d.season === season && d.episode === episode);
    const savedCaptions = item && item.captions ? item.captions : [];

    // Just configure player state and go. Target streamUrl won't matter because PlayerPage checks Downloads.getOfflineUrl anyway.
    State.set('player', {
      subjectId,
      subjectType,
      title,
      season,
      episode,
      streamUrl: 'OFFLINE_BLOB', // Mock, player will override
      allSources: [],
      captions: savedCaptions,
      totalSeasons: 1,
      totalEpisodes: episode // Not full list offline
    });

    Router.navigate('/player');
  }

  return { render, confirmDelete, playOffline };
})();
