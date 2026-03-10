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

        const episodeButtons = episodes.map(e => `
      <button class="episode-btn ${e === activeEpisode ? 'active' : ''}"
        onclick="EpisodeList.onEpisodeSelect(${activeSeason}, ${e}, ${inPlayer ? 'true' : 'false'})">
        ${e}
      </button>
    `).join('');

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

    return { createHTML, onSeasonChange, onEpisodeSelect };
})();
