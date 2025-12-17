// SongManager - Data management en localStorage
class SongManager {
    constructor() {
        this.storageKey = 'popsongChordBook';
        this.songs = this.loadSongs();
        this.nextId = this.songs.length > 0 
            ? Math.max(...this.songs.map(s => s.id)) + 1 
            : 1;
    }

    loadSongs() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                const songs = JSON.parse(stored);
                // Ensure all songs have favorite property
                return songs.map(song => ({
                    ...song,
                    favorite: song.favorite || false
                }));
            }
        } catch (error) {
            console.error('Error loading songs:', error);
        }
        return [];
    }

    saveSongs() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.songs));
        } catch (error) {
            console.error('Error saving songs:', error);
        }
    }

    deleteAllSongs() {
        this.songs = [];
        this.nextId = 1;
        this.saveSongs();
    }

    addSong(song) {
        const newSong = {
            id: this.nextId++,
            artist: song.artist || '',
            title: song.title || '',
            verse: song.verse || '',
            chorus: song.chorus || '',
            preChorus: song.preChorus || '',
            bridge: song.bridge || '',
            favorite: song.favorite || false
        };
        this.songs.push(newSong);
        this.saveSongs();
        return newSong;
    }

    toggleFavorite(id) {
        const song = this.songs.find(s => s.id === id);
        if (song) {
            song.favorite = !song.favorite;
            this.saveSongs();
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

    importSongs(importedSongs, replace = true) {
        // Validate and normalize imported songs
        const normalizedSongs = importedSongs.map(song => ({
            id: song.id || this.nextId++,
            artist: song.artist || '',
            title: song.title || '',
            verse: song.verse || '',
            chorus: song.chorus || '',
            preChorus: song.preChorus || '',
            bridge: song.bridge || '',
            favorite: song.favorite || false
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

        this.saveSongs();
        return {
            added: normalizedSongs.length,
            duplicates: 0,
            duplicateSongs: []
        };
    }

    updateSong(id, updates) {
        const song = this.songs.find(s => s.id === id);
        if (song) {
            Object.assign(song, updates);
            this.saveSongs();
            return song;
        }
        return null;
    }

    deleteSong(id) {
        const index = this.songs.findIndex(s => s.id === id);
        if (index !== -1) {
            this.songs.splice(index, 1);
            this.saveSongs();
            return true;
        }
        return false;
    }

    getAllSongs() {
        return this.songs;
    }

    getSongById(id) {
        return this.songs.find(s => s.id === id);
    }
}

