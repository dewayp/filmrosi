/* =============================================
   MOVIEBOX ROSI — Hero Banner Component
   ============================================= */

const Hero = (() => {
    let currentIdx = 0;
    let autoTimer = null;
    let touchStartX = 0;
    let touchEndX = 0;

    function createHTML(items) {
        if (!items || items.length === 0) return '';

        const slides = items.map((item, i) => {
            const s = item.subject || {};
            const title = s.title || item.title || '';
            const imgUrl = item.image?.url || s.cover?.url || '';
            const genre = s.genre || '';
            const rating = parseFloat(s.imdbRatingValue) > 0 ? s.imdbRatingValue : null;
            const country = s.countryName || '';
            const { label: typeLabel, cls: typeCls } = Utils.getTypeBadge(s.subjectType);
            const subjectId = s.subjectId || item.subjectId;
            const subjectType = s.subjectType || item.subjectType;

            return `
        <div class="hero-slide">
          <img
            class="hero-slide-img"
            src="${i === 0 ? imgUrl : 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 1920 1080\'%3E%3Crect width=\'1920\' height=\'1080\' fill=\'%231a1a24\'/%3E%3C/svg%3E'}"
            data-src="${imgUrl}"
            alt="${title}"
            onerror="Utils.imgFallback(this)"
            draggable="false"
          />
          <div class="hero-slide-overlay"></div>
          <div class="hero-slide-content">
            <div class="hero-slide-type">
              <span class="badge ${typeCls}">${typeLabel}</span>
              ${country ? `<span class="text-secondary text-sm">· ${country}</span>` : ''}
            </div>
            <h1 class="hero-slide-title">${title}</h1>
            <div class="hero-slide-meta">
              ${rating ? `
                <span class="imdb-rating">
                  <svg class="imdb-star" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                  ${rating}
                </span>
                <span>·</span>
              ` : ''}
              ${genre ? `<span>${genre.split(',').slice(0, 2).join(', ')}</span>` : ''}
            </div>
            <div class="hero-slide-actions">
              <button class="btn btn-primary btn-lg" onclick="Router.navigate('/detail', { subjectId: '${subjectId}', subjectType: '${subjectType}' })">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>
                Tonton
              </button>
              <button class="btn btn-secondary" onclick="Router.navigate('/detail', { subjectId: '${subjectId}', subjectType: '${subjectType}' })">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
                Detail
              </button>
            </div>
          </div>
        </div>
      `;
        }).join('');

        const dots = items.map((_, i) =>
            `<div class="hero-dot${i === 0 ? ' active' : ''}" data-idx="${i}"></div>`
        ).join('');

        return `
      <div class="hero-banner" id="hero-banner">
        <div class="hero-slides" id="hero-slides">${slides}</div>
        <div class="hero-dots" id="hero-dots">${dots}</div>
        ${items.length > 1 ? `
          <button class="hero-arrow hero-arrow-prev" id="hero-prev" aria-label="Previous">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <button class="hero-arrow hero-arrow-next" id="hero-next" aria-label="Next">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        ` : ''}
      </div>
    `;
    }

    function init(items) {
        if (!items || items.length === 0) return;
        currentIdx = 0;
        clearInterval(autoTimer);

        const banner = document.getElementById('hero-banner');
        const slides = document.getElementById('hero-slides');
        const dots = document.getElementById('hero-dots');
        const prev = document.getElementById('hero-prev');
        const next = document.getElementById('hero-next');

        if (!banner || !slides) return;

        // Lazy load non-first images
        const imgs = slides.querySelectorAll('img[data-src]');
        setTimeout(() => Utils.lazyLoad(slides), 100);

        function goTo(idx) {
            currentIdx = (idx + items.length) % items.length;
            slides.style.transform = `translateX(-${currentIdx * 100}%)`;
            document.querySelectorAll('.hero-dot').forEach((d, i) => {
                d.classList.toggle('active', i === currentIdx);
            });
        }

        // Arrow buttons
        prev?.addEventListener('click', () => goTo(currentIdx - 1));
        next?.addEventListener('click', () => goTo(currentIdx + 1));

        // Dots
        dots?.querySelectorAll('.hero-dot').forEach(dot => {
            dot.addEventListener('click', () => goTo(parseInt(dot.dataset.idx)));
        });

        // Touch swipe
        banner.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; }, { passive: true });
        banner.addEventListener('touchend', e => {
            touchEndX = e.changedTouches[0].clientX;
            const diff = touchStartX - touchEndX;
            if (Math.abs(diff) > 40) goTo(diff > 0 ? currentIdx + 1 : currentIdx - 1);
        }, { passive: true });

        // Auto slide every 5s
        autoTimer = setInterval(() => goTo(currentIdx + 1), 5000);
        banner.addEventListener('mouseover', () => clearInterval(autoTimer));
        banner.addEventListener('mouseleave', () => {
            autoTimer = setInterval(() => goTo(currentIdx + 1), 5000);
        });
    }

    return { createHTML, init };
})();
