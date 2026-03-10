/* =============================================
   MOVIEBOX ROSI — Trending Page
   ============================================= */

const TrendingPage = (() => {
    let currentPage = 0;
    let hasMore = true;
    let isLoading = false;
    let allSubjects = [];

    async function render(container) {
        currentPage = 0;
        hasMore = true;
        allSubjects = [];

        container.innerHTML = `
      <div class="page" id="trending-page">
        <div class="trending-page-header">
          <h1 class="page-heading">🔥 Trending</h1>
          <p class="page-subheading">Film dan serial yang sedang populer</p>
        </div>
        <div id="trending-grid" class="card-grid"></div>
        <div class="load-more-wrap">
          <div class="skeleton" style="width:120px;height:42px;border-radius:999px;"></div>
        </div>
      </div>
    `;

        await loadMore(container);
    }

    async function loadMore(container) {
        if (isLoading || !hasMore) return;
        isLoading = true;

        try {
            const cacheKey = `trending_${currentPage}`;
            let data = Cache.get(cacheKey);
            if (!data) {
                data = await API.getTrending(currentPage);
                Cache.set(cacheKey, data, 3 * 60 * 1000);
            }

            const newSubjects = data.subjectList || [];
            allSubjects = [...allSubjects, ...newSubjects];
            hasMore = newSubjects.length >= 20;

            const grid = document.getElementById('trending-grid');
            if (grid) {
                newSubjects.forEach(s => {
                    grid.insertAdjacentHTML('beforeend', Card.createHTML(s));
                });
                Utils.lazyLoad(grid);
            }

            currentPage++;

            // Update load more button
            const wrap = container?.querySelector('.load-more-wrap');
            if (wrap) {
                if (hasMore) {
                    wrap.innerHTML = `<button class="btn btn-secondary" id="load-more-btn" onclick="TrendingPage.onLoadMore()">Muat Lebih Banyak</button>`;
                } else {
                    wrap.innerHTML = `<p class="text-muted text-sm" style="padding:var(--space-md);">Semua konten telah dimuat</p>`;
                }
            }

        } catch (err) {
            console.error('Trending error:', err);
            const wrap = container?.querySelector('.load-more-wrap');
            if (wrap) {
                wrap.innerHTML = `<button class="btn btn-outline" onclick="TrendingPage.onLoadMore()">Coba Lagi</button>`;
            }
            Utils.showToast('Gagal memuat trending', 'error');
        } finally {
            isLoading = false;
        }
    }

    function onLoadMore() {
        const btn = document.getElementById('load-more-btn');
        if (btn) { btn.textContent = 'Memuat...'; btn.disabled = true; }
        const page = document.getElementById('trending-page');
        loadMore(page?.parentElement);
    }

    return { render, onLoadMore };
})();
