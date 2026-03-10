/* =============================================
   MOVIEBOX ROSI — Section Component
   ============================================= */

const Section = (() => {

    /**
     * Creates a horizontal scroll section with cards
     * @param {string} title  - Section title
     * @param {Array} subjects - Array of subject objects
     * @param {string|null} seeAllRoute - Optional route for "Lihat Semua"
     */
    function createHTML(title, subjects, seeAllRoute = null) {
        if (!subjects || subjects.length === 0) return '';

        const cardsHtml = subjects.map(s => Card.createHTML(s)).join('');
        const seeAll = seeAllRoute
            ? `<button class="section-see-all" onclick="Router.navigate('${seeAllRoute}')">Lihat Semua</button>`
            : '';

        return `
      <section class="content-section section-appear">
        <div class="section-header">
          <h2 class="section-title">${title}</h2>
          ${seeAll}
        </div>
        <div class="section-scroll">
          ${cardsHtml}
        </div>
      </section>
    `;
    }

    return { createHTML };
})();
