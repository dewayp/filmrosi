/* =============================================
   MOVIEBOX ROSI — Cache Helper
   ============================================= */

const Cache = (() => {
    const memCache = new Map();
    const LS_PREFIX = 'mbr_cache_';

    function get(key) {
        // Check memory first
        if (memCache.has(key)) {
            const entry = memCache.get(key);
            if (Date.now() < entry.expiresAt) return entry.data;
            memCache.delete(key);
        }
        // Check localStorage
        try {
            const raw = localStorage.getItem(LS_PREFIX + key);
            if (raw) {
                const entry = JSON.parse(raw);
                if (Date.now() < entry.expiresAt) {
                    memCache.set(key, entry); // warm memory
                    return entry.data;
                }
                localStorage.removeItem(LS_PREFIX + key);
            }
        } catch (_) { }
        return null;
    }

    function set(key, data, ttlMs = 5 * 60 * 1000) {
        const entry = { data, expiresAt: Date.now() + ttlMs };
        memCache.set(key, entry);
        try {
            localStorage.setItem(LS_PREFIX + key, JSON.stringify(entry));
        } catch (_) {
            // Storage full — just use memory
        }
    }

    function clear(key) {
        memCache.delete(key);
        try { localStorage.removeItem(LS_PREFIX + key); } catch (_) { }
    }

    return { get, set, clear };
})();
