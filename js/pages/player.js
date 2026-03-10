/* =============================================
   MOVIEBOX ROSI — Player Page
   ============================================= */

const PlayerPage = (() => {
  let playerState = null;
  let videoEl = null;
  let epPanelOpen = false;

  async function render(container) {
    playerState = State.get('player');
    if (!playerState?.streamUrl) {
      Router.back();
      Utils.showToast('Tidak ada video untuk diputar', 'error');
      return;
    }

    const { title, season, episode, subjectType, streamUrl, totalSeasons, totalEpisodes, captions, allSources } = playerState;
    const isSeries = subjectType === 2 || subjectType === 7;
    const epLabel = isSeries ? `S${season} · E${episode}` : '';

    // Build season episode map for panel
    const episodeMap = {};
    for (let s = 1; s <= (totalSeasons || 1); s++) episodeMap[s] = totalEpisodes || 20;

    const speedOptions = PlayerControls.SPEEDS.map(s =>
      `<div class="speed-option ${s === 1 ? 'active' : ''}" data-speed="${s}" onclick="PlayerControls.setSpeed(${s})">${s}x</div>`
    ).join('');

    // Build subtitle tracks HTML
    let defaultLang = '';
    const hasId = captions?.some(c => c.lan === 'in_id');
    if (hasId) defaultLang = 'in_id';
    else if (captions?.some(c => c.lan === 'en')) defaultLang = 'en';
    else if (captions?.length > 0) defaultLang = captions[0].lan;

    const tracksHtml = (captions || []).map(c =>
      `<track label="${c.lanName}" kind="subtitles" srclang="${c.lan}" src="${c.url}" ${c.lan === defaultLang ? 'default' : ''}>`
    ).join('\n');

    const ccOptions = `
      <div class="menu-option ${!defaultLang ? 'active' : ''}" data-cc="off" onclick="PlayerControls.setSubtitle('off')">Off</div>
      ${(captions || []).map(c =>
      `<div class="menu-option ${c.lan === defaultLang ? 'active' : ''}" data-cc="${c.lan}" onclick="PlayerControls.setSubtitle('${c.lan}')">${c.lanName}</div>`
    ).join('')}
    `;

    const qtyOptions = (allSources || []).map(s =>
      `<div class="menu-option ${s.directUrl === streamUrl || s.url === streamUrl ? 'active' : ''}" data-qty="${s.quality || s.resolution}" onclick="PlayerControls.setQuality('${s.quality || s.resolution}', '${s.directUrl || s.url}')">${s.quality || s.resolution}p</div>`
    ).reverse().join('');

    container.innerHTML = `
      <div class="player-page" id="player-page">
        <!-- Video -->
        <div class="player-video-wrap">
          <video
            crossorigin="anonymous"
            class="player-video"
            id="player-video"
            src="${streamUrl}"
            playsinline
            preload="auto"
            autoplay
          >
          </video>

          <!-- Loading Spinner -->
          <div class="player-spinner" id="player-spinner"></div>

          <!-- Error State -->
          <div class="player-error" id="player-error">
            <div class="player-error-icon">⚠️</div>
            <div class="player-error-title">Gagal Memuat Video</div>
            <p class="player-error-text">Sumber video tidak dapat diputar. Silakan kembali dan coba lagi.</p>
            <button class="btn btn-outline" style="margin-top:var(--space-md);" onclick="Router.back()">← Kembali</button>
          </div>

          <!-- Controls Overlay -->
          <div class="player-controls-overlay" id="player-controls-overlay">

            <!-- Top Bar -->
            <div class="player-top-bar">
              <button class="player-back-btn" onclick="PlayerPage.exitPlayer()">
                <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="15 18 9 12 15 6"/>
                </svg>
              </button>
              <div class="player-title-block">
                <div class="player-title">${title}</div>
                ${epLabel ? `<div class="player-episode-label">${epLabel}</div>` : ''}
              </div>
            </div>

            <!-- Center Controls -->
            <div class="player-center-controls">
              ${isSeries ? `
                <button class="player-ctrl-btn" onclick="PlayerPage.prevEpisode()" ${episode <= 1 ? 'disabled' : ''}>
                  <svg viewBox="0 0 24 24" fill="white"><path d="M6 6h2v12H6zm3.5 6 8.5 6V6z"/></svg>
                </button>
              ` : ''}
              <button class="player-ctrl-btn" onclick="PlayerControls.rewind()">
                <svg viewBox="0 0 24 24" fill="white">
                  <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/>
                  <text x="12" y="15.5" text-anchor="middle" fill="white" font-size="7" font-weight="bold" font-family="sans-serif">15</text>
                </svg>
              </button>
              <button class="player-ctrl-btn play-pause-btn" id="play-pause-btn" onclick="PlayerControls.togglePlayPause()">
                <svg viewBox="0 0 24 24" fill="white"><rect x="6" y="5" width="4" height="14"/><rect x="14" y="5" width="4" height="14"/></svg>
              </button>
              <button class="player-ctrl-btn" onclick="PlayerControls.forward()">
                <svg viewBox="0 0 24 24" fill="white">
                  <path d="M12 5V1l5 5-5 5V7c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6h2c0 4.42-3.58 8-8 8s-8-3.58-8-8 3.58-8 8-8z"/>
                  <text x="12" y="15.5" text-anchor="middle" fill="white" font-size="7" font-weight="bold" font-family="sans-serif">15</text>
                </svg>
              </button>
              ${isSeries ? `
                <button class="player-ctrl-btn" onclick="PlayerPage.nextEpisode()">
                  <svg viewBox="0 0 24 24" fill="white"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
                </button>
              ` : ''}
            </div>

            <!-- Bottom Bar -->
            <div class="player-bottom-bar">
              <!-- Seek -->
              <div class="player-seek-wrap">
                <span class="player-time player-time-current">0:00</span>
                <input type="range" class="player-seek" min="0" max="100" value="0" step="0.1">
                <span class="player-time player-time-total">0:00</span>
              </div>
              <!-- Controls Row -->
              <div class="player-controls-row">
                <button class="player-vol-btn" id="vol-btn" onclick="PlayerControls.toggleMute(this)">
                  <svg viewBox="0 0 24 24" fill="white">
                    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05C15.48 15.29 16.5 13.77 16.5 12zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06C18.01 19.86 21 16.28 21 12s-2.99-7.86-7-8.77z"/>
                  </svg>
                </button>
                <button class="player-speed-btn" id="player-speed-btn" onclick="PlayerControls.showSpeedMenu()">
                  <svg viewBox="0 0 24 24" fill="white"><path d="M20.38 8.57l-1.23 1.85a8 8 0 0 1-.22 7.58H5.07A8 8 0 0 1 15.58 6.85l1.85-1.23A10 10 0 0 0 3.35 19a2 2 0 0 0 1.72 1h13.85a2 2 0 0 0 1.74-1 10 10 0 0 0-.27-10.44zm-9.79 6.84a2 2 0 0 0 2.83 0l5.66-8.49-8.49 5.66a2 2 0 0 0 0 2.83z"/></svg>
                  <span>1x</span>
                </button>
                <div class="spacer"></div>
                ${captions && captions.length > 0 ? `
                  <button class="player-cc-btn" id="player-cc-btn" onclick="PlayerControls.toggleMenu('cc-popup')">
                    <svg viewBox="0 0 24 24" fill="white"><path d="M19 4H5c-1.11 0-2 .9-2 2v12c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-8 7H9.5v-.5h-2v3h2V13H11v1.5c0 .28-.22.5-.5.5h-3c-.28 0-.5-.22-.5-.5v-4c0-.28.22-.5.5-.5h3c.28 0 .5.22.5.5V11zm7 0h-1.5v-.5h-2v3h2V13H18v1.5c0 .28-.22.5-.5.5h-3c-.28 0-.5-.22-.5-.5v-4c0-.28.22-.5.5-.5h3c.28 0 .5.22.5.5V11z"/></svg>
                  </button>
                ` : ''}
                ${allSources && allSources.length > 1 ? `
                  <button class="player-qty-btn" id="player-qty-btn" onclick="PlayerControls.toggleMenu('qty-popup')">
                    <svg viewBox="0 0 24 24" fill="white"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.06-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.488.488 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.41H9.07c-.24 0-.45.17-.48.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L1.71 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.06.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .43-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.49-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>
                  </button>
                ` : ''}
                ${isSeries ? `
                  <button class="player-ep-btn" onclick="PlayerPage.toggleEpPanel()">
                    <svg viewBox="0 0 24 24" fill="white"><path d="M3 5h2V3c-1.1 0-2 .9-2 2zm0 8h2v-2H3v2zm4 8h2v-2H7v2zM3 9h2V7H3v2zm10-6h-2v2h2V3zm6 0v2h2c0-1.1-.9-2-2-2zM5 21v-2H3c0 1.1.9 2 2 2zm-2-4h2v-2H3v2zM9 3H7v2h2V3zm2 18h2v-2h-2v2zm8-8h2v-2h-2v2zm0 8c1.1 0 2-.9 2-2h-2v2zm0-12h2V7h-2v2zm0 8h2v-2h-2v2zm-4 4h2v-2h-2v2zm0-16h2V3h-2v2z"/></svg>
                    Episode
                  </button>
                ` : ''}
                <button class="player-fullscreen-btn" onclick="PlayerControls.toggleFullscreen()">
                  <svg viewBox="0 0 24 24" fill="white"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>
                </button>
              </div>

              <!-- Popup Menus -->
              <div class="player-popup" id="speed-popup">
                <div class="popup-title">Kecepatan</div>
                ${speedOptions}
              </div>
              <div class="player-popup" id="cc-popup">
                <div class="popup-title">Subtitle</div>
                ${ccOptions}
              </div>
              <div class="player-popup" id="qty-popup">
                <div class="popup-title">Kualitas Video</div>
                ${qtyOptions}
              </div>
            </div>

          </div>

          <!-- Episode Panel (Series) -->
          ${isSeries ? `
            <div class="player-ep-panel" id="player-ep-panel">
              <div class="player-ep-panel-header">
                <span class="player-ep-panel-title">Pilih Episode</span>
                <button class="player-ep-panel-close" onclick="PlayerPage.toggleEpPanel()">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
              ${EpisodeList.createHTML(totalSeasons || 1, episodeMap, season || 1, episode || 1, true)}
            </div>
          ` : ''}

        </div>
      </div>
    `;

    // Initialize controls
    videoEl = document.getElementById('player-video');
    const overlay = document.getElementById('player-controls-overlay');
    if (videoEl && overlay) {
      PlayerControls.init(videoEl, overlay);
    }
  }

  function exitPlayer() {
    if (videoEl) {
      videoEl.pause();
      videoEl.src = '';
    }
    Router.back();
  }

  function toggleEpPanel() {
    const panel = document.getElementById('player-ep-panel');
    if (!panel) return;
    epPanelOpen = !epPanelOpen;
    panel.classList.toggle('open', epPanelOpen);
    PlayerControls.showControls(epPanelOpen);
  }

  async function switchEpisode(season, episode) {
    if (!playerState) return;
    Utils.showToast(`Memuat S${season}E${episode}...`, 'info', 2000);

    try {
      const sourcesData = await API.getSources(playerState.subjectId, season, episode);
      // API returns downloads[] or processedSources[]
      const dlList = sourcesData.processedSources || sourcesData.downloads || [];
      if (!dlList.length) throw new Error('Sumber tidak tersedia');

      const captions = sourcesData.captions || [];

      // Pick best quality (last = highest resolution)
      const best = dlList[dlList.length - 1];
      const rawUrl = best.directUrl || best.url;
      if (!rawUrl) throw new Error('URL video tidak ditemukan');

      const genData = await API.generateStreamUrl(rawUrl);
      if (!genData.success || !genData.streamUrl) throw new Error(genData.message);

      playerState.season = season;
      playerState.episode = episode;
      playerState.streamUrl = genData.streamUrl;
      playerState.allSources = dlList;
      playerState.captions = captions;
      State.set('player', playerState);

      if (videoEl) {
        videoEl.src = genData.streamUrl;
        videoEl.play();
      }

      // Update title bar
      const epLabel = document.querySelector('.player-episode-label');
      if (epLabel) epLabel.textContent = `S${season} · E${episode}`;

      // Close panel
      if (epPanelOpen) toggleEpPanel();
      Utils.showToast(`S${season}E${episode} sedang diputar`, 'success');

    } catch (err) {
      Utils.showToast('Gagal memuat episode: ' + err.message, 'error');
    }
  }

  function changeSeason(season) {
    // Re-render episode grid inside panel with new season
    const epSection = document.querySelector('#player-ep-panel #episode-section');
    if (!epSection || !playerState) return;
    const episodeMap = {};
    for (let s = 1; s <= (playerState.totalSeasons || 1); s++) episodeMap[s] = playerState.totalEpisodes || 20;
    epSection.outerHTML = EpisodeList.createHTML(
      playerState.totalSeasons || 1, episodeMap, season, 1, true
    );
  }

  function nextEpisode() {
    if (!playerState) return;
    const nextEp = (playerState.episode || 1) + 1;
    if (nextEp > (playerState.totalEpisodes || 20)) {
      Utils.showToast('Ini episode terakhir', 'info');
      return;
    }
    switchEpisode(playerState.season || 1, nextEp);
  }

  function prevEpisode() {
    if (!playerState) return;
    const prevEp = (playerState.episode || 1) - 1;
    if (prevEp < 1) {
      Utils.showToast('Ini episode pertama', 'info');
      return;
    }
    switchEpisode(playerState.season || 1, prevEp);
  }

  return { render, exitPlayer, toggleEpPanel, switchEpisode, changeSeason, nextEpisode, prevEpisode };
})();
