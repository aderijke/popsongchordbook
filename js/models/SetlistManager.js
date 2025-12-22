// SetlistManager - Setlist data management met Firebase en localStorage fallback
class SetlistManager {
    constructor(firebaseManager = null) {
        this.storageKey = 'popsongSetlists';
        this.firebaseManager = firebaseManager;
        this.setlists = [];
        this.syncEnabled = false;
        this.onSetlistsChanged = null; // Callback for when setlists change externally
    }

    async loadSetlists() {
        // Try Firebase first if available and authenticated
        if (this.firebaseManager && this.firebaseManager.isAuthenticated()) {
            try {
                const userId = this.firebaseManager.getCurrentUser().uid;
                const setlists = await this.firebaseManager.loadSetlists(userId);
                this.setlists = this.normalizeSetlists(setlists);
                return this.setlists;
            } catch (error) {
                console.error('Error loading setlists from Firebase:', error);
                // Fallback to localStorage
            }
        }

        // Fallback to localStorage
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                this.setlists = this.normalizeSetlists(JSON.parse(stored));
                return this.setlists;
            }
        } catch (e) {
            console.error('Error loading setlists from localStorage:', e);
        }
        
        this.setlists = [];
        return [];
    }

    normalizeSetlists(setlists) {
        if (!Array.isArray(setlists)) return [];
        return setlists.map(setlist => ({
            id: setlist.id || Date.now().toString() + Math.random(),
            name: setlist.name || 'Unnamed Setlist',
            songIds: Array.isArray(setlist.songIds) ? setlist.songIds : [],
            createdAt: setlist.createdAt || new Date().toISOString()
        }));
    }

    // Set setlists (used for real-time sync from Firebase)
    setSetlists(setlists, skipSave = false) {
        this.setlists = this.normalizeSetlists(setlists);
        if (!skipSave) {
            this.saveSetlists();
        }
    }

    async saveSetlists() {
        // Save to Firebase if available and authenticated
        if (this.firebaseManager && this.firebaseManager.isAuthenticated()) {
            try {
                const userId = this.firebaseManager.getCurrentUser().uid;
                await this.firebaseManager.saveSetlists(userId, this.setlists);
                // Also save to localStorage as backup
                try {
                    localStorage.setItem(this.storageKey, JSON.stringify(this.setlists));
                } catch (e) {
                    console.warn('Could not save to localStorage:', e);
                }
                return;
            } catch (error) {
                console.error('Error saving setlists to Firebase:', error);
                // Fallback to localStorage
            }
        }

        // Fallback to localStorage
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.setlists));
        } catch (e) {
            console.error('Error saving setlists to localStorage:', e);
        }
    }

    async createSetlist(name) {
        const setlist = {
            id: Date.now().toString(),
            name: name,
            songIds: [],
            createdAt: new Date().toISOString()
        };
        this.setlists.push(setlist);
        await this.saveSetlists();
        return setlist;
    }

    async deleteSetlist(id) {
        this.setlists = this.setlists.filter(sl => sl.id !== id);
        await this.saveSetlists();
    }

    getSetlist(id) {
        return this.setlists.find(sl => sl.id === id);
    }

    getAllSetlists() {
        return this.setlists;
    }

    async addSongToSetlist(setlistId, songId) {
        const setlist = this.getSetlist(setlistId);
        if (setlist && !setlist.songIds.includes(songId)) {
            setlist.songIds.push(songId);
            await this.saveSetlists();
            return true;
        }
        return false;
    }

    async removeSongFromSetlist(setlistId, songId) {
        const setlist = this.getSetlist(setlistId);
        if (setlist) {
            setlist.songIds = setlist.songIds.filter(id => id !== songId);
            await this.saveSetlists();
            return true;
        }
        return false;
    }

    getSongsInSetlist(setlistId, allSongs) {
        const setlist = this.getSetlist(setlistId);
        if (!setlist) return [];
        return allSongs.filter(song => setlist.songIds.includes(song.id));
    }

    async importSetlists(importedSetlists) {
        // Validate and normalize imported setlists
        const normalizedSetlists = importedSetlists.map(setlist => ({
            id: setlist.id || Date.now().toString() + Math.random(),
            name: setlist.name || 'Unnamed Setlist',
            songIds: Array.isArray(setlist.songIds) ? setlist.songIds : [],
            createdAt: setlist.createdAt || new Date().toISOString()
        }));

        // Replace all setlists
        this.setlists = normalizedSetlists;
        await this.saveSetlists();
    }

    // Enable real-time sync from Firebase
    enableSync(userId) {
        if (!this.firebaseManager || this.syncEnabled) {
            return;
        }

        this.syncEnabled = true;
        this.firebaseManager.onSetlistsChange(userId, (setlists) => {
            // Update setlists without triggering save (to avoid infinite loop)
            this.setSetlists(setlists, true);
            // Notify listeners
            if (this.onSetlistsChanged) {
                this.onSetlistsChanged();
            }
        });
    }

    // Disable real-time sync
    disableSync() {
        if (this.firebaseManager && this.syncEnabled) {
            const userId = this.firebaseManager.getCurrentUser()?.uid;
            if (userId) {
                this.firebaseManager.removeSetlistsListener(userId);
            }
            this.syncEnabled = false;
        }
    }
}

