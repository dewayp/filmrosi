/* =============================================
   MOVIEBOX ROSI — Utilities
   ============================================= */

const Utils = (() => {

    /** Format seconds to "1h 45m" or "45m" */
    function formatDuration(seconds) {
        if (!seconds || seconds <= 0) return '';
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        if (h > 0) return `${h}h ${m}m`;
        if (m > 0) return `${m}m`;
        return `${s}s`;
    }

    /** Format "2026-03-06" → "Mar 2026" */
    function formatDate(dateStr) {
        if (!dateStr) return '';
        try {
            const d = new Date(dateStr);
            return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        } catch (_) { return dateStr; }
    }

    /** Format "2026-03-06" → year only "2026" */
    function formatYear(dateStr) {
        if (!dateStr) return '';
        return dateStr.slice(0, 4);
    }

    /** Format seconds as "01:23:45" or "23:45" */
    function formatTime(seconds) {
        if (!seconds || isNaN(seconds)) return '0:00';
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        const mm = String(m).padStart(2, '0');
        const ss = String(s).padStart(2, '0');
        return h > 0 ? `${h}:${mm}:${ss}` : `${m}:${ss}`;
    }

    /** Get badge label for subjectType */
    function getTypeBadge(subjectType) {
        switch (Number(subjectType)) {
            case 1: return { label: 'Movie', cls: 'badge-movie' };
            case 2: return { label: 'Series', cls: 'badge-series' };
            case 7: return { label: 'Short TV', cls: 'badge-short' };
            default: return { label: 'Video', cls: 'badge-movie' };
        }
    }

    /** Create N skeleton card elements and set them in a container */
    function showSkeletons(container, count = 6, horizontal = true) {
        if (!container) return;
        const html = Array.from({ length: count }, () => `
      <div class="skeleton-card">
        <div class="skeleton sk-image"></div>
        <div class="skeleton sk-text"></div>
        <div class="skeleton sk-text-short"></div>
      </div>
    `).join('');
        if (horizontal) {
            container.innerHTML = `<div class="section-scroll">${html}</div>`;
        } else {
            container.innerHTML = `<div class="card-grid">${html}</div>`;
        }
    }

    /** Show a toast notification */
    function showToast(message, type = 'info', duration = 3000) {
        const container = document.getElementById('toast-container');
        if (!container) return;
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        container.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transition = 'opacity 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }

    /** Debounce helper */
    function debounce(fn, delay = 300) {
        let timer;
        return function (...args) {
            clearTimeout(timer);
            timer = setTimeout(() => fn.apply(this, args), delay);
        };
    }

    /** Lazy load images via IntersectionObserver */
    function lazyLoad(container = document) {
        const imgs = container.querySelectorAll('img[data-src]');
        if (!imgs.length) return;

        if ('IntersectionObserver' in window) {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        img.src = img.dataset.src;
                        img.removeAttribute('data-src');
                        observer.unobserve(img);
                    }
                });
            }, { rootMargin: '200px' });

            imgs.forEach(img => observer.observe(img));
        } else {
            imgs.forEach(img => {
                img.src = img.dataset.src;
                img.removeAttribute('data-src');
            });
        }
    }

    /** Generate genre tags HTML */
    function genreTags(genreStr) {
        if (!genreStr) return '';
        return genreStr.split(',').map(g => g.trim()).filter(Boolean).slice(0, 4)
            .map(g => `<span class="genre-tag">${g}</span>`).join('');
    }

    /** Safe image placeholder */
    function imgFallback(el) {
        el.src = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 300'%3E%3Crect width='200' height='300' fill='%231a1a24'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%23606070' font-family='sans-serif' font-size='14'%3E🎬%3C/text%3E%3C/svg%3E`;
    }

    /** Update bottom nav active state */
    function setActiveNav(route) {
        document.querySelectorAll('.nav-item').forEach(item => {
            const r = item.dataset.route;
            item.classList.toggle('active', r === route || (route.startsWith(r) && r !== '/'));
            if (r === '/' && route === '/') item.classList.add('active');
        });
    }

    /** Convert SRT subtitle text to WebVTT format */
    function srtToVtt(srtText) {
        // SRT uses commas for milliseconds: 00:00:01,000 → VTT uses dots: 00:00:01.000
        const vtt = 'WEBVTT\n\n' + srtText
            .replace(/\r\n/g, '\n')
            .replace(/\r/g, '\n')
            .replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2')
            .trim();
        return vtt;
    }

    /**
     * Fetch a subtitle .srt file via the API proxy and return a Blob URL (WebVTT)
     * Falls back to direct fetch if proxy not needed or fails.
     */
    async function fetchSubtitleBlob(srtUrl) {
        try {
            // Use the API proxy endpoint to bypass CORS
            const proxyUrl = `https://api.sansekai.my.id/api/moviebox/proxy-subtitle?url=${encodeURIComponent(srtUrl)}`;
            let res = await fetch(proxyUrl);
            if (!res.ok) throw new Error('proxy failed');
            const text = await res.text();
            const vttText = srtToVtt(text);
            const blob = new Blob([vttText], { type: 'text/vtt' });
            return URL.createObjectURL(blob);
        } catch (_) {
            // Direct fallback
            try {
                const res = await fetch(srtUrl, { mode: 'cors' });
                const text = await res.text();
                const vttText = srtToVtt(text);
                const blob = new Blob([vttText], { type: 'text/vtt' });
                return URL.createObjectURL(blob);
            } catch (err) {
                console.warn('Subtitle fetch failed:', err.message);
                return null;
            }
        }
    }

    return {
        formatDuration, formatDate, formatYear, formatTime,
        getTypeBadge, showSkeletons, showToast, debounce,
        lazyLoad, genreTags, imgFallback, setActiveNav,
        srtToVtt, fetchSubtitleBlob
    };
})();
