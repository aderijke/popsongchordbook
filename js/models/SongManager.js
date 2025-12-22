// SongManager - Data management met Firebase en localStorage fallback
class SongManager {
    constructor(firebaseManager = null) {
        this.storageKey = 'popsongChordBook';
        this.firebaseManager = firebaseManager;
        this.songs = [];
        this.nextId = 1;
        this.syncEnabled = false;
        this.onSongsChanged = null; // Callback for when songs change externally
    }

    async loadSongs() {
        // Try Firebase first if available and authenticated
        if (this.firebaseManager && this.firebaseManager.isAuthenticated()) {
            try {
                const userId = this.firebaseManager.getCurrentUser().uid;
                const songs = await this.firebaseManager.loadSongs(userId);
                this.songs = this.normalizeSongs(songs);
                this.updateNextId();
                return this.songs;
            } catch (error) {
                console.error('Error loading songs from Firebase:', error);
                // Fallback to localStorage
            }
        }

        // Fallback to localStorage
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                const songs = JSON.parse(stored);
                this.songs = this.normalizeSongs(songs);
                this.updateNextId();
                return this.songs;
            }
        } catch (error) {
            console.error('Error loading songs from localStorage:', error);
        }
        
        this.songs = [];
        this.nextId = 1;
        return [];
    }

    normalizeSongs(songs) {
        if (!Array.isArray(songs)) return [];
        return songs.map(song => ({
            ...song,
            favorite: song.favorite || false,
            youtubeUrl: song.youtubeUrl || ''
        }));
    }

    updateNextId() {
        if (this.songs.length > 0) {
            this.nextId = Math.max(...this.songs.map(s => s.id)) + 1;
        } else {
            this.nextId = 1;
        }
    }

    // Set songs (used for real-time sync from Firebase)
    setSongs(songs, skipSave = false) {
        this.songs = this.normalizeSongs(songs);
        this.updateNextId();
        if (!skipSave) {
            // Fire and forget - don't await to avoid blocking
            this.saveSongs().catch(err => console.error('Error saving songs:', err));
        }
    }

    async saveSongs() {
        // Save to Firebase if available and authenticated
        if (this.firebaseManager && this.firebaseManager.isAuthenticated()) {
            try {
                const userId = this.firebaseManager.getCurrentUser().uid;
                await this.firebaseManager.saveSongs(userId, this.songs);
                // Also save to localStorage as backup
                try {
                    localStorage.setItem(this.storageKey, JSON.stringify(this.songs));
                } catch (e) {
                    console.warn('Could not save to localStorage:', e);
                }
                return;
            } catch (error) {
                console.error('Error saving songs to Firebase:', error);
                // Fallback to localStorage
            }
        }

        // Fallback to localStorage
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.songs));
        } catch (error) {
            console.error('Error saving songs to localStorage:', error);
        }
    }

    async deleteAllSongs() {
        this.songs = [];
        this.nextId = 1;
        await this.saveSongs();
    }

    async addSong(song) {
        const newSong = {
            id: this.nextId++,
            artist: song.artist || '',
            title: song.title || '',
            verse: song.verse || '',
            chorus: song.chorus || '',
            preChorus: song.preChorus || '',
            bridge: song.bridge || '',
            favorite: song.favorite || false,
            youtubeUrl: song.youtubeUrl || ''
        };
        this.songs.push(newSong);
        await this.saveSongs();
        return newSong;
    }

    async toggleFavorite(id) {
        const song = this.songs.find(s => s.id === id);
        if (song) {
            song.favorite = !song.favorite;
            await this.saveSongs();
            return song;
        }
        return null;
    }

    getAllSongs() {
        return this.songs;
    }

    getFilteredSongs(filter) {
        if (filter === 'favorites') {
            return this.songs.filter(song => song.favorite === true);
        }
        return this.songs;
    }

    async importSongs(importedSongs, replace = true) {
        // Validate and normalize imported songs
        const normalizedSongs = importedSongs.map(song => ({
            id: song.id || this.nextId++,
            artist: song.artist || '',
            title: song.title || '',
            verse: song.verse || '',
            chorus: song.chorus || '',
            preChorus: song.preChorus || '',
            bridge: song.bridge || '',
            favorite: song.favorite || false,
            youtubeUrl: song.youtubeUrl || ''
        }));

        // Update nextId to avoid conflicts
        if (normalizedSongs.length > 0) {
            const maxId = Math.max(...normalizedSongs.map(s => s.id));
            this.nextId = Math.max(this.nextId, maxId + 1);
        }

        if (replace) {
            // Replace all songs
            this.songs = normalizedSongs;
        } else {
            // Add songs, checking for duplicates
            const existingSongs = this.songs;
            const newSongs = [];
            const duplicates = [];

            normalizedSongs.forEach(importedSong => {
                // Check if song already exists (case-insensitive comparison of artist + title)
                const normalizedArtist = (importedSong.artist || '').trim().toLowerCase();
                const normalizedTitle = (importedSong.title || '').trim().toLowerCase();
                
                const isDuplicate = existingSongs.some(existingSong => {
                    const existingArtist = (existingSong.artist || '').trim().toLowerCase();
                    const existingTitle = (existingSong.title || '').trim().toLowerCase();
                    return existingArtist === normalizedArtist && existingTitle === normalizedTitle;
                });

                if (isDuplicate) {
                    duplicates.push(`${importedSong.artist} - ${importedSong.title}`);
                } else {
                    newSongs.push(importedSong);
                }
            });

            // Add new songs
            this.songs = [...existingSongs, ...newSongs];
            
            // Return info about duplicates
            return {
                added: newSongs.length,
                duplicates: duplicates.length,
                duplicateSongs: duplicates
            };
        }

        await this.saveSongs();
        return {
            added: normalizedSongs.length,
            duplicates: 0,
            duplicateSongs: []
        };
    }

    async updateSong(id, updates) {
        const song = this.songs.find(s => s.id === id);
        if (song) {
            Object.assign(song, updates);
            await this.saveSongs();
            return song;
        }
        return null;
    }

    async deleteSong(id) {
        const index = this.songs.findIndex(s => s.id === id);
        if (index !== -1) {
            this.songs.splice(index, 1);
            await this.saveSongs();
            return true;
        }
        return false;
    }

    // Enable real-time sync from Firebase
    enableSync(userId) {
        if (!this.firebaseManager || this.syncEnabled) {
            return;
        }

        this.syncEnabled = true;
        this.firebaseManager.onSongsChange(userId, (songs) => {
            // Update songs without triggering save (to avoid infinite loop)
            this.setSongs(songs, true);
            // Notify listeners
            if (this.onSongsChanged) {
                this.onSongsChanged();
            }
        });
    }

    // Disable real-time sync
    disableSync() {
        if (this.firebaseManager && this.syncEnabled) {
            const userId = this.firebaseManager.getCurrentUser()?.uid;
            if (userId) {
                this.firebaseManager.removeSongsListener(userId);
            }
            this.syncEnabled = false;
        }
    }

    getAllSongs() {
        return this.songs;
    }

    getSongById(id) {
        return this.songs.find(s => s.id === id);
    }
}

