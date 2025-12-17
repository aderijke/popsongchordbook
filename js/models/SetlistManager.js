// SetlistManager - Setlist data management
class SetlistManager {
    constructor() {
        this.storageKey = 'popsongSetlists';
        this.setlists = this.loadSetlists();
    }

    loadSetlists() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            return stored ? JSON.parse(stored) : [];
        } catch (e) {
            console.error('Error loading setlists:', e);
            return [];
        }
    }

    saveSetlists() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.setlists));
        } catch (e) {
            console.error('Error saving setlists:', e);
        }
    }

    createSetlist(name) {
        const setlist = {
            id: Date.now().toString(),
            name: name,
            songIds: [],
            createdAt: new Date().toISOString()
        };
        this.setlists.push(setlist);
        this.saveSetlists();
        return setlist;
    }

    deleteSetlist(id) {
        this.setlists = this.setlists.filter(sl => sl.id !== id);
        this.saveSetlists();
    }

    getSetlist(id) {
        return this.setlists.find(sl => sl.id === id);
    }

    getAllSetlists() {
        return this.setlists;
    }

    addSongToSetlist(setlistId, songId) {
        const setlist = this.getSetlist(setlistId);
        if (setlist && !setlist.songIds.includes(songId)) {
            setlist.songIds.push(songId);
            this.saveSetlists();
            return true;
        }
        return false;
    }

    removeSongFromSetlist(setlistId, songId) {
        const setlist = this.getSetlist(setlistId);
        if (setlist) {
            setlist.songIds = setlist.songIds.filter(id => id !== songId);
            this.saveSetlists();
            return true;
        }
        return false;
    }

    getSongsInSetlist(setlistId, allSongs) {
        const setlist = this.getSetlist(setlistId);
        if (!setlist) return [];
        return allSongs.filter(song => setlist.songIds.includes(song.id));
    }

    importSetlists(importedSetlists) {
        // Validate and normalize imported setlists
        const normalizedSetlists = importedSetlists.map(setlist => ({
            id: setlist.id || Date.now().toString() + Math.random(),
            name: setlist.name || 'Unnamed Setlist',
            songIds: Array.isArray(setlist.songIds) ? setlist.songIds : [],
            createdAt: setlist.createdAt || new Date().toISOString()
        }));

        // Replace all setlists
        this.setlists = normalizedSetlists;
        this.saveSetlists();
    }
}

