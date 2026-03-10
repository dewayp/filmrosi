/* =============================================
   MOVIEBOX ROSI — Player Controls Component
   ============================================= */

const PlayerControls = (() => {
    let hideTimer = null;
    let videoEl = null;
    let overlayEl = null;
    let seekInput = null;
    let timeCurrentEl = null;
    let timeTotalEl = null;
    let playPauseBtn = null;
    let spinnerEl = null;
    let currentSpeed = 1;
    let currentCcSize = '1.1rem';
    let currentCcBg = 'rgba(0, 0, 0, 0.8)';
    let epPanelEl = null;
    let captionsMap = {}; // lang -> { url, blobUrl }
    let currentBlobUrls = []; // for cleanup

    const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];
    const SEEK_SECONDS = 15;

    // Play/Pause icons
    const PLAY_SVG = `<svg viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>`;
    const PAUSE_SVG = `<svg viewBox="0 0 24 24" fill="white"><rect x="6" y="5" width="4" height="14"/><rect x="14" y="5" width="4" height="14"/></svg>`;
    const VOL_ON_SVG = `<svg viewBox="0 0 24 24" fill="white"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05C15.48 15.29 16.5 13.77 16.5 12zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06C18.01 19.86 21 16.28 21 12s-2.99-7.86-7-8.77z"/></svg>`;
    const VOL_OFF_SVG = `<svg viewBox="0 0 24 24" fill="white"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>`;

    function showControls(force = false) {
        if (!overlayEl) return;
        overlayEl.classList.remove('hidden');
        clearTimeout(hideTimer);
        if (!force && !videoEl?.paused) {
            hideTimer = setTimeout(() => overlayEl?.classList.add('hidden'), 3000);
        }
    }

    function togglePlayPause() {
        if (!videoEl) return;
        if (videoEl.paused) { videoEl.play(); }
        else { videoEl.pause(); }
        showControls();
    }

    function updatePlayBtn() {
        if (!playPauseBtn) return;
        playPauseBtn.innerHTML = videoEl.paused ? PLAY_SVG : PAUSE_SVG;
    }

    function updateTime() {
        if (!timeCurrentEl || !seekInput || !videoEl) return;
        const cur = videoEl.currentTime || 0;
        const dur = videoEl.duration || 0;
        timeCurrentEl.textContent = Utils.formatTime(cur);
        if (timeTotalEl) timeTotalEl.textContent = Utils.formatTime(dur);
        if (dur > 0) seekInput.value = (cur / dur) * 100;
    }

    function seek(e) {
        if (!videoEl || !videoEl.duration) return;
        videoEl.currentTime = (e.target.value / 100) * videoEl.duration;
    }

    function rewind() {
        if (!videoEl) return;
        videoEl.currentTime = Math.max(0, videoEl.currentTime - SEEK_SECONDS);
        showControls();
    }

    function forward() {
        if (!videoEl) return;
        videoEl.currentTime = Math.min(videoEl.duration || 0, videoEl.currentTime + SEEK_SECONDS);
        showControls();
    }

    function toggleMute(btn) {
        if (!videoEl) return;
        videoEl.muted = !videoEl.muted;
        btn.innerHTML = videoEl.muted ? VOL_OFF_SVG : VOL_ON_SVG;
        showControls();
    }

    function setSpeed(speed) {
        if (!videoEl) return;
        currentSpeed = speed;
        videoEl.playbackRate = speed;
        const btn = document.getElementById('player-speed-btn');
        if (btn) btn.querySelector('span').textContent = speed === 1 ? '1x' : `${speed}x`;
        document.querySelectorAll('.speed-option').forEach(o => o.classList.toggle('active', parseFloat(o.dataset.speed) === speed));
        hideSpeedMenu();
        showControls(true);
    }

    function toggleMenu(menuId) {
        document.querySelectorAll('.player-popup').forEach(p => {
            if (p.id === menuId) p.classList.toggle('visible');
            else p.classList.remove('visible');
        });
    }

    async function setSubtitle(lang) {
        if (!videoEl) return;

        // Remove existing injected tracks
        videoEl.querySelectorAll('track[data-injected]').forEach(t => t.remove());
        currentBlobUrls.forEach(u => URL.revokeObjectURL(u));
        currentBlobUrls = [];

        // Hide all existing text tracks
        for (let i = 0; i < videoEl.textTracks.length; i++) {
            videoEl.textTracks[i].mode = 'hidden';
        }

        document.querySelectorAll('#cc-popup .menu-option').forEach(o => {
            o.classList.toggle('active', o.dataset.cc === lang);
        });
        toggleMenu('cc-popup');

        if (lang === 'off') {
            showControls(true);
            return;
        }

        const cap = captionsMap[lang];
        if (!cap) { showControls(true); return; }

        try {
            // Fetch and convert if we don't have a blob yet
            if (!cap.blobUrl) {
                cap.blobUrl = await Utils.fetchSubtitleBlob(cap.url);
                if (!cap.blobUrl) throw new Error('Failed to fetch subtitle');
            }

            currentBlobUrls.push(cap.blobUrl);

            // Inject new <track> element with Blob URL
            const track = document.createElement('track');
            track.kind = 'subtitles';
            track.srclang = lang;
            track.src = cap.blobUrl;
            track.label = cap.lanName;
            track.default = true;
            track.setAttribute('data-injected', '1');
            videoEl.appendChild(track);

            // Activate it after a short delay (browser needs time to parse VTT)
            setTimeout(() => {
                for (let i = 0; i < videoEl.textTracks.length; i++) {
                    if (videoEl.textTracks[i].language === lang) {
                        videoEl.textTracks[i].mode = 'showing';
                    }
                }
            }, 150);

        } catch (err) {
            Utils.showToast('Gagal memuat subtitle: ' + err.message, 'error');
        }

        showControls(true);
    }

    function setCcSize(size) {
        currentCcSize = size;
        document.documentElement.style.setProperty('--cc-size', size);
        localStorage.setItem('mbr_cc_size', size);
        document.querySelectorAll('.cc-size-opt').forEach(o => {
            o.classList.toggle('active', o.dataset.val === size);
        });
        showControls(true);
    }

    function setCcBg(bg) {
        currentCcBg = bg;
        document.documentElement.style.setProperty('--cc-bg', bg);
        localStorage.setItem('mbr_cc_bg', bg);
        document.querySelectorAll('.cc-bg-opt').forEach(o => {
            o.classList.toggle('active', o.dataset.val === bg);
        });
        showControls(true);
    }

    async function setQuality(quality, rawUrl) {
        if (!videoEl) return;

        // Show loading state
        if (spinnerEl) spinnerEl.classList.remove('hidden');
        const curTime = videoEl.currentTime;
        const wasPlaying = !videoEl.paused;

        try {
            // Generate new stream URL for this quality
            const genData = await API.generateStreamUrl(rawUrl);
            if (!genData.success || !genData.streamUrl) throw new Error(genData.message);

            // Apply new source
            if (typeof PlayerPage !== 'undefined' && typeof PlayerPage.loadVideo === 'function') {
                PlayerPage.loadVideo(genData.streamUrl, curTime, wasPlaying);
            } else {
                videoEl.src = genData.streamUrl;
                videoEl.currentTime = curTime;
                if (wasPlaying) videoEl.play();
            }

            // Update UI
            document.querySelectorAll('#qty-popup .menu-option').forEach(o => {
                o.classList.toggle('active', o.dataset.qty === quality.toString());
            });

            // Update state
            const state = State.get('player');
            if (state) {
                state.streamUrl = genData.streamUrl;
                State.set('player', state);
            }

            Utils.showToast(`Kualitas diubah ke ${quality}p`, 'success');
        } catch (err) {
            Utils.showToast('Gagal mengubah kualitas: ' + err.message, 'error');
            if (wasPlaying) videoEl.play();
        } finally {
            toggleMenu('qty-popup');
            if (spinnerEl) spinnerEl.classList.add('hidden');
            showControls(true);
        }
    }

    function toggleFullscreen() {
        const el = document.querySelector('.player-video-wrap') || document.documentElement;
        if (!document.fullscreenElement) {
            el.requestFullscreen?.() || el.webkitRequestFullscreen?.();
        } else {
            document.exitFullscreen?.() || document.webkitExitFullscreen?.();
        }
        showControls();
    }

    /**
     * Initialize controls on a video element
     * @param {HTMLVideoElement} video
     * @param {HTMLElement} wrapper - The .player-controls-overlay element
     */
    function init(video, wrapper) {
        videoEl = video;
        overlayEl = wrapper;
        seekInput = wrapper.querySelector('.player-seek');
        timeCurrentEl = wrapper.querySelector('.player-time-current');
        timeTotalEl = wrapper.querySelector('.player-time-total');
        playPauseBtn = wrapper.querySelector('.play-pause-btn');
        spinnerEl = document.querySelector('.player-spinner');
        epPanelEl = document.querySelector('.player-ep-panel');

        // Video events
        video.addEventListener('play', () => { updatePlayBtn(); showControls(); });
        video.addEventListener('pause', () => { updatePlayBtn(); showControls(true); });
        video.addEventListener('timeupdate', updateTime);
        video.addEventListener('loadedmetadata', updateTime);
        video.addEventListener('waiting', () => spinnerEl?.classList.remove('hidden'));
        video.addEventListener('canplay', () => spinnerEl?.classList.add('hidden'));
        video.addEventListener('error', () => {
            spinnerEl?.classList.add('hidden');
            const err = document.querySelector('.player-error');
            if (err) err.classList.add('visible');
        });

        // Seek
        seekInput?.addEventListener('input', seek);

        // Tap overlay to show/hide controls
        const videoWrap = video.parentElement;
        videoWrap?.addEventListener('click', (e) => {
            if (e.target === video || e.target === videoWrap) {
                if (overlayEl.classList.contains('hidden')) showControls();
                else togglePlayPause();
            }
        });

        // Popup close on outside click
        document.addEventListener('click', (e) => {
            if (!e.target.closest('#player-speed-btn') &&
                !e.target.closest('#player-cc-btn') &&
                !e.target.closest('#player-qty-btn') &&
                !e.target.closest('.player-popup')) {
                document.querySelectorAll('.player-popup').forEach(p => p.classList.remove('visible'));
            }
        });

        // Build captions map from player state
        const state = State.get('player');
        if (state?.captions?.length > 0) {
            captionsMap = {};
            state.captions.forEach(c => {
                captionsMap[c.lan] = { url: c.url, lanName: c.lanName, blobUrl: null };
            });

            // Auto-select default subtitle (Indonesian > English > first available)
            const defaultLang = state.captions.some(c => c.lan === 'in_id') ? 'in_id' :
                state.captions.some(c => c.lan === 'en') ? 'en' :
                    state.captions[0]?.lan;
            if (defaultLang) {
                // Auto-select after a slight delay
                setTimeout(() => setSubtitle(defaultLang), 500);
            }
        }

        // Load Subtitle Preferences
        const savedSize = localStorage.getItem('mbr_cc_size');
        if (savedSize) {
            currentCcSize = savedSize;
            document.documentElement.style.setProperty('--cc-size', savedSize);
        }
        const savedBg = localStorage.getItem('mbr_cc_bg');
        if (savedBg) {
            currentCcBg = savedBg;
            document.documentElement.style.setProperty('--cc-bg', savedBg);
        }

        showControls(true);
    }

    return {
        init, togglePlayPause, rewind, forward,
        toggleMute, setSpeed, toggleMenu, setSubtitle, setQuality,
        setCcSize, setCcBg,
        toggleFullscreen, showControls, SPEEDS, updatePlayBtn
    };
})();
