/* =============================================
   MOVIEBOX ROSI — Section Page
   ============================================= */

const SectionPage = (() => {
    async function render(container, params = {}) {
        const opId = params.id;
        if (!opId) {
            container.innerHTML = '<div class="empty-state"><p class="empty-state-title">Halaman tidak ditemukan</p></div>';
            return;
        }

        container.innerHTML = `
      <div class="page" id="section-page">
        <!-- Loader initially -->
        <div style="padding:var(--space-md);padding-top:0">
            <div class="skeleton" style="height:200px;border-radius:12px;"></div>
        </div>
      </div>
    `;

        try {
            const cacheKey = 'homepage';
            let data = Cache.get(cacheKey);
            if (!data) {
                data = await API.getHomepage();
                Cache.set(cacheKey, data, 5 * 60 * 1000);
            }

            const ops = data.operatingList || [];
            const sectionOp = ops.find(o => o.opId === opId);

            if (!sectionOp) {
                const el = document.getElementById('section-page');
                if (el) el.innerHTML = '<div class="empty-state"><p class="empty-state-title">Bagian tidak ditemukan</p></div>';
                return;
            }

            const title = sectionOp.title || 'Daftar Film';
            const subjects = sectionOp.subjects || [];

            const pageEl = document.getElementById('section-page');
            if (pageEl) {
                pageEl.innerHTML = `
          <div class="section-page-content" style="padding-bottom: 80px;">
              <div class="section-header" style="margin-top: 20px; padding: 0 var(--space-md);">
                  <h2 class="section-title" style="font-size: 1.5rem;">${title}</h2>
              </div>
              <div class="card-grid" id="section-grid" style="margin-top: 16px;"></div>
          </div>
        `;

                const grid = document.getElementById('section-grid');
                if (grid) {
                    subjects.forEach(s => grid.insertAdjacentHTML('beforeend', Card.createHTML(s)));
                    Utils.lazyLoad(grid);
                }
            }
        } catch (err) {
            console.error('Section load error:', err);
            Utils.showToast('Gagal memuat data', 'error');
            const el = document.getElementById('section-page');
            if (el) el.innerHTML = '<div class="empty-state"><p class="empty-state-title">Gagal memuat konten</p></div>';
        }
    }

    return { render };
})();
