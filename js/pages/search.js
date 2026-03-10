/* =============================================
   MOVIEBOX ROSI — Search Page
   ============================================= */

const SearchPage = (() => {
    let currentQuery = '';
    let currentPage = 1;
    let hasMore = false;
    let isLoading = false;

    async function render(container, params = {}) {
        const initQuery = params.q ? decodeURIComponent(params.q) : '';

        container.innerHTML = `
      <div class="page" id="search-page">
        <div class="search-page">
          <div class="search-input-wrap">
            <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              class="search-input"
              id="search-input"
              type="search"
              placeholder="Cari film, serial, anime..."
              autocomplete="off"
              spellcheck="false"
              value="${initQuery}"
            />
            <button class="search-clear-btn ${initQuery ? 'visible' : ''}" id="search-clear" onclick="SearchPage.clearSearch()">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
          <div id="search-results"></div>
        </div>
      </div>
    `;

        const input = document.getElementById('search-input');
        const debouncedSearch = Utils.debounce((q) => doSearch(q, 1), 350);

        input?.addEventListener('input', (e) => {
            const q = e.target.value.trim();
            const clearBtn = document.getElementById('search-clear');
            if (clearBtn) clearBtn.classList.toggle('visible', q.length > 0);
            if (q.length === 0) {
                showEmptyState();
                return;
            }
            showSearching();
            debouncedSearch(q);
        });

        // Focus the input
        setTimeout(() => input?.focus(), 100);

        if (initQuery) {
            showSearching();
            await doSearch(initQuery, 1);
        } else {
            showEmptyState();
        }
    }

    async function doSearch(query, page = 1) {
        if (isLoading && page === currentPage) return;
        currentQuery = query;
        currentPage = page;
        isLoading = true;

        try {
            const data = await API.search(query, page);
            const items = data.items || [];
            const pager = data.pager || {};
            hasMore = pager.hasMore === true || pager.hasMore === 'true';

            const resultsEl = document.getElementById('search-results');
            if (!resultsEl) return;

            if (page === 1) {
                if (items.length === 0) {
                    showNoResults(query);
                    return;
                }
                const total = pager.totalCount || items.length;
                resultsEl.innerHTML = `
          <p class="search-stats">${total} hasil untuk "<strong>${query}</strong>"</p>
          <div class="card-grid" id="search-grid"></div>
          ${hasMore ? `<div class="load-more-wrap"><button class="btn btn-secondary" id="search-more-btn" onclick="SearchPage.loadMore()">Muat Lebih Banyak</button></div>` : ''}
        `;
            }

            const grid = document.getElementById('search-grid');
            if (grid) {
                items.forEach(s => grid.insertAdjacentHTML('beforeend', Card.createHTML(s)));
                Utils.lazyLoad(grid);
            }

            // Update load more button for subsequent pages
            if (page > 1) {
                const moreBtn = document.getElementById('search-more-btn');
                if (moreBtn) {
                    if (hasMore) { moreBtn.textContent = 'Muat Lebih Banyak'; moreBtn.disabled = false; }
                    else moreBtn.closest('.load-more-wrap').innerHTML = '';
                }
            }

        } catch (err) {
            console.error('Search error:', err);
            Utils.showToast('Pencarian gagal, coba lagi', 'error');
        } finally {
            isLoading = false;
        }
    }

    function showEmptyState() {
        const el = document.getElementById('search-results');
        if (el) el.innerHTML = `
      <div class="empty-state">
        <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <p class="empty-state-title">Cari Film atau Serial</p>
        <p class="empty-state-text">Ketik judul film, serial, atau anime yang ingin kamu tonton</p>
      </div>
    `;
    }

    function showNoResults(query) {
        const el = document.getElementById('search-results');
        if (el) el.innerHTML = `
      <div class="empty-state">
        <div style="font-size:48px;">🔍</div>
        <p class="empty-state-title">Tidak Ditemukan</p>
        <p class="empty-state-text">Tidak ada hasil untuk "<strong>${query}</strong>". Coba kata kunci lain.</p>
      </div>
    `;
    }

    function showSearching() {
        const el = document.getElementById('search-results');
        if (el) el.innerHTML = `
      <div class="card-grid">
        ${Array.from({ length: 12 }, () => `
          <div class="skeleton-card">
            <div class="skeleton sk-image" style="aspect-ratio:2/3;width:100%;height:auto;"></div>
            <div class="skeleton sk-text" style="margin-top:8px;"></div>
          </div>
        `).join('')}
      </div>
    `;
    }

    function clearSearch() {
        const input = document.getElementById('search-input');
        const clearBtn = document.getElementById('search-clear');
        if (input) { input.value = ''; input.focus(); }
        if (clearBtn) clearBtn.classList.remove('visible');
        showEmptyState();
    }

    function loadMore() {
        const btn = document.getElementById('search-more-btn');
        if (btn) { btn.textContent = 'Memuat...'; btn.disabled = true; }
        doSearch(currentQuery, currentPage + 1);
    }

    return { render, clearSearch, loadMore };
})();
