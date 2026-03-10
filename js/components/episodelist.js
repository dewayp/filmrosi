/* =============================================
   MOVIEBOX ROSI — Episode List Component
   ============================================= */

const EpisodeList = (() => {

  /**
   * Render season tabs + episode grid
   * @param {number} totalSeasons
   * @param {number} totalEpisodes (per visible season)
   * @param {number} activeSeason
   * @param {number} activeEpisode
   * @param {function(season, episode)} onSelect
   */
  function createHTML(totalSeasons, episodeCountPerSeason, activeSeason, activeEpisode, inPlayer = false) {
    const seasons = Array.from({ length: totalSeasons }, (_, i) => i + 1);
    const epCount = episodeCountPerSeason[activeSeason] || 20;
    const episodes = Array.from({ length: epCount }, (_, i) => i + 1);

    const seasonTabs = seasons.map(s => `
      <button class="season-tab ${s === activeSeason ? 'active' : ''}"
        onclick="EpisodeList.onSeasonChange(${s}, ${inPlayer ? 'true' : 'false'})">
        Season ${s}
      </button>
    `).join('');

    const episodeButtons = episodes.map(e => {
      const isDl = window.Downloads ? window.Downloads.isDownloaded(window.currentSubjectIdForEpisodeList, activeSeason, e) : false;
      const isDling = window.Downloads ? window.Downloads.isDownloading(window.currentSubjectIdForEpisodeList, activeSeason, e) : false;

      let dlIcon = `
        <button class="ep-download-btn" data-season="${activeSeason}" data-episode="${e}" onclick="event.stopPropagation(); EpisodeList.onDownloadSelect(${activeSeason}, ${e}, ${inPlayer ? 'true' : 'false'})">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
        </button>
      `;
      if (isDl) dlIcon = `<div class="ep-download-btn"><svg viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2" stroke-linecap="round"><path d="M20 6L9 17l-5-5"/></svg></div>`;
      if (isDling) dlIcon = `<div class="ep-download-btn"><svg viewBox="0 0 24 24" fill="none" class="spin" stroke="var(--text-muted)" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a10 10 0 0 1 10 10"/></svg></div>`;

      return `
      <div class="episode-btn-wrap">
        <button class="episode-btn ${e === activeEpisode ? 'active' : ''}"
          onclick="EpisodeList.onEpisodeSelect(${activeSeason}, ${e}, ${inPlayer ? 'true' : 'false'})">
          ${e}
        </button>
        ${dlIcon}
      </div>
      `;
    }).join('');

    return `
      <div class="episode-section" id="episode-section">
        <h3 class="episode-section-title">Episode</h3>
        <div class="season-tabs" id="season-tabs">${seasonTabs}</div>
        <div class="episode-grid" id="episode-grid">${episodeButtons}</div>
      </div>
    `;
  }

  /** Called when season tab is clicked */
  function onSeasonChange(season, inPlayer) {
    // Re-render episodes for this season (called from page)
    if (inPlayer) {
      PlayerPage.changeSeason(season);
    } else {
      DetailPage.changeSeason(season);
    }
  }

  /** Called when episode button is clicked */
  function onEpisodeSelect(season, episode, inPlayer) {
    if (inPlayer) {
      PlayerPage.switchEpisode(season, episode);
    } else {
      DetailPage.playEpisode(season, episode);
    }
  }

  /** Called when download button is clicked */
  function onDownloadSelect(season, episode, inPlayer) {
    if (inPlayer) {
      PlayerPage.downloadEpisode(season, episode);
    } else {
      DetailPage.downloadEpisode(season, episode);
    }
  }

  return { createHTML, onSeasonChange, onEpisodeSelect, onDownloadSelect };
})();
