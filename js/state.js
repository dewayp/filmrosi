/* =============================================
   MOVIEBOX ROSI — State Manager
   ============================================= */

const State = (() => {
    const data = {
        player: {
            subjectId: null,
            subjectType: null,
            title: '',
            season: 0,
            episode: 0,
            streamUrl: null,
            sources: [],
            totalSeasons: 1,
            totalEpisodes: 1,
        },
        watchHistory: [],
    };

    // Load watch history from localStorage
    try {
        const saved = JSON.parse(localStorage.getItem('mbr_history') || '[]');
        if (Array.isArray(saved)) data.watchHistory = saved;
    } catch (_) { }

    function get(key) {
        return data[key];
    }

    function set(key, value) {
        if (key === 'player') {
            data.player = { ...data.player, ...value };
        } else {
            data[key] = value;
        }
    }

    function addToHistory(subject) {
        const entry = {
            subjectId: subject.subjectId,
            subjectType: subject.subjectType,
            title: subject.title,
            cover: subject.cover?.url || '',
            genre: subject.genre || '',
            watchedAt: Date.now(),
        };
        // Remove existing and add to front
        data.watchHistory = data.watchHistory.filter(e => e.subjectId !== entry.subjectId);
        data.watchHistory.unshift(entry);
        if (data.watchHistory.length > 50) data.watchHistory = data.watchHistory.slice(0, 50);
        try {
            localStorage.setItem('mbr_history', JSON.stringify(data.watchHistory));
        } catch (_) { }
    }

    function getHistory() {
        return data.watchHistory;
    }

    return { get, set, addToHistory, getHistory };
})();
