/* =============================================
   MOVIEBOX ROSI — Card Component
   ============================================= */

const Card = (() => {

    function createHTML(subject, options = {}) {
        const {
            subjectId, subjectType, title, cover, genre,
            releaseDate, imdbRatingValue, corner, countryName, duration
        } = subject;

        const coverUrl = cover?.url || '';
        const { label: typeLabel, cls: typeCls } = Utils.getTypeBadge(subjectType);
        const year = Utils.formatYear(releaseDate);
        const dur = Utils.formatDuration(duration);
        const rating = parseFloat(imdbRatingValue) > 0 ? imdbRatingValue : null;
        const genrePrimary = genre?.split(',')[0]?.trim() || '';

        return `
      <div class="card" onclick="Router.navigate('/detail', { subjectId: '${subjectId}', subjectType: '${subjectType}' })" role="button" tabindex="0" aria-label="${title}">
        <div class="card-poster-wrap">
          <img
            class="card-poster"
            src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 300'%3E%3Crect width='200' height='300' fill='%231a1a24'/%3E%3C/svg%3E"
            data-src="${coverUrl}"
            alt="${title}"
            loading="lazy"
            onerror="Utils.imgFallback(this)"
          />
          <div class="card-overlay">
            <div class="card-play-btn">
              <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
            </div>
          </div>
          <span class="card-badge badge ${typeCls}">${typeLabel}</span>
          ${corner ? `<span class="card-corner-badge">${corner}</span>` : ''}
          ${rating ? `
            <div class="card-imdb">
              <svg viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
              ${rating}
            </div>
          ` : ''}
        </div>
        <div class="card-info">
          <div class="card-title">${title}</div>
          <div class="card-meta">${[genrePrimary, year, dur].filter(Boolean).join(' · ')}</div>
        </div>
      </div>
    `;
    }

    return { createHTML };
})();
