/* =============================================
   MOVIEBOX ROSI — Downloads Manager
   ============================================= */

const Downloads = (() => {
    const CACHE_NAME = 'mbr-downloads-v1';
    const STORAGE_KEY = 'mbr_downloads';

    // Get metadata from localStorage
    function getStoredDownloads() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        } catch (e) {
            return [];
        }
    }

    // Save metadata to localStorage
    function saveMetadata(downloads) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(downloads));
    }

    // Check if an episode is downloaded
    function isDownloaded(subjectId, season, episode) {
        const downloads = getStoredDownloads();
        return downloads.some(d => d.subjectId === subjectId && d.season === season && d.episode === episode && d.status === 'completed');
    }

    // Check if an episode is currently downloading
    function isDownloading(subjectId, season, episode) {
        const downloads = getStoredDownloads();
        return downloads.some(d => d.subjectId === subjectId && d.season === season && d.episode === episode && d.status === 'downloading');
    }

    // Generate a unique ID for the download record
    function getDownloadId(subjectId, season, episode) {
        return `${subjectId}_S${season}E${episode}`;
    }

    // Start a download
    async function startDownload(subject, season, episode, streamUrl, sizeFormatted, captions = [], sizeBytes = 0) {
        const dlId = getDownloadId(subject.subjectId, season, episode);
        let downloads = getStoredDownloads();

        // Check if already downloading or completed
        if (downloads.some(d => d.id === dlId)) {
            return false;
        }

        const newDownload = {
            id: dlId,
            subjectId: subject.subjectId,
            subjectType: subject.subjectType,
            title: subject.title,
            cover: subject.cover?.url || '',
            season: season,
            episode: episode,
            streamUrl: streamUrl,
            captions: captions,
            sizeFormatted: sizeFormatted || 'Unknown',
            sizeBytes: sizeBytes,
            progress: 0,
            status: 'downloading',
            addedAt: Date.now()
        };

        downloads.push(newDownload);
        saveMetadata(downloads);

        // Notify UI immediately
        if (window.dispatchEvent) {
            window.dispatchEvent(new CustomEvent('mbr-download-started', { detail: newDownload }));
        }

        try {
            // Open cache
            const cache = await caches.open(CACHE_NAME);

            // Use fetch and Response clone to cache and read stream
            const response = await fetch(new Request(streamUrl, { mode: 'cors' }));
            if (!response.ok) throw new Error(`Network response was not ok: ${response.status}`);

            // Put clone into cache
            await cache.put(streamUrl, response.clone());

            // Read original response body to track progress
            const contentLength = response.headers.get('Content-Length');
            const total = parseInt(contentLength, 10) || sizeBytes || 0;
            let loaded = 0;

            const reader = response.body.getReader();
            let lastProgressTime = 0;

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                loaded += value.length;

                // Throttle UI progress events to max ~4 times a second
                const now = Date.now();
                if (now - lastProgressTime > 250) {
                    lastProgressTime = now;
                    const percent = total ? Math.round((loaded / total) * 100) : null;

                    if (window.dispatchEvent && percent !== null) {
                        window.dispatchEvent(new CustomEvent('mbr-download-progress', {
                            detail: { id: dlId, percent, loaded, total }
                        }));
                    }
                }
            }

            // Fetch and cache all subtitles
            if (captions && captions.length > 0) {
                const subtitlePromises = captions.map(cap => {
                    if (cap.url) return cache.add(new Request(cap.url, { mode: 'cors' })).catch(e => console.warn('Failed to cache subtitle:', cap.url, e));
                    return Promise.resolve();
                });
                await Promise.allSettled(subtitlePromises);
            }

            // Update status to completed
            downloads = getStoredDownloads();
            const idx = downloads.findIndex(d => d.id === dlId);
            if (idx !== -1) {
                downloads[idx].status = 'completed';
                saveMetadata(downloads);
                if (window.dispatchEvent) {
                    window.dispatchEvent(new CustomEvent('mbr-download-completed', { detail: downloads[idx] }));
                }
            }
            return true;
        } catch (err) {
            console.error('Download failed:', err);
            // Remove from metadata if failed
            downloads = getStoredDownloads();
            downloads = downloads.filter(d => d.id !== dlId);
            saveMetadata(downloads);

            if (window.dispatchEvent) {
                window.dispatchEvent(new CustomEvent('mbr-download-failed', { detail: { id: dlId, error: err.message } }));
            }
            throw err;
        }
    }

    // Attempt to get a local Object URL for playing offline.
    // If not in cache, returns null.
    async function getOfflineUrl(subjectId, season, episode) {
        if (!isDownloaded(subjectId, season, episode)) return null;

        const downloads = getStoredDownloads();
        const item = downloads.find(d => d.subjectId === subjectId && d.season === season && d.episode === episode);
        if (!item || !item.streamUrl) return null;

        try {
            const cache = await caches.open(CACHE_NAME);
            const response = await cache.match(item.streamUrl);
            if (response) {
                const blob = await response.blob();
                return URL.createObjectURL(blob);
            }
        } catch (e) {
            console.error('Failed to get offline URL:', e);
        }
        return null;
    }

    // Delete a download
    async function deleteDownload(subjectId, season, episode) {
        const dlId = getDownloadId(subjectId, season, episode);
        let downloads = getStoredDownloads();
        const item = downloads.find(d => d.id === dlId);

        if (!item) return;

        downloads = downloads.filter(d => d.id !== dlId);
        saveMetadata(downloads);

        try {
            const cache = await caches.open(CACHE_NAME);
            if (item.streamUrl) {
                await cache.delete(item.streamUrl);
            }
            if (item.captions && item.captions.length > 0) {
                for (const cap of item.captions) {
                    if (cap.url) await cache.delete(cap.url).catch(() => { });
                }
            }
        } catch (e) {
            console.error('Failed to delete cache entry:', e);
        }

        if (window.dispatchEvent) {
            window.dispatchEvent(new CustomEvent('mbr-download-deleted', { detail: { id: dlId } }));
        }
    }

    // Public API
    return {
        getStoredDownloads,
        isDownloaded,
        isDownloading,
        startDownload,
        getOfflineUrl,
        deleteDownload
    };
})();
