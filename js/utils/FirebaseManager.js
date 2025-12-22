// FirebaseManager - Firebase Authentication and Realtime Database management
class FirebaseManager {
    constructor() {
        this.app = null;
        this.auth = null;
        this.database = null;
        this.currentUser = null;
        this.songsListeners = new Map();
        this.setlistsListeners = new Map();
        this.initialized = false;
    }

    // Initialize Firebase
    async initialize() {
        if (this.initialized) {
            return;
        }

        try {
            // Check if Firebase is loaded
            if (typeof firebase === 'undefined') {
                throw new Error('Firebase SDK is not loaded. Make sure Firebase scripts are included in index.html');
            }

            // Check if config exists
            if (typeof firebaseConfig === 'undefined') {
                throw new Error('Firebase config is not loaded. Make sure firebase-config.js is included in index.html');
            }

            // Initialize Firebase
            this.app = firebase.initializeApp(firebaseConfig);
            this.auth = firebase.auth();
            this.database = firebase.database();
            this.initialized = true;

            // Set auth persistence to LOCAL (default, but explicit for clarity)
            // This ensures the user stays logged in after page refresh
            this.auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
                .catch((error) => {
                    console.error('Error setting auth persistence:', error);
                });

            // Set up auth state listener
            this.auth.onAuthStateChanged((user) => {
                this.currentUser = user;
            });

            return true;
        } catch (error) {
            console.error('Firebase initialization error:', error);
            throw error;
        }
    }

    // Authentication Methods

    async signUp(email, password) {
        if (!this.initialized) {
            await this.initialize();
        }

        try {
            const userCredential = await this.auth.createUserWithEmailAndPassword(email, password);
            this.currentUser = userCredential.user;
            return {
                success: true,
                user: userCredential.user
            };
        } catch (error) {
            console.error('Sign up error:', error);
            return {
                success: false,
                error: this.getAuthErrorMessage(error.code)
            };
        }
    }

    async signIn(email, password) {
        if (!this.initialized) {
            await this.initialize();
        }

        try {
            const userCredential = await this.auth.signInWithEmailAndPassword(email, password);
            this.currentUser = userCredential.user;
            return {
                success: true,
                user: userCredential.user
            };
        } catch (error) {
            console.error('Sign in error:', error);
            return {
                success: false,
                error: this.getAuthErrorMessage(error.code)
            };
        }
    }

    async signOut() {
        if (!this.initialized) {
            return { success: false, error: 'Firebase not initialized' };
        }

        try {
            // Remove all listeners FIRST, before signing out
            // In Firebase compat mode, .on() returns a function that you call to unsubscribe
            this.songsListeners.forEach((listener, userId) => {
                try {
                    if (typeof listener === 'function') {
                        listener(); // Call the unsubscribe function
                    } else if (listener && typeof listener.off === 'function') {
                        listener.off(); // Fallback for object with .off() method
                    }
                } catch (error) {
                    console.error('Error removing songs listener:', error);
                }
            });
            this.setlistsListeners.forEach((listener, userId) => {
                try {
                    if (typeof listener === 'function') {
                        listener(); // Call the unsubscribe function
                    } else if (listener && typeof listener.off === 'function') {
                        listener.off(); // Fallback for object with .off() method
                    }
                } catch (error) {
                    console.error('Error removing setlists listener:', error);
                }
            });
            this.songsListeners.clear();
            this.setlistsListeners.clear();

            // Small delay to ensure listeners are fully removed
            await new Promise(resolve => setTimeout(resolve, 100));

            await this.auth.signOut();
            this.currentUser = null;
            return { success: true };
        } catch (error) {
            console.error('Sign out error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async changePassword(newPassword) {
        if (!this.initialized) {
            return { success: false, error: 'Firebase not initialized' };
        }

        if (!this.currentUser) {
            return { success: false, error: 'Geen gebruiker ingelogd' };
        }

        try {
            await this.currentUser.updatePassword(newPassword);
            return { success: true };
        } catch (error) {
            console.error('Change password error:', error);
            return {
                success: false,
                error: this.getAuthErrorMessage(error.code) || error.message
            };
        }
    }

    onAuthStateChanged(callback) {
        if (!this.initialized) {
            this.initialize().then(() => {
                this.auth.onAuthStateChanged(callback);
            });
        } else {
            this.auth.onAuthStateChanged(callback);
        }
    }

    getCurrentUser() {
        return this.currentUser;
    }

    isAuthenticated() {
        return this.currentUser !== null;
    }

    // Database Methods

    async saveSongs(userId, songs) {
        if (!this.initialized || !userId) {
            throw new Error('Firebase not initialized or user not authenticated');
        }

        try {
            const songsRef = this.database.ref(`users/${userId}/songs`);
            const songsObject = {};
            
            songs.forEach(song => {
                songsObject[song.id] = song;
            });

            await songsRef.set(songsObject);
            return { success: true };
        } catch (error) {
            console.error('Save songs error:', error);
            throw error;
        }
    }

    async loadSongs(userId) {
        if (!this.initialized || !userId) {
            throw new Error('Firebase not initialized or user not authenticated');
        }

        try {
            const songsRef = this.database.ref(`users/${userId}/songs`);
            const snapshot = await songsRef.once('value');
            const songsData = snapshot.val();
            
            if (!songsData) {
                return [];
            }

            // Convert object to array
            return Object.values(songsData);
        } catch (error) {
            console.error('Load songs error:', error);
            throw error;
        }
    }

    async saveSetlists(userId, setlists) {
        if (!this.initialized || !userId) {
            throw new Error('Firebase not initialized or user not authenticated');
        }

        try {
            const setlistsRef = this.database.ref(`users/${userId}/setlists`);
            const setlistsObject = {};
            
            setlists.forEach(setlist => {
                setlistsObject[setlist.id] = setlist;
            });

            await setlistsRef.set(setlistsObject);
            return { success: true };
        } catch (error) {
            console.error('Save setlists error:', error);
            throw error;
        }
    }

    async loadSetlists(userId) {
        if (!this.initialized || !userId) {
            throw new Error('Firebase not initialized or user not authenticated');
        }

        try {
            const setlistsRef = this.database.ref(`users/${userId}/setlists`);
            const snapshot = await setlistsRef.once('value');
            const setlistsData = snapshot.val();
            
            if (!setlistsData) {
                return [];
            }

            // Convert object to array
            return Object.values(setlistsData);
        } catch (error) {
            console.error('Load setlists error:', error);
            throw error;
        }
    }

    // Real-time Listeners

    onSongsChange(userId, callback) {
        if (!this.initialized || !userId) {
            throw new Error('Firebase not initialized or user not authenticated');
        }

        // Remove existing listener if any
        if (this.songsListeners.has(userId)) {
            const oldListener = this.songsListeners.get(userId);
            if (typeof oldListener === 'function') {
                oldListener(); // Call the unsubscribe function
            } else if (oldListener && typeof oldListener.off === 'function') {
                oldListener.off(); // Fallback for object with .off() method
            }
        }

        const songsRef = this.database.ref(`users/${userId}/songs`);
        const listener = songsRef.on('value', (snapshot) => {
            // Check if snapshot exists and database is still initialized
            if (!snapshot || !this.initialized || !this.database) {
                return;
            }
            try {
                const songsData = snapshot.val();
                const songs = songsData ? Object.values(songsData) : [];
                callback(songs);
            } catch (error) {
                console.error('Error in songs listener callback:', error);
            }
        });

        this.songsListeners.set(userId, listener);
    }

    onSetlistsChange(userId, callback) {
        if (!this.initialized || !userId) {
            throw new Error('Firebase not initialized or user not authenticated');
        }

        // Remove existing listener if any
        if (this.setlistsListeners.has(userId)) {
            const oldListener = this.setlistsListeners.get(userId);
            if (typeof oldListener === 'function') {
                oldListener(); // Call the unsubscribe function
            } else if (oldListener && typeof oldListener.off === 'function') {
                oldListener.off(); // Fallback for object with .off() method
            }
        }

        const setlistsRef = this.database.ref(`users/${userId}/setlists`);
        const listener = setlistsRef.on('value', (snapshot) => {
            // Check if snapshot exists and database is still initialized
            if (!snapshot || !this.initialized || !this.database) {
                return;
            }
            try {
                const setlistsData = snapshot.val();
                const setlists = setlistsData ? Object.values(setlistsData) : [];
                callback(setlists);
            } catch (error) {
                console.error('Error in setlists listener callback:', error);
            }
        });

        this.setlistsListeners.set(userId, listener);
    }

    removeSongsListener(userId) {
        if (this.songsListeners.has(userId)) {
            const listener = this.songsListeners.get(userId);
            if (typeof listener === 'function') {
                listener(); // Call the unsubscribe function
            } else if (listener && typeof listener.off === 'function') {
                listener.off(); // Fallback for object with .off() method
            }
            this.songsListeners.delete(userId);
        }
    }

    removeSetlistsListener(userId) {
        if (this.setlistsListeners.has(userId)) {
            const listener = this.setlistsListeners.get(userId);
            if (typeof listener === 'function') {
                listener(); // Call the unsubscribe function
            } else if (listener && typeof listener.off === 'function') {
                listener.off(); // Fallback for object with .off() method
            }
            this.setlistsListeners.delete(userId);
        }
    }

    // Migration

    async migrateLocalDataToFirebase(userId, songs, setlists) {
        if (!this.initialized || !userId) {
            throw new Error('Firebase not initialized or user not authenticated');
        }

        try {
            // Check if Firebase already has data
            const existingSongs = await this.loadSongs(userId);
            const existingSetlists = await this.loadSetlists(userId);

            if (existingSongs.length > 0 || existingSetlists.length > 0) {
                // Merge: combine local and remote data
                const mergedSongs = [...existingSongs];
                const mergedSetlists = [...existingSetlists];

                // Add local songs that don't exist remotely
                songs.forEach(localSong => {
                    const exists = existingSongs.some(remoteSong => 
                        remoteSong.id === localSong.id ||
                        (remoteSong.artist === localSong.artist && remoteSong.title === localSong.title)
                    );
                    if (!exists) {
                        mergedSongs.push(localSong);
                    }
                });

                // Add local setlists that don't exist remotely
                setlists.forEach(localSetlist => {
                    const exists = existingSetlists.some(remoteSetlist => 
                        remoteSetlist.id === localSetlist.id ||
                        remoteSetlist.name === localSetlist.name
                    );
                    if (!exists) {
                        mergedSetlists.push(localSetlist);
                    }
                });

                await this.saveSongs(userId, mergedSongs);
                await this.saveSetlists(userId, mergedSetlists);

                return {
                    success: true,
                    merged: true,
                    songsAdded: mergedSongs.length - existingSongs.length,
                    setlistsAdded: mergedSetlists.length - existingSetlists.length
                };
            } else {
                // No existing data, just save local data
                await this.saveSongs(userId, songs);
                await this.saveSetlists(userId, setlists);

                return {
                    success: true,
                    merged: false,
                    songsAdded: songs.length,
                    setlistsAdded: setlists.length
                };
            }
        } catch (error) {
            console.error('Migration error:', error);
            throw error;
        }
    }

    // Helper Methods

    getAuthErrorMessage(errorCode) {
        const errorMessages = {
            'auth/email-already-in-use': 'Dit e-mailadres is al in gebruik.',
            'auth/invalid-email': 'Ongeldig e-mailadres.',
            'auth/operation-not-allowed': 'Deze operatie is niet toegestaan.',
            'auth/weak-password': 'Wachtwoord is te zwak. Gebruik minimaal 6 karakters.',
            'auth/user-disabled': 'Dit account is uitgeschakeld.',
            'auth/user-not-found': 'Geen account gevonden met dit e-mailadres.',
            'auth/wrong-password': 'Onjuist wachtwoord.',
            'auth/too-many-requests': 'Te veel mislukte pogingen. Probeer later opnieuw.',
            'auth/network-request-failed': 'Netwerkfout. Controleer je internetverbinding.',
            'auth/requires-recent-login': 'Voor deze actie moet je recent zijn ingelogd. Log uit en log opnieuw in.'
        };

        return errorMessages[errorCode] || `Fout: ${errorCode}`;
    }
}

