/* =============================================
   MOVIEBOX ROSI — API Helper
   ============================================= */

const API = (() => {
    const BASE = 'https://api.sansekai.my.id/api/moviebox';

    async function request(endpoint, params = {}) {
        const url = new URL(BASE + endpoint);
        Object.entries(params).forEach(([k, v]) => {
            if (v !== undefined && v !== null) url.searchParams.set(k, v);
        });
        const res = await fetch(url.toString());
        if (!res.ok) {
            throw new Error(`API Error ${res.status}: ${endpoint}`);
        }
        return res.json();
    }

    return {
        /**
         * GET /moviebox/homepage
         * Returns { operatingList, platformList, ... }
         */
        getHomepage() {
            return request('/homepage');
        },

        /**
         * GET /moviebox/trending?page=N
         * Returns { subjectList }
         */
        getTrending(page = 0) {
            return request('/trending', { page });
        },

        /**
         * GET /moviebox/search?query=Q&page=P
         * Returns { items, pager }
         */
        search(query, page = 1) {
            return request('/search', { query, page });
        },

        /**
         * GET /moviebox/detail?subjectId=ID
         * Returns { subject }
         */
        getDetail(subjectId) {
            return request('/detail', { subjectId });
        },

        /**
         * GET /moviebox/sources?subjectId=ID&season=S&episode=E
         * Returns { sources: [{ url }] }
         * season=0, episode=0 for movies
         */
        getSources(subjectId, season = 0, episode = 0) {
            return request('/sources', { subjectId, season, episode });
        },

        /**
         * GET /moviebox/generate-link-stream-video?url=URL
         * Returns { success, streamUrl }
         */
        generateStreamUrl(url) {
            return request('/generate-link-stream-video', { url });
        },
    };
})();
