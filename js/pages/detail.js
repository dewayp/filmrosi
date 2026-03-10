/* =============================================
   MOVIEBOX ROSI — Detail Page
   ============================================= */

const DetailPage = (() => {
  let currentSubject = null;
  let currentSeasonEpisodes = {};
  let activeSeason = 1;
  let activeEpisode = 1;
  let TOTAL_SEASONS = 1;

  async function render(container, params = {}) {
    const subjectId = params.subjectId || Router.getQueryParam('id');
    window.currentSubjectIdForEpisodeList = subjectId;
    if (!subjectId) {
      container.innerHTML = `<div class="empty-state"><p class="empty-state-title">Konten tidak ditemukan</p></div>`;
      return;
    }

    // Show skeleton
    container.innerHTML = `
      <div class="page" id="detail-page">
        <div class="skeleton" style="height:300px;border-radius:0;"></div>
        <div style="padding:var(--space-md);">
          <div class="skeleton" style="height:24px;width:70%;margin-bottom:10px;"></div>
          <div class="skeleton" style="height:16px;width:50%;margin-bottom:20px;"></div>
          <div class="skeleton" style="height:44px;border-radius:999px;width:140px;"></div>
        </div>
      </div>
    `;

    try {
      const cacheKey = `detail_${subjectId}`;
      let data = Cache.get(cacheKey);
      if (!data) {
        data = await API.getDetail(subjectId);
        Cache.set(cacheKey, data, 10 * 60 * 1000);
      }

      const subject = data.subject || data;
      currentSubject = subject;
      activeSeason = 1;
      activeEpisode = 1;

      const {
        title, description, releaseDate, duration,
        genre, subjectType, cover, imdbRatingValue, imdbRatingCount,
        countryName, subtitles, corner
      } = subject;

      const coverUrl = cover?.url || '';
      const isMovie = Number(subjectType) === 1;
      const isSeries = Number(subjectType) === 2 || Number(subjectType) === 7;
      const { label: typeLabel, cls: typeCls } = Utils.getTypeBadge(subjectType);
      const rating = parseFloat(imdbRatingValue) > 0 ? imdbRatingValue : null;
      const year = Utils.formatYear(releaseDate);
      const dur = isMovie ? Utils.formatDuration(duration) : null;
      const ratingCount = parseInt(imdbRatingCount) > 0
        ? `(${imdbRatingCount.toLocaleString()})` : '';

      // Read season/episode data from resource.seasons (accurate from API)
      if (isSeries) {
        const seasons = data.resource?.seasons || [];
        if (seasons.length > 0) {
          TOTAL_SEASONS = seasons.length;
          currentSeasonEpisodes = {};
          seasons.forEach(s => {
            currentSeasonEpisodes[s.se] = s.maxEp || 20;
          });
        } else {
          TOTAL_SEASONS = 1;
          currentSeasonEpisodes = { 1: 20 };
        }
      }

      const page = document.getElementById('detail-page');
      if (!page) return;

      page.innerHTML = `
        <!-- Backdrop -->
        <div class="detail-backdrop">
          <img class="detail-backdrop-img" src="${coverUrl}" alt="${title}" onerror="Utils.imgFallback(this)"/>
          <div class="detail-backdrop-overlay"></div>
        </div>

        <!-- Poster + Title -->
        <div class="detail-poster-section">
          <img class="detail-poster" src="${coverUrl}" alt="${title}" onerror="Utils.imgFallback(this)"/>
          <div class="detail-title-block">
            <h1 class="detail-title">${title}</h1>
            <div class="detail-badges">
              <span class="badge ${typeCls}">${typeLabel}</span>
              ${corner ? `<span class="badge badge-new">${corner}</span>` : ''}
            </div>
            ${rating ? `
              <div class="detail-rating">
                <svg viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                ${rating} ${ratingCount}
              </div>
            ` : ''}
            <div class="detail-meta">
              ${year ? `<span>${year}</span>` : ''}
              ${dur ? `<span class="detail-meta-dot">${dur}</span>` : ''}
              ${countryName ? `<span class="detail-meta-dot">${countryName}</span>` : ''}
            </div>
          </div>
        </div>

        <!-- Body -->
        <div class="detail-body">
          ${genre ? `<div class="genre-list" style="margin-bottom:var(--space-md);">${Utils.genreTags(genre)}</div>` : ''}

          ${description ? `<p class="detail-description">${description}</p>` : ''}

          <!-- Action Buttons -->
          <div class="detail-actions">
            ${isMovie ? `
              <button class="btn btn-primary btn-lg" id="play-btn" onclick="DetailPage.playMovie()">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>
                Tonton
              </button>
              <button class="btn btn-secondary btn-lg" id="download-btn-movie" onclick="DetailPage.downloadMovie()" style="border: 1px solid var(--border);">
                ${getMovieDownloadButtonHtml(subjectId)}
              </button>
            ` : `
              <button class="btn btn-primary btn-lg" id="play-btn" onclick="DetailPage.playEpisode(${activeSeason}, ${activeEpisode})">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>
                Tonton S${activeSeason}E${activeEpisode}
              </button>
            `}
          </div>

          <!-- Episode Selector (for series) -->
          ${isSeries ? EpisodeList.createHTML(TOTAL_SEASONS, currentSeasonEpisodes, activeSeason, activeEpisode, false) : ''}
        </div>
      `;

      // Add to watch history
      State.addToHistory(subject);

      // Listen to download changes
      window.addEventListener('mbr-download-started', handleDownloadUpdate);
      window.addEventListener('mbr-download-completed', handleDownloadUpdate);
      window.addEventListener('mbr-download-failed', handleDownloadUpdate);

    } catch (err) {
      console.error('Detail error:', err);
      const page = document.getElementById('detail-page');
      if (page) page.innerHTML = `
        <div class="error-state" style="padding-top:120px;">
          <div style="font-size:48px;">😕</div>
          <p style="font-weight:700;margin-bottom:8px;">Gagal Memuat Detail</p>
          <p>${err.message}</p>
          <button class="btn btn-primary" style="margin-top:16px;" onclick="Router.back()">Kembali</button>
        </div>
      `;
      Utils.showToast('Gagal memuat detail konten', 'error');
    }
  }

  async function playMovie() {
    if (!currentSubject) return;
    const btn = document.getElementById('play-btn');
    if (btn) { btn.textContent = 'Memuat...'; btn.disabled = true; }

    try {
      await loadAndPlay(currentSubject.subjectId, currentSubject.subjectType, currentSubject.title, 0, 0);
    } catch (err) {
      if (btn) { btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg> Tonton`; btn.disabled = false; }
      Utils.showToast('Gagal mendapatkan link streaming: ' + err.message, 'error');
    }
  }

  async function playEpisode(season, episode) {
    if (!currentSubject) return;
    activeSeason = season;
    activeEpisode = episode;
    const btn = document.getElementById('play-btn');
    if (btn) { btn.textContent = 'Memuat...'; btn.disabled = true; }

    // Update episode grid active state
    document.querySelectorAll('.episode-btn').forEach(b => {
      b.classList.toggle('active', parseInt(b.textContent.trim()) === episode);
    });

    try {
      await loadAndPlay(
        currentSubject.subjectId,
        currentSubject.subjectType,
        currentSubject.title,
        season,
        episode
      );
    } catch (err) {
      if (btn) {
        btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg> Tonton S${season}E${episode}`;
        btn.disabled = false;
      }
      Utils.showToast('Gagal memuat episode: ' + err.message, 'error');
    }
  }

  async function loadAndPlay(subjectId, subjectType, title, season, episode) {
    // Step 1: Get sources
    // API returns: { downloads: [{url, resolution, size}], processedSources: [{directUrl, quality}] }
    const sourcesData = await API.getSources(subjectId, season, episode);

    // Prefer processedSources (has directUrl), fallback to downloads (has url)
    const dlList = sourcesData.processedSources || sourcesData.downloads || [];
    if (dlList.length === 0) throw new Error('Sumber video tidak tersedia');

    // Also get captions if they exist
    const captions = sourcesData.captions || [];

    // Pick best quality (last item = highest resolution)
    const best = dlList[dlList.length - 1];
    const rawUrl = best.directUrl || best.url;
    if (!rawUrl) throw new Error('URL video tidak ditemukan');

    // Step 2: Generate stream URL
    const genData = await API.generateStreamUrl(rawUrl);
    if (!genData.success || !genData.streamUrl) {
      throw new Error(genData.message || 'Gagal membuat link streaming');
    }

    // Step 3: Set player state & navigate
    State.set('player', {
      subjectId,
      subjectType: Number(subjectType),
      title,
      season,
      episode,
      streamUrl: genData.streamUrl,
      allSources: dlList,  // keep all resolutions for future quality switching
      captions: captions,  // subtitles
      totalSeasons: TOTAL_SEASONS,
      totalEpisodes: currentSeasonEpisodes[season] || 20,
    });

    Router.navigate('/player');
  }

  function changeSeason(season) {
    activeSeason = season;
    activeEpisode = 1;
    const epSection = document.getElementById('episode-section');
    if (epSection && currentSubject) {
      epSection.outerHTML = EpisodeList.createHTML(TOTAL_SEASONS, currentSeasonEpisodes, season, 1, false);
    }
    // Update play button
    const btn = document.getElementById('play-btn');
    if (btn) {
      btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg> Tonton S${season}E1`;
    }
  }

  function getMovieDownloadButtonHtml(subjectId) {
    if (!window.Downloads) return 'Download';
    if (window.Downloads.isDownloaded(subjectId, 0, 0)) {
      return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2" stroke-linecap="round"><path d="M20 6L9 17l-5-5"/></svg> Disimpan`;
    }
    if (window.Downloads.isDownloading(subjectId, 0, 0)) {
      const dlItem = window.Downloads.getStoredDownloads().find(d => d.subjectId === subjectId && d.season === 0 && d.episode === 0);
      const pct = dlItem && dlItem.progress > 0 ? ` ${dlItem.progress}%` : '';
      return `<svg width="18" height="18" class="spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a10 10 0 0 1 10 10"/></svg> Mengunduh${pct}`;
    }
    return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg> Download`;
  }

  function handleDownloadUpdate() {
    // If not detail page anymore, clean up listener
    if (!document.getElementById('detail-page')) {
      window.removeEventListener('mbr-download-started', handleDownloadUpdate);
      window.removeEventListener('mbr-download-completed', handleDownloadUpdate);
      window.removeEventListener('mbr-download-failed', handleDownloadUpdate);
      window.removeEventListener('mbr-download-progress', handleDownloadProgress);
      return;
    }

    if (!currentSubject) return;

    const isMovie = Number(currentSubject.subjectType) === 1;
    if (isMovie) {
      const btn = document.getElementById('download-btn-movie');
      if (btn) {
        btn.innerHTML = getMovieDownloadButtonHtml(currentSubject.subjectId);
      }
    } else {
      // Re-render episode grid
      const epSection = document.getElementById('episode-section');
      if (epSection) {
        epSection.outerHTML = EpisodeList.createHTML(TOTAL_SEASONS, currentSeasonEpisodes, activeSeason, activeEpisode, false);
      }
    }
  }

  function handleDownloadProgress(e) {
    if (!currentSubject || !document.getElementById('detail-page')) return;
    const { id, percent } = e.detail;

    const isMovie = Number(currentSubject.subjectType) === 1;
    if (isMovie) {
      // If it's this movie
      if (id === `${currentSubject.subjectId}_S0E0`) {
        const btn = document.getElementById('download-btn-movie');
        if (btn) btn.innerHTML = `<svg width="18" height="18" class="spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a10 10 0 0 1 10 10"/></svg> Mengunduh ${percent}%`;
      }
    } else {
      // It's a series episode
      // Locate the exact button because re-rendering whole grid will be too intensive
      const match = id.match(/_S(\d+)E(\d+)$/);
      if (match) {
        const s = parseInt(match[1]);
        const ep = parseInt(match[2]);
        if (s === activeSeason) {
          const btn = document.querySelector(`.ep-download-btn[data-season="${s}"][data-episode="${ep}"]`);
          if (btn) {
            btn.innerHTML = `<svg class="spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a10 10 0 0 1 10 10"/></svg><span style="font-size:10px">${percent}%</span>`;
          }
        }
      }
    }
  }

  async function downloadMovie() {
    if (!currentSubject) return;
    if (window.Downloads.isDownloaded(currentSubject.subjectId, 0, 0) || window.Downloads.isDownloading(currentSubject.subjectId, 0, 0)) return;

    try {
      // First UI update via event will happen, but we need url.
      // Let's get url first so we can show it's loading before starting real dl
      const btn = document.getElementById('download-btn-movie');
      if (btn) btn.innerHTML = `<svg width="18" height="18" class="spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a10 10 0 0 1 10 10"/></svg> Bersiap...`;

      const sourcesData = await API.getSources(currentSubject.subjectId, 0, 0);
      const dlList = sourcesData.processedSources || sourcesData.downloads || [];
      if (dlList.length === 0) throw new Error('Sumber video tidak tersedia');
      const captions = sourcesData.captions || [];
      const best = dlList[dlList.length - 1]; // highest quality
      const rawUrl = best.directUrl || best.url;

      // Generate true url
      const genData = await API.generateStreamUrl(rawUrl);
      if (!genData.success || !genData.streamUrl) throw new Error('Gagal mendapatkan url');

      const formattedSize = genData.fileInfo?.sizeFormatted || 'Unknown Size';
      const sizeBytes = genData.fileInfo?.size || 0;

      // Start background download
      Downloads.startDownload(currentSubject, 0, 0, genData.streamUrl, formattedSize, captions, sizeBytes);
      Utils.showToast('Unduhan film dimulai', 'success');
    } catch (err) {
      Utils.showToast('Gagal memulai unduhan: ' + err.message, 'error');
      handleDownloadUpdate(); // reset UI
    }
  }

  async function downloadEpisode(season, episode) {
    if (!currentSubject) return;
    if (window.Downloads.isDownloaded(currentSubject.subjectId, season, episode) || window.Downloads.isDownloading(currentSubject.subjectId, season, episode)) return;

    try {
      Utils.showToast(`Menyiapkan unduhan S${season}E${episode}...`, 'info');

      const sourcesData = await API.getSources(currentSubject.subjectId, season, episode);
      const dlList = sourcesData.processedSources || sourcesData.downloads || [];
      if (dlList.length === 0) throw new Error('Sumber video tidak tersedia');
      const captions = sourcesData.captions || [];
      const best = dlList[dlList.length - 1];
      const rawUrl = best.directUrl || best.url;

      const genData = await API.generateStreamUrl(rawUrl);
      if (!genData.success || !genData.streamUrl) throw new Error('Gagal mendapatkan url');

      const formattedSize = genData.fileInfo?.sizeFormatted || 'Unknown Size';
      const sizeBytes = genData.fileInfo?.size || 0;

      Downloads.startDownload(currentSubject, season, episode, genData.streamUrl, formattedSize, captions, sizeBytes);
      Utils.showToast(`Unduhan episode ${episode} dimulai`, 'success');
    } catch (err) {
      Utils.showToast('Gagal memulai unduhan: ' + err.message, 'error');
      handleDownloadUpdate();
    }
  }

  return { render, playMovie, playEpisode, changeSeason, downloadMovie, downloadEpisode };
})();
