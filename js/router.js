/* =============================================
   MOVIEBOX ROSI — Hash Router
   ============================================= */

const Router = (() => {
    const outlet = () => document.getElementById('router-outlet');
    const header = () => document.getElementById('app-header');
    const bottomNav = () => document.getElementById('bottom-nav');
    const btnBack = () => document.getElementById('btn-back');
    const headerLogo = () => document.getElementById('header-logo');

    const PAGE_RENDERERS = {
        '/': HomPage.render,
        '/trending': TrendingPage.render,
        '/search': SearchPage.render,
        '/detail': DetailPage.render,
        '/player': PlayerPage.render,
    };

    let currentRoute = '/';

    function navigate(path, params = {}) {
        const url = new URL(window.location.href);
        url.hash = '#' + path;
        if (params.subjectId) url.searchParams.set('id', params.subjectId);
        window.location.hash = path;
        // Store params in session for this route
        if (Object.keys(params).length) {
            sessionStorage.setItem('mbr_route_params', JSON.stringify(params));
        }
    }

    function back() {
        window.history.back();
    }

    function getRouteParams() {
        try {
            return JSON.parse(sessionStorage.getItem('mbr_route_params') || '{}');
        } catch (_) { return {}; }
    }

    function getQueryParam(key) {
        return new URLSearchParams(window.location.search).get(key);
    }

    function parseRoute(hash) {
        // hash = "#/detail" or "#/player" etc.
        const path = hash.replace(/^#/, '') || '/';
        // Match exact or prefix
        for (const route of Object.keys(PAGE_RENDERERS)) {
            if (path === route || (route !== '/' && path.startsWith(route))) {
                return { route, path };
            }
        }
        return { route: '/', path: '/' };
    }

    function setPlayerMode(on) {
        const hdr = header();
        const nav = bottomNav();
        const ro = outlet();
        if (on) {
            hdr.style.display = 'none';
            nav.style.display = 'none';
            ro?.classList.add('player-mode');
        } else {
            hdr.style.display = '';
            nav.style.display = '';
            ro?.classList.remove('player-mode');
        }
    }

    function setDetailMode(on, title = '') {
        const back = btnBack();
        const logo = headerLogo();
        if (!back || !logo) return;
        if (on) {
            back.style.display = 'flex';
            logo.style.display = 'none';
        } else {
            back.style.display = 'none';
            logo.style.display = '';
        }
    }

    async function render(hash) {
        const { route } = parseRoute(hash);
        currentRoute = route;

        const ro = outlet();
        if (!ro) return;

        // Scroll outlet to top
        ro.scrollTop = 0;

        // Player mode
        setPlayerMode(route === '/player');
        setDetailMode(route === '/detail' || route === '/player');

        // Update nav active
        Utils.setActiveNav(route);

        // Header scroll behavior
        header()?.classList.remove('transparent');

        // Render page
        const renderer = PAGE_RENDERERS[route];
        if (renderer) {
            await renderer(ro, getRouteParams());
        } else {
            ro.innerHTML = '<div class="empty-state"><p class="empty-state-title">Halaman tidak ditemukan</p></div>';
        }
    }

    function init() {
        // Handle hash change
        window.addEventListener('hashchange', () => {
            render(window.location.hash || '#/');
        });

        // Initial render
        const h = window.location.hash || '#/';
        render(h);

        // Splash hide after 2s
        const splash = document.getElementById('app-splash');
        const app = document.getElementById('app');
        setTimeout(() => {
            if (splash) splash.classList.add('fade-out');
            if (app) app.style.display = '';
            setTimeout(() => { if (splash) splash.remove(); }, 700);
        }, 2000);
    }

    // Header scroll behavior
    window.addEventListener('scroll', () => {
        const hdr = header();
        if (!hdr) return;
        const ro = outlet();
        if (!ro) return;
        hdr.classList.toggle('scrolled', ro.scrollTop > 10);
    }, { passive: true });

    return { init, navigate, back, getRouteParams, getQueryParam };
})();
