// Main Application
class App {
    constructor() {
        // Initialize Firebase Manager first
        this.firebaseManager = new FirebaseManager();
        this.authModal = null;
        this.isAuthenticated = false;
        this.migrationCompleted = false;
        
        // Initialize managers (will be connected to Firebase after auth)
        this.songManager = new SongManager(this.firebaseManager);
        this.setlistManager = new SetlistManager(this.firebaseManager);
        this.sorter = new Sorter();
        this.chordModal = new ChordModal();
        this.songDetailModal = new SongDetailModal(
            this.songManager,
            (songId) => this.navigateToSong(songId),
            () => this.loadAndRender(), // Refresh table when song is updated
            this.chordModal, // Pass chordModal for chord button
            (songId) => this.handleToggleFavorite(songId), // Pass favorite toggle handler
            (songId) => this.handlePlayYouTube(songId) // Pass YouTube play handler
        );
        this.chordDetectorOverlay = new ChordDetectorOverlay();
        this.currentFilter = 'all';
        this.currentSetlistId = null;
        this.searchTerm = '';
        this.viewMode = 'full'; // 'simple' or 'full'
        
        this.tableRenderer = new TableRenderer(
            this.songManager,
            (songId) => this.handleRowSelect(songId),
            (songId, field, value) => this.handleCellEdit(songId, field, value),
            (songId) => this.handleDelete(songId),
            this.chordModal,
            (songId) => this.handleToggleFavorite(songId),
            (songId) => this.handlePlayYouTube(songId)
        );

        this.init();
    }

    async init() {
        // Initialize Firebase
        try {
            await this.firebaseManager.initialize();
        } catch (error) {
            console.error('Firebase initialization failed:', error);
            alert('Firebase initialisatie mislukt. Controleer je Firebase configuratie.');
            return;
        }

        // Setup auth modal
        this.authModal = new AuthModal(this.firebaseManager, (user) => this.handleAuthSuccess(user));
        
        // Setup profile modal (will be initialized after auth)
        this.profileModal = null;

        // Wait for auth state to be restored (handles page refresh)
        // This ensures we wait for Firebase to restore the session before checking auth state
        await new Promise((resolve) => {
            let resolved = false;
            // Setup auth state listener - wait for first state change
            this.firebaseManager.onAuthStateChanged((user) => {
                if (user) {
                    // User is authenticated (either logged in or session restored)
                    if (!this.isAuthenticated) {
                        this.handleAuthSuccess(user);
                    }
                } else {
                    // No user - show login modal
                    if (!this.isAuthenticated) {
                        this.handleAuthFailure();
                    }
                }
                // Resolve after first auth state check (only once)
                if (!resolved) {
                    resolved = true;
                    resolve();
                }
            });
        });
    }

    async initializeApp() {
        this.isAuthenticated = true;
        
        // Setup profile modal
        this.profileModal = new ProfileModal(this.firebaseManager, () => this.handleSignOut());
        this.profileModal.onAuthSuccess = (user) => {
            this.updateProfileLabel(user);
        };
        this.setupProfile();
        
        // Setup UI components
        this.setupSorting();
        this.setupAddSongButton();
        this.setupFilters();
        this.setupSearch();
        this.setupSetlists();
        this.setupAddSongsToSetlistModal();
        this.setupImportExport();
        this.setupPrintButton();
        this.setupDeselect();
        this.setupHeaderBarToggle();
        this.setupToggleView();

        // Load data from Firebase
        await this.loadDataFromFirebase();

        // Setup real-time sync
        this.setupRealtimeSync();

        // Load and render songs (no default songs for new users)
        this.loadAndRender();
    }

    async handleAuthSuccess(user) {
        if (!this.isAuthenticated) {
            // First time authentication - check for migration
            await this.checkAndMigrateData(user);
            await this.initializeApp();
        }
        this.updateProfileLabel(user);
    }

    handleAuthFailure() {
        this.isAuthenticated = false;
        // Disable sync
        this.songManager.disableSync();
        this.setlistManager.disableSync();
        this.updateProfileLabel(null);
        // Show login modal
        if (this.authModal) {
            this.authModal.show(true);
        }
    }

    handleSignOut() {
        this.isAuthenticated = false;
        // Disable sync
        this.songManager.disableSync();
        this.setlistManager.disableSync();
        this.updateProfileLabel(null);
        // Show login modal
        if (this.authModal) {
            this.authModal.show(true);
        }
    }

    setupProfile() {
        const profileBtn = document.getElementById('profileBtn');
        if (profileBtn && this.profileModal) {
            profileBtn.addEventListener('click', () => {
                this.profileModal.show();
            });
        }
        // Update profile label and song count
        this.updateProfileLabel(this.firebaseManager.getCurrentUser());
        this.updateProfileSongCount();
    }

    updateProfileLabel(user) {
        const labelElement = document.querySelector('#profileBtn .label');
        if (labelElement) {
            const songCountHtml = `<span id="profileSongCount" class="song-count">(${this.songManager ? this.songManager.getAllSongs().length : 0})</span>`;
            if (user && user.displayName) {
                labelElement.innerHTML = `${user.displayName} ${songCountHtml}`;
            } else {
                labelElement.innerHTML = `Profiel ${songCountHtml}`;
            }
        }
    }

    updateProfileSongCount() {
        this.updateProfileLabel(this.firebaseManager.getCurrentUser());
    }

    async checkAndMigrateData(user) {
        const userId = user.uid;
        const migrationKey = `migration_completed_${userId}`;
        
        // Check if migration already completed for this user
        if (localStorage.getItem(migrationKey) === 'true') {
            return; // Migration already done for this user
        }

        // Check if Firebase account already has data (not a new account)
        try {
            const existingSongs = await this.firebaseManager.loadSongs(userId);
            const existingSetlists = await this.firebaseManager.loadSetlists(userId);
            
            // If account already has data, mark migration as completed and skip
            if (existingSongs.length > 0 || existingSetlists.length > 0) {
                localStorage.setItem(migrationKey, 'true');
                return; // Account already has data, no migration needed
            }
        } catch (error) {
            console.error('Error checking existing data:', error);
            // Continue to check local data
        }

        // Check if there's local data to migrate (only for new accounts)
        const localSongs = localStorage.getItem('popsongChordBook');
        const localSetlists = localStorage.getItem('popsongSetlists');

        if (localSongs || localSetlists) {
            try {
                const songs = localSongs ? JSON.parse(localSongs) : [];
                const setlists = localSetlists ? JSON.parse(localSetlists) : [];

                if (songs.length > 0 || setlists.length > 0) {
                    // Ask user if they want to migrate (only for new accounts with local data)
                    const shouldMigrate = confirm(
                        `Je hebt ${songs.length} song(s) en ${setlists.length} setlist(s) lokaal opgeslagen.\n\n` +
                        `Wil je deze data naar je nieuwe Firebase account migreren?\n\n` +
                        `Klik "OK" om te migreren, of "Annuleren" om te starten met een lege collectie.`
                    );

                    if (shouldMigrate) {
                        const result = await this.firebaseManager.migrateLocalDataToFirebase(userId, songs, setlists);
                        
                        if (result.merged) {
                            alert(
                                `Migratie voltooid!\n\n` +
                                `${result.songsAdded} nieuwe song(s) toegevoegd.\n` +
                                `${result.setlistsAdded} nieuwe setlist(s) toegevoegd.`
                            );
                        } else {
                            alert(
                                `Migratie voltooid!\n\n` +
                                `${result.songsAdded} song(s) gemigreerd.\n` +
                                `${result.setlistsAdded} setlist(s) gemigreerd.`
                            );
                        }
                    }
                    
                    // Mark migration as completed (even if user declined)
                    localStorage.setItem(migrationKey, 'true');
                }
            } catch (error) {
                console.error('Migration error:', error);
                alert('Er is een fout opgetreden bij het migreren van data.');
            }
        } else {
            // No local data, mark migration as completed
            localStorage.setItem(migrationKey, 'true');
        }
    }

    async loadDataFromFirebase() {
        try {
            // Load from cache first (fast, no database call)
            // This will automatically sync with Firebase in background if needed
            await this.songManager.loadSongs(false); // false = use cache first
            await this.setlistManager.loadSetlists(false); // false = use cache first
            
            // Update UI immediately with cached data
            this.loadAndRender();
            this.updateSetlistSelect();
        } catch (error) {
            console.error('Error loading data:', error);
            // Try to continue with whatever data we have
            this.loadAndRender();
            this.updateSetlistSelect();
        }
    }

    setupRealtimeSync() {
        const userId = this.firebaseManager.getCurrentUser().uid;
        
        // Setup songs sync
        this.songManager.onSongsChanged = () => {
            this.loadAndRender();
            this.updateProfileSongCount();
        };
        this.songManager.enableSync(userId);

        // Setup setlists sync
        this.setlistManager.onSetlistsChanged = () => {
            this.updateSetlistSelect();
            this.loadAndRender();
        };
        this.setlistManager.enableSync(userId);
    }
    
    setupHeaderBarToggle() {
        const toggleBtn = document.getElementById('toggleHeaderBar');
        const toggleBtnCollapsed = document.getElementById('toggleHeaderBarCollapsed');
        const headerBar = document.getElementById('headerBar');
        const headerTop = document.querySelector('.header-top');
        
        if (!toggleBtn || !toggleBtnCollapsed || !headerBar) return;
        
        // Load saved state from localStorage
        const isCollapsed = localStorage.getItem('headerBarCollapsed') === 'true';
        if (isCollapsed) {
            headerBar.classList.add('collapsed');
            if (headerTop) headerTop.classList.add('header-bar-collapsed');
            toggleBtn.style.display = 'none';
            toggleBtnCollapsed.style.display = 'flex';
        } else {
            toggleBtn.style.display = 'flex';
            toggleBtnCollapsed.style.display = 'none';
        }
        
        const toggleCollapse = () => {
            const isCurrentlyCollapsed = headerBar.classList.contains('collapsed');
            
            if (isCurrentlyCollapsed) {
                headerBar.classList.remove('collapsed');
                if (headerTop) headerTop.classList.remove('header-bar-collapsed');
                toggleBtn.style.display = 'flex';
                toggleBtnCollapsed.style.display = 'none';
                localStorage.setItem('headerBarCollapsed', 'false');
            } else {
                headerBar.classList.add('collapsed');
                if (headerTop) headerTop.classList.add('header-bar-collapsed');
                toggleBtn.style.display = 'none';
                toggleBtnCollapsed.style.display = 'flex';
                localStorage.setItem('headerBarCollapsed', 'true');
            }
        };
        
        toggleBtn.addEventListener('click', toggleCollapse);
        toggleBtnCollapsed.addEventListener('click', toggleCollapse);
    }

    loadAndRender() {
        // Save current selected row ID before rendering
        const currentSelectedId = this.tableRenderer ? this.tableRenderer.getSelectedRowId() : null;
        
        // Close modal when filtering/searching (unless we're restoring the same selection)
        const wasModalOpen = this.songDetailModal && !this.songDetailModal.modal.classList.contains('hidden');
        if (wasModalOpen && !currentSelectedId) {
            this.songDetailModal.hide();
        }
        
        let allSongs = this.songManager.getFilteredSongs(this.currentFilter);
        
        // Apply setlist filter if a setlist is selected
        if (this.currentSetlistId) {
            const setlist = this.setlistManager.getSetlist(this.currentSetlistId);
            if (setlist) {
                allSongs = allSongs.filter(song => setlist.songIds.includes(song.id));
            }
        }
        
        // Apply search filter if search term exists
        if (this.searchTerm && this.searchTerm.trim() !== '') {
            const searchLower = this.searchTerm.toLowerCase().trim();
            allSongs = allSongs.filter(song => {
                const artistMatch = song.artist && song.artist.toLowerCase().includes(searchLower);
                const titleMatch = song.title && song.title.toLowerCase().includes(searchLower);
                return artistMatch || titleMatch;
            });
        }
        
        // Store current songs list for navigation
        this.currentSongsList = allSongs;
        this.songDetailModal.setSongs(allSongs);
        
        this.tableRenderer.render(allSongs);
        
        // Apply view mode after rendering
        this.updateViewMode();
        
        // Update profile song count
        this.updateProfileSongCount();
        
        // Restore selected row if it still exists (but don't open modal)
        if (currentSelectedId && this.tableRenderer) {
            // Check if the song still exists in the filtered list
            const songExists = allSongs.some(song => song.id === currentSelectedId);
            if (songExists) {
                // Small delay to ensure render is complete
                setTimeout(() => {
                    this.tableRenderer.selectRow(currentSelectedId, true); // Skip callback to prevent modal opening
                }, 50);
            } else {
                // Song no longer exists in filtered list, close modal
                this.songDetailModal.hide();
            }
        } else if (!currentSelectedId && wasModalOpen) {
            // No selection to restore and modal was open, close it
            this.songDetailModal.hide();
        }
    }

    setupFilters() {
        const filterAll = document.getElementById('filterAll');
        const filterFavorites = document.getElementById('filterFavorites');
        
        filterAll.addEventListener('click', () => {
            this.currentFilter = 'all';
            filterAll.classList.add('active');
            filterFavorites.classList.remove('active');
            this.loadAndRender();
        });
        
        filterFavorites.addEventListener('click', () => {
            this.currentFilter = 'favorites';
            filterFavorites.classList.add('active');
            filterAll.classList.remove('active');
            this.loadAndRender();
        });
    }

    setupSearch() {
        const searchInput = document.getElementById('searchInput');
        const clearSearchBtn = document.getElementById('clearSearchBtn');
        if (!searchInput) return;
        
        // Function to adjust font size based on input width
        const adjustFontSize = () => {
            const inputWidth = searchInput.offsetWidth;
            // Calculate font size based on width
            // Min width: 120px -> font-size: 0.7em
            // Max width: 240px -> font-size: 0.95em
            const minWidth = 120;
            const maxWidth = 240;
            const minFontSize = 0.7;
            const maxFontSize = 0.95;
            
            // Clamp the width
            const clampedWidth = Math.max(minWidth, Math.min(maxWidth, inputWidth));
            
            // Calculate font size proportionally
            const ratio = (clampedWidth - minWidth) / (maxWidth - minWidth);
            const fontSize = minFontSize + (maxFontSize - minFontSize) * ratio;
            
            searchInput.style.fontSize = `${fontSize}em`;
        };
        
        // Adjust font size on resize
        const resizeObserver = new ResizeObserver(() => {
            adjustFontSize();
        });
        resizeObserver.observe(searchInput);
        
        // Also adjust on window resize
        window.addEventListener('resize', adjustFontSize);
        
        // Initial adjustment
        adjustFontSize();
        
        // Toggle clear button visibility
        const toggleClearButton = () => {
            if (clearSearchBtn) {
                if (searchInput.value.trim() !== '') {
                    clearSearchBtn.classList.remove('hidden');
                } else {
                    clearSearchBtn.classList.add('hidden');
                }
            }
        };
        
        // Search on input (real-time)
        searchInput.addEventListener('input', (e) => {
            this.searchTerm = e.target.value;
            this.loadAndRender();
            toggleClearButton();
        });
        
        // Clear search button click
        if (clearSearchBtn) {
            clearSearchBtn.addEventListener('click', () => {
                searchInput.value = '';
                this.searchTerm = '';
                this.loadAndRender();
                searchInput.focus();
                toggleClearButton();
            });
        }
        
        // Clear search on Escape key
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                searchInput.value = '';
                this.searchTerm = '';
                this.loadAndRender();
                searchInput.blur();
                toggleClearButton();
            }
        });
        
        // Initial state
        toggleClearButton();
    }

    async handleToggleFavorite(songId) {
        await this.songManager.toggleFavorite(songId);
        this.loadAndRender();
    }

    setupSetlists() {
        this.updateSetlistSelect();
        this.setupSetlistSelect();
        this.setupCreateSetlist();
        this.setupDeleteSetlist();
    }

    updateSetlistSelect() {
        const select = document.getElementById('setlistSelect');
        const currentValue = select.value;
        select.innerHTML = '<option value="">All Songs</option>';
        
        this.setlistManager.getAllSetlists().forEach(setlist => {
            const option = document.createElement('option');
            option.value = setlist.id;
            option.textContent = setlist.name;
            select.appendChild(option);
        });
        
        if (currentValue) {
            select.value = currentValue;
        }
    }

    setupSetlistSelect() {
        const select = document.getElementById('setlistSelect');
        select.addEventListener('change', (e) => {
            this.currentSetlistId = e.target.value || null;
            this.updateButtonsForSetlistMode();
            this.loadAndRender();
        });
        
        // Initial check in case a setlist is already selected
        if (select.value) {
            this.currentSetlistId = select.value;
            this.updateButtonsForSetlistMode();
        }
    }

    updateButtonsForSetlistMode() {
        const deleteBtn = document.getElementById('deleteSetlistBtn');
        const addSongBtn = document.getElementById('addSongBtn');
        const importControls = document.querySelector('.import-export-controls');
        const deleteAllBtn = document.getElementById('deleteAllSongsBtn');
        
        if (this.currentSetlistId) {
            // Show setlist delete button
            if (deleteBtn) {
                deleteBtn.classList.remove('hidden');
            }
            // Change button to text when in setlist mode
            if (addSongBtn) {
                addSongBtn.textContent = 'Add songs';
                addSongBtn.title = 'Add songs to setlist';
            }
            // Hide export, import, and delete all buttons
            if (importControls) {
                importControls.classList.add('hidden');
            }
            // Explicitly hide delete all button (double check)
            if (deleteAllBtn) {
                deleteAllBtn.classList.add('hidden');
                deleteAllBtn.style.display = 'none';
            }
        } else {
            // Hide setlist delete button
            if (deleteBtn) {
                deleteBtn.classList.add('hidden');
            }
            // Change button back to icon
            if (addSongBtn) {
                addSongBtn.textContent = '➕';
                addSongBtn.title = 'Add New Song';
            }
            // Show export, import, and delete all buttons
            if (importControls) {
                importControls.classList.remove('hidden');
            }
            // Explicitly show delete all button
            if (deleteAllBtn) {
                deleteAllBtn.classList.remove('hidden');
                deleteAllBtn.style.display = '';
            }
        }
    }

    setupCreateSetlist() {
        const createBtn = document.getElementById('createSetlistBtn');
        const modal = document.getElementById('setlistModal');
        const closeBtn = document.getElementById('setlistModalClose');
        const nameInput = document.getElementById('setlistNameInput');
        const submitBtn = document.getElementById('setlistCreateBtn');

        createBtn.addEventListener('click', () => {
            modal.classList.remove('hidden');
            nameInput.value = '';
            nameInput.focus();
        });

        closeBtn.addEventListener('click', () => {
            modal.classList.add('hidden');
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.add('hidden');
            }
        });

        const createSetlist = async () => {
            const name = nameInput.value.trim();
            if (name) {
                await this.setlistManager.createSetlist(name);
                this.updateSetlistSelect();
                modal.classList.add('hidden');
                nameInput.value = '';
            }
        };

        submitBtn.addEventListener('click', createSetlist);
        nameInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                createSetlist();
            } else if (e.key === 'Escape') {
                modal.classList.add('hidden');
            }
        });
    }

    setupDeleteSetlist() {
        const deleteBtn = document.getElementById('deleteSetlistBtn');
        deleteBtn.addEventListener('click', async () => {
            if (this.currentSetlistId) {
                const setlist = this.setlistManager.getSetlist(this.currentSetlistId);
                if (setlist) {
                    if (confirm(`Are you sure you want to delete the setlist "${setlist.name}"?`)) {
                        await this.setlistManager.deleteSetlist(this.currentSetlistId);
                        this.currentSetlistId = null;
                        this.updateSetlistSelect();
                        const select = document.getElementById('setlistSelect');
                        select.value = '';
                        // Reset to "All Songs" view
                        this.updateButtonsForSetlistMode();
                        // Load all songs (reset to "All Songs" view)
                        this.loadAndRender();
                    }
                }
            }
        });
    }

    setupAddSongsToSetlistModal() {
        const modal = document.getElementById('addSongsToSetlistModal');
        const closeBtn = document.getElementById('addSongsModalClose');
        const cancelBtn = document.getElementById('cancelAddSongsBtn');
        const selectAllBtn = document.getElementById('selectAllSongs');
        const deselectAllBtn = document.getElementById('deselectAllSongs');
        const addSelectedBtn = document.getElementById('addSelectedSongsBtn');
        const songsContainer = document.getElementById('songsListContainer');
        const selectedCountSpan = document.getElementById('selectedCount');

        closeBtn.addEventListener('click', () => {
            modal.classList.add('hidden');
        });

        cancelBtn.addEventListener('click', () => {
            modal.classList.add('hidden');
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.add('hidden');
            }
        });

        selectAllBtn.addEventListener('click', () => {
            const checkboxes = songsContainer.querySelectorAll('input[type="checkbox"]');
            checkboxes.forEach(cb => {
                if (!cb.disabled) {
                    cb.checked = true;
                }
            });
            this.updateSelectedCount();
        });

        deselectAllBtn.addEventListener('click', () => {
            const checkboxes = songsContainer.querySelectorAll('input[type="checkbox"]');
            checkboxes.forEach(cb => cb.checked = false);
            this.updateSelectedCount();
        });

        addSelectedBtn.addEventListener('click', async () => {
            const checkboxes = songsContainer.querySelectorAll('input[type="checkbox"]:checked:not(:disabled)');
            let addedCount = 0;
            let alreadyInSetlistCount = 0;

            for (const cb of checkboxes) {
                const songId = parseInt(cb.value);
                const success = await this.setlistManager.addSongToSetlist(this.currentSetlistId, songId);
                if (success) {
                    addedCount++;
                } else {
                    alreadyInSetlistCount++;
                }
            }

            if (addedCount > 0 || alreadyInSetlistCount > 0) {
                this.loadAndRender();
                let message = '';
                if (addedCount > 0) {
                    message = `${addedCount} song(s) added`;
                }
                if (alreadyInSetlistCount > 0) {
                    message += message ? `, ${alreadyInSetlistCount} already present` : `${alreadyInSetlistCount} song(s) already present`;
                }
                alert(message);
            }

            modal.classList.add('hidden');
        });

        // Update count when checkboxes change
        songsContainer.addEventListener('change', () => {
            this.updateSelectedCount();
        });
    }

    populateSongsList(setlist) {
        const container = document.getElementById('songsListContainer');
        container.innerHTML = '';
        
        const allSongs = this.songManager.getAllSongs();
        const songsInSetlist = setlist.songIds || [];

        allSongs.forEach(song => {
            const isInSetlist = songsInSetlist.includes(song.id);
            
            const songItem = document.createElement('div');
            songItem.className = 'song-item';
            if (isInSetlist) {
                songItem.classList.add('in-setlist');
            }

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = song.id;
            checkbox.id = `song-${song.id}`;
            checkbox.disabled = isInSetlist;
            if (isInSetlist) {
                checkbox.checked = true;
            }

            const label = document.createElement('label');
            label.htmlFor = `song-${song.id}`;
            label.textContent = `${song.artist || 'Unknown'} - ${song.title || 'No title'}`;
            if (isInSetlist) {
                label.innerHTML += ' <span class="in-setlist-badge">(already in setlist)</span>';
            }

            songItem.appendChild(checkbox);
            songItem.appendChild(label);
            container.appendChild(songItem);
        });

        this.updateSelectedCount();
    }

    updateSelectedCount() {
        const container = document.getElementById('songsListContainer');
        const checkboxes = container.querySelectorAll('input[type="checkbox"]:checked:not(:disabled)');
        const countSpan = document.getElementById('selectedCount');
        countSpan.textContent = `${checkboxes.length} geselecteerd`;
    }

    setupDeselect() {
        const deselectBtn = document.getElementById('deselectBtn');
        if (deselectBtn) {
            deselectBtn.addEventListener('click', () => {
                this.deselectRow();
            });
        }
        
        // Escape key to deselect
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.tableRenderer.getSelectedRowId()) {
                this.deselectRow();
            }
        });
    }

    deselectRow() {
        this.tableRenderer.selectRow(null);
    }

    async addExampleSongIfEmpty() {
        if (this.songManager.getAllSongs().length === 0) {
            try {
                // Load default songs from JSON file
                const response = await fetch('js/data/defaultSongs.json');
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.json();
                
                // Check if data has the expected structure
                if (data && data.songs && Array.isArray(data.songs) && data.songs.length > 0) {
                    // Add all default songs
                    for (const song of data.songs) {
                        await this.songManager.addSong(song);
                    }
                    
                    // Import setlists if present
                    if (data.setlists && Array.isArray(data.setlists) && data.setlists.length > 0) {
                        await this.setlistManager.importSetlists(data.setlists);
                    }
                } else {
                    // Fallback to single example if JSON structure is invalid
                    await this.songManager.addSong({
                        artist: 'Bryan Adams',
                        title: 'Summer of 69',
                        verse: 'D A (3x)',
                        chorus: 'Bm A D G (2x)',
                        preChorus: 'D A (2x)',
                        bridge: 'F B C B (2x)'
                    });
                }
            } catch (error) {
                console.error('Error loading default songs from JSON:', error);
                // Fallback to single example if JSON file cannot be loaded
                await this.songManager.addSong({
                    artist: 'Bryan Adams',
                    title: 'Summer of 69',
                    verse: 'D A (3x)',
                    chorus: 'Bm A D G (2x)',
                    preChorus: 'D A (2x)',
                    bridge: 'F B C B (2x)'
                });
            }
            // Don't call loadAndRender here - it will be called after this function
        }
    }

    setupSorting() {
        const sortableHeaders = document.querySelectorAll('th.sortable');
        sortableHeaders.forEach(header => {
            header.addEventListener('click', () => {
                const column = header.dataset.column;
                const currentSort = this.sorter.getCurrentSort();
                const currentDirection = currentSort.column === column 
                    ? currentSort.direction 
                    : 'asc';

                let songsToSort = this.songManager.getFilteredSongs(this.currentFilter);
                // Apply setlist filter if active
                if (this.currentSetlistId) {
                    const setlist = this.setlistManager.getSetlist(this.currentSetlistId);
                    if (setlist) {
                        songsToSort = songsToSort.filter(song => setlist.songIds.includes(song.id));
                    }
                }
                const { sorted, direction } = this.sorter.sort(
                    songsToSort,
                    column,
                    currentDirection
                );

                // Update UI indicators
                sortableHeaders.forEach(h => {
                    h.classList.remove('asc', 'desc');
                });
                header.classList.add(direction);

                // Preserve selection
                const selectedId = this.tableRenderer.getSelectedRowId();

                // Render sorted
                this.tableRenderer.render(sorted);

                // Restore selection (but don't open modal)
                if (selectedId) {
                    this.tableRenderer.selectRow(selectedId, true); // Skip callback to prevent modal opening
                }
            });
        });
    }

    handleRowSelect(songId) {
        // Open song detail modal when a row is selected
        if (songId) {
            this.navigateToSong(songId);
        } else {
            this.songDetailModal.hide();
        }
    }

    navigateToSong(songId) {
        const song = this.songManager.getSongById(songId);
        if (song) {
            // Also select the row in the table to keep in sync
            if (this.tableRenderer) {
                this.tableRenderer.selectRow(songId, true);
            }
            this.songDetailModal.show(song);
        }
    }

    async handleCellEdit(songId, field, value) {
        await this.songManager.updateSong(songId, { [field]: value });
        // Selection remains visible in the row itself
    }

    setupAddSongButton() {
        const addBtn = document.getElementById('addSongBtn');
        if (addBtn) {
            addBtn.addEventListener('click', () => {
                // If a setlist is selected, open the add songs modal
                if (this.currentSetlistId) {
                    this.openAddSongsToSetlistModal();
                } else {
                    // Otherwise, add a new song
                    this.addNewSong();
                }
            });
        }
    }

    openAddSongsToSetlistModal() {
        const modal = document.getElementById('addSongsToSetlistModal');
        const modalTitle = document.getElementById('addSongsModalTitle');
        const setlist = this.setlistManager.getSetlist(this.currentSetlistId);
        
        if (setlist) {
            modalTitle.textContent = `Add songs to "${setlist.name}"`;
            this.populateSongsList(setlist);
            modal.classList.remove('hidden');
        }
    }

    async addNewSong() {
        const newSong = await this.songManager.addSong({
            artist: '',
            title: '',
            verse: '',
            chorus: '',
            preChorus: '',
            bridge: ''
        });

        // Re-render table
        this.loadAndRender();

        // Open the detail modal with the new empty song and auto-focus artist field
        setTimeout(() => {
            const song = this.songManager.getSongById(newSong.id);
            if (song) {
                // Select the row in the table first so loadAndRender doesn't close the modal
                if (this.tableRenderer) {
                    this.tableRenderer.selectRow(song.id, true); // true = skip callback
                }
                this.songDetailModal.show(song, true); // true = auto-edit artist field
            }
        }, 50);
    }

    async handleDelete(songId) {
        if (await this.songManager.deleteSong(songId)) {
            // Remove song from all setlists
            const setlists = this.setlistManager.getAllSetlists();
            for (const setlist of setlists) {
                await this.setlistManager.removeSongFromSetlist(setlist.id, songId);
            }
            // Re-render table
            this.loadAndRender();
        }
    }

    handlePlayYouTube(songId) {
        const song = this.songManager.getSongById(songId);
        if (!song) return;
        
        const youtubeUrl = song.youtubeUrl || '';
        if (!youtubeUrl.trim()) {
            alert('Geen YouTube URL ingesteld voor dit liedje. Voeg een YouTube URL toe in de bewerkmodus.');
            return;
        }
        
        // Extract video ID from YouTube URL
        const videoId = this.extractYouTubeVideoId(youtubeUrl);
        if (!videoId) {
            alert('Invalid YouTube URL. Use a full YouTube URL (e.g. https://www.youtube.com/watch?v=VIDEO_ID)');
            return;
        }
        
        // Show and initialize mini player
        this.showYouTubeMiniPlayer(song, videoId);
    }

    extractYouTubeVideoId(url) {
        if (!url) return null;
        
        // Handle various YouTube URL formats
        const patterns = [
            /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
            /youtube\.com\/watch\?.*v=([^&\n?#]+)/
        ];
        
        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match && match[1]) {
                return match[1];
            }
        }
        
        return null;
    }

    showYouTubeMiniPlayer(song, videoId) {
        const player = document.getElementById('youtubeMiniPlayer');
        const container = document.getElementById('youtubePlayerContainer');
        const title = document.getElementById('youtubePlayerTitle');
        
        if (!player || !container || !title) return;
        
        // Set title
        title.textContent = `${song.artist || 'Unknown'} - ${song.title || 'No title'}`;
        
        // Clear previous iframe
        container.innerHTML = '';
        
        // Create YouTube iframe
        const iframe = document.createElement('iframe');
        iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;
        iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
        iframe.allowFullscreen = true;
        iframe.frameBorder = '0';
        iframe.className = 'youtube-iframe';
        
        container.appendChild(iframe);
        
        // Show player
        player.classList.remove('hidden');
        
        // Setup event listeners if not already done
        this.setupYouTubeMiniPlayer();
    }

    setupYouTubeMiniPlayer() {
        const player = document.getElementById('youtubeMiniPlayer');
        const closeBtn = document.getElementById('youtubePlayerClose');
        const minimizeBtn = document.getElementById('youtubePlayerMinimize');
        const header = player?.querySelector('.youtube-mini-player-header');
        
        if (!player) return;
        
        // Remove existing listeners by cloning
        const newCloseBtn = closeBtn?.cloneNode(true);
        const newMinimizeBtn = minimizeBtn?.cloneNode(true);
        
        if (closeBtn && newCloseBtn) {
            closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);
            newCloseBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.hideYouTubeMiniPlayer();
            });
        }
        
        if (minimizeBtn && newMinimizeBtn) {
            minimizeBtn.parentNode.replaceChild(newMinimizeBtn, minimizeBtn);
            newMinimizeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                player.classList.toggle('minimized');
                newMinimizeBtn.textContent = player.classList.contains('minimized') ? '🔺' : '🔻';
            });
        }
        
        // Setup drag functionality (works with mouse and touch)
        if (header && !player.dataset.dragSetup) {
            player.dataset.dragSetup = 'true';
            let isDragging = false;
            let currentX = 0;
            let currentY = 0;
            let initialX = 0;
            let initialY = 0;
            let xOffset = 0;
            let yOffset = 0;
            
            // Get current position from CSS
            const updateOffset = () => {
                const rect = player.getBoundingClientRect();
                xOffset = rect.left;
                yOffset = rect.top;
            };
            
            updateOffset();
            
            const dragStart = (e) => {
                // Don't drag if clicking on buttons
                if (e.target.closest('.youtube-player-close-btn') || 
                    e.target.closest('.youtube-player-minimize-btn')) {
                    return;
                }
                
                if (e.type === 'touchstart') {
                    initialX = e.touches[0].clientX - xOffset;
                    initialY = e.touches[0].clientY - yOffset;
                } else {
                    initialX = e.clientX - xOffset;
                    initialY = e.clientY - yOffset;
                }
                
                if (header.contains(e.target) || e.target === header) {
                    isDragging = true;
                    player.style.transition = 'none';
                }
            };
            
            const drag = (e) => {
                if (!isDragging) return;
                
                e.preventDefault();
                
                if (e.type === 'touchmove') {
                    currentX = e.touches[0].clientX - initialX;
                    currentY = e.touches[0].clientY - initialY;
                } else {
                    currentX = e.clientX - initialX;
                    currentY = e.clientY - initialY;
                }
                
                xOffset = currentX;
                yOffset = currentY;
                
                // Keep player within viewport bounds
                const maxX = window.innerWidth - player.offsetWidth;
                const maxY = window.innerHeight - player.offsetHeight;
                
                xOffset = Math.max(0, Math.min(xOffset, maxX));
                yOffset = Math.max(0, Math.min(yOffset, maxY));
                
                setTranslate(xOffset, yOffset, player);
            };
            
            const dragEnd = () => {
                if (!isDragging) return;
                
                initialX = currentX;
                initialY = currentY;
                isDragging = false;
                player.style.transition = 'all 0.3s ease';
            };
            
            const setTranslate = (xPos, yPos, el) => {
                el.style.transform = `translate(${xPos}px, ${yPos}px)`;
                el.style.left = '0';
                el.style.top = '0';
                el.style.right = 'auto';
                el.style.bottom = 'auto';
            };
            
            // Mouse events
            header.addEventListener('mousedown', dragStart);
            document.addEventListener('mousemove', drag);
            document.addEventListener('mouseup', dragEnd);
            
            // Touch events (for iPad/mobile)
            header.addEventListener('touchstart', dragStart, { passive: false });
            document.addEventListener('touchmove', drag, { passive: false });
            document.addEventListener('touchend', dragEnd);
            
            // Make header cursor indicate draggable
            header.style.cursor = 'move';
            header.style.userSelect = 'none';
        }
    }

    hideYouTubeMiniPlayer() {
        const player = document.getElementById('youtubeMiniPlayer');
        const container = document.getElementById('youtubePlayerContainer');
        
        if (player) {
            player.classList.add('hidden');
            player.classList.remove('minimized');
        }
        
        // Clear iframe to stop video
        if (container) {
            container.innerHTML = '';
        }
    }

    setupImportExport() {
        // Export functionality
        const exportBtn = document.getElementById('exportBtn');
        exportBtn.addEventListener('click', () => {
            this.exportSongs();
        });

        // Import functionality
        const importFile = document.getElementById('importFile');
        importFile.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.importSongs(file);
            }
            // Reset input so same file can be selected again
            e.target.value = '';
        });

        // Delete all songs functionality
        const deleteAllBtn = document.getElementById('deleteAllSongsBtn');
        if (deleteAllBtn) {
            deleteAllBtn.addEventListener('click', () => {
                this.deleteAllSongs();
            });
        }
    }

    setupPrintButton() {
        const printBtn = document.getElementById('printTableBtn');
        if (!printBtn) return;

        printBtn.addEventListener('click', () => {
            this.printTable();
        });
    }

    async deleteAllSongs() {
        const songCount = this.songManager.getAllSongs().length;
        
        if (songCount === 0) {
            alert('There are no songs to delete.');
            return;
        }

        // Show warning with song count
        const message = `WARNING: You are about to permanently delete all ${songCount} song(s)!\n\n` +
                       `This action cannot be undone.\n\n` +
                       `Are you sure you want to continue?`;
        
        if (!confirm(message)) {
            return;
        }

        // Double confirmation
        const doubleConfirm = confirm(
            `Final confirmation: All ${songCount} song(s) will now be deleted.\n\n` +
            `Click "OK" to confirm or "Cancel" to abort.`
        );

        if (!doubleConfirm) {
            return;
        }

        // Delete all songs
        await this.songManager.deleteAllSongs();

        // Re-render
        this.loadAndRender();
        this.updateSetlistSelect();

        // Show success message
        alert(`All ${songCount} song(s) have been successfully deleted.`);
    }

    exportSongs() {
        const songs = this.songManager.getAllSongs();
        const setlists = this.setlistManager.getAllSetlists();
        
        const exportData = {
            version: '1.0',
            exportDate: new Date().toISOString(),
            songs: songs,
            setlists: setlists
        };

        const jsonString = JSON.stringify(exportData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `popsong-chordbook-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        // Show feedback
        const exportBtn = document.getElementById('exportBtn');
        const iconElement = exportBtn.querySelector('.icon');
        if (iconElement) {
            const originalIcon = iconElement.textContent;
            iconElement.textContent = '✓';
            setTimeout(() => {
                iconElement.textContent = originalIcon;
            }, 2000);
        } else {
            // Fallback for old structure
            const originalText = exportBtn.textContent;
            exportBtn.textContent = '✓ Geëxporteerd!';
            setTimeout(() => {
                exportBtn.textContent = originalText;
            }, 2000);
        }
    }

    printTable() {
        // Ensure the latest data is shown before printing
        this.loadAndRender();
        window.print();
    }

    setupToggleView() {
        const toggleBtn = document.getElementById('toggleViewBtn');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.viewMode = this.viewMode === 'full' ? 'simple' : 'full';
                this.updateViewMode();
                this.loadAndRender();
            });
            this.updateViewMode();
        }
    }

    updateViewMode() {
        const toggleBtn = document.getElementById('toggleViewBtn');
        const table = document.getElementById('songsTable');
        if (toggleBtn && table) {
            const iconSpan = toggleBtn.querySelector('.icon');
            if (iconSpan) {
                if (this.viewMode === 'simple') {
                    iconSpan.textContent = '📊';
                    toggleBtn.title = 'Full view';
                } else {
                    iconSpan.textContent = '📋';
                    toggleBtn.title = 'Simple view';
                }
            } else {
                // Fallback for if structure is not yet set up
                if (this.viewMode === 'simple') {
                    toggleBtn.textContent = '📊';
                    toggleBtn.title = 'Full view';
                } else {
                    toggleBtn.textContent = '📋';
                    toggleBtn.title = 'Simple view';
                }
            }
            if (this.viewMode === 'simple') {
                table.classList.add('simple-view');
            } else {
                table.classList.remove('simple-view');
            }
        }
    }

    async importSongs(file) {
        try {
            const text = await file.text();
            const importData = JSON.parse(text);

            // Validate structure
            if (!importData.songs || !Array.isArray(importData.songs)) {
                throw new Error('Ongeldig bestandsformaat: songs array ontbreekt');
            }

            const songCount = importData.songs.length;
            const setlistCount = importData.setlists ? importData.setlists.length : 0;
            const currentSongCount = this.songManager.getAllSongs().length;

            // Ask user how to import
            let replace = true;
            if (currentSongCount > 0) {
                const importChoice = confirm(
                    `How do you want to import ${songCount} song(s)?\n\n` +
                    `Click "OK" to delete current songs and import new ones.\n` +
                    `Click "Cancel" to add new songs to existing songs.`
                );
                replace = importChoice;
            }

            // Import songs
            const result = await this.songManager.importSongs(importData.songs, replace);

            // Import setlists if present
            if (importData.setlists && Array.isArray(importData.setlists)) {
                await this.setlistManager.importSetlists(importData.setlists);
            }

            // Re-render
            this.loadAndRender();
            this.updateSetlistSelect();

            // Show success message with details
            let message = `Succesvol geïmporteerd: ${result.added} song(s)`;
            if (result.duplicates > 0) {
                message += `\n\n${result.duplicates} dubbel(ling)(en) overgeslagen:`;
                if (result.duplicateSongs.length <= 10) {
                    message += '\n' + result.duplicateSongs.join('\n');
                } else {
                    message += '\n' + result.duplicateSongs.slice(0, 10).join('\n');
                    message += `\n... en ${result.duplicateSongs.length - 10} meer`;
                }
            }
            if (setlistCount > 0) {
                message += `\n\n${setlistCount} setlist(s) geïmporteerd`;
            }
            alert(message);
        } catch (error) {
            console.error('Import error:', error);
            alert(`Fout bij importeren: ${error.message}`);
        }
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new App();
});

