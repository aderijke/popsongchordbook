// Main Application
class App {
    constructor() {
        this.songManager = new SongManager();
        this.setlistManager = new SetlistManager();
        this.sorter = new Sorter();
        this.chordModal = new ChordModal();
        this.songDetailModal = new SongDetailModal(
            this.songManager,
            (songId, skipTableSelection) => this.navigateToSong(songId, skipTableSelection)
        );
        this.currentFilter = 'all';
        this.currentSetlistId = null;
        this.searchTerm = '';
        
        this.tableRenderer = new TableRenderer(
            this.songManager,
            (songId) => this.handleRowSelect(songId),
            (songId, field, value) => this.handleCellEdit(songId, field, value),
            (songId) => this.handleDelete(songId),
            this.chordModal,
            (songId) => this.handleToggleFavorite(songId)
        );

        this.init();
    }

    async init() {
        this.setupSorting();
        this.setupAddSongButton();
        this.setupFilters();
        this.setupSearch();
        this.setupSetlists();
        this.setupAddSongsToSetlistModal();
        this.setupImportExport();
        this.setupDeselect();
        await this.addExampleSongIfEmpty();
        this.loadAndRender();
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
        if (!searchInput) return;
        
        // Search on input (real-time)
        searchInput.addEventListener('input', (e) => {
            this.searchTerm = e.target.value;
            this.loadAndRender();
        });
        
        // Clear search on Escape key
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                searchInput.value = '';
                this.searchTerm = '';
                this.loadAndRender();
                searchInput.blur();
            }
        });
    }

    handleToggleFavorite(songId) {
        this.songManager.toggleFavorite(songId);
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
        select.innerHTML = '<option value="">Alle Songs</option>';
        
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
                addSongBtn.textContent = 'Songs toevoegen';
                addSongBtn.title = 'Songs toevoegen aan setlist';
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
                addSongBtn.title = 'Nieuwe Song Toevoegen';
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

        const createSetlist = () => {
            const name = nameInput.value.trim();
            if (name) {
                this.setlistManager.createSetlist(name);
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
        deleteBtn.addEventListener('click', () => {
            if (this.currentSetlistId) {
                const setlist = this.setlistManager.getSetlist(this.currentSetlistId);
                if (setlist) {
                    if (confirm(`Weet je zeker dat je de setlist "${setlist.name}" wilt verwijderen?`)) {
                        this.setlistManager.deleteSetlist(this.currentSetlistId);
                        this.currentSetlistId = null;
                        this.updateSetlistSelect();
                        const select = document.getElementById('setlistSelect');
                        select.value = '';
                        // Reset to "Alle Songs" view
                        this.updateButtonsForSetlistMode();
                        // Load all songs (reset to "Alle Songs" view)
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

        addSelectedBtn.addEventListener('click', () => {
            const checkboxes = songsContainer.querySelectorAll('input[type="checkbox"]:checked:not(:disabled)');
            let addedCount = 0;
            let alreadyInSetlistCount = 0;

            checkboxes.forEach(cb => {
                const songId = parseInt(cb.value);
                const success = this.setlistManager.addSongToSetlist(this.currentSetlistId, songId);
                if (success) {
                    addedCount++;
                } else {
                    alreadyInSetlistCount++;
                }
            });

            if (addedCount > 0 || alreadyInSetlistCount > 0) {
                this.loadAndRender();
                let message = '';
                if (addedCount > 0) {
                    message = `${addedCount} song(s) toegevoegd`;
                }
                if (alreadyInSetlistCount > 0) {
                    message += message ? `, ${alreadyInSetlistCount} al aanwezig` : `${alreadyInSetlistCount} song(s) al aanwezig`;
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
            label.textContent = `${song.artist || 'Onbekend'} - ${song.title || 'Geen titel'}`;
            if (isInSetlist) {
                label.innerHTML += ' <span class="in-setlist-badge">(al in setlist)</span>';
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
                    data.songs.forEach(song => {
                        this.songManager.addSong(song);
                    });
                    
                    // Import setlists if present
                    if (data.setlists && Array.isArray(data.setlists) && data.setlists.length > 0) {
                        this.setlistManager.importSetlists(data.setlists);
                    }
                } else {
                    // Fallback to single example if JSON structure is invalid
                    this.songManager.addSong({
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
                this.songManager.addSong({
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

    navigateToSong(songId, skipTableSelection = false) {
        const song = this.songManager.getSongById(songId);
        if (song) {
            this.songDetailModal.show(song);
            // Also select the row in the table, but only if not called from navigation
            if (this.tableRenderer && !skipTableSelection) {
                this.tableRenderer.selectRow(songId, true);
            }
        }
    }

    handleCellEdit(songId, field, value) {
        this.songManager.updateSong(songId, { [field]: value });
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
            modalTitle.textContent = `Songs toevoegen aan "${setlist.name}"`;
            this.populateSongsList(setlist);
            modal.classList.remove('hidden');
        }
    }

    addNewSong() {
        const newSong = this.songManager.addSong({
            artist: '',
            title: '',
            verse: '',
            chorus: '',
            preChorus: '',
            bridge: ''
        });

        // Re-render table
        this.loadAndRender();

        // Select the new row and scroll to it (but don't open modal)
        setTimeout(() => {
            this.tableRenderer.selectRow(newSong.id, true); // Skip callback to prevent modal opening
            
            // Enter edit mode for the entire row (so chord modal buttons are shown)
            const row = document.querySelector(`tr[data-id="${newSong.id}"]`);
            if (row) {
                this.tableRenderer.toggleEditMode(newSong.id);
            }
        }, 100);
    }

    handleDelete(songId) {
        if (this.songManager.deleteSong(songId)) {
            // Remove song from all setlists
            this.setlistManager.getAllSetlists().forEach(setlist => {
                this.setlistManager.removeSongFromSetlist(setlist.id, songId);
            });
            // Re-render table
            this.loadAndRender();
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

    deleteAllSongs() {
        const songCount = this.songManager.getAllSongs().length;
        
        if (songCount === 0) {
            alert('Er zijn geen songs om te verwijderen.');
            return;
        }

        // Show warning with song count
        const message = `WAARSCHUWING: Je staat op het punt om alle ${songCount} song(s) permanent te verwijderen!\n\n` +
                       `Deze actie kan niet ongedaan worden gemaakt.\n\n` +
                       `Weet je zeker dat je door wilt gaan?`;
        
        if (!confirm(message)) {
            return;
        }

        // Double confirmation
        const doubleConfirm = confirm(
            `Laatste bevestiging: Alle ${songCount} song(s) worden nu verwijderd.\n\n` +
            `Klik "OK" om te bevestigen of "Annuleren" om af te breken.`
        );

        if (!doubleConfirm) {
            return;
        }

        // Delete all songs
        this.songManager.deleteAllSongs();

        // Re-render
        this.loadAndRender();
        this.updateSetlistSelect();

        // Show success message
        alert(`Alle ${songCount} song(s) zijn succesvol verwijderd.`);
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
        const originalText = exportBtn.textContent;
        exportBtn.textContent = '✓ Geëxporteerd!';
        setTimeout(() => {
            exportBtn.textContent = originalText;
        }, 2000);
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
                    `Hoe wil je de ${songCount} song(s) importeren?\n\n` +
                    `Klik "OK" om huidige songs te verwijderen en nieuwe te importeren.\n` +
                    `Klik "Annuleren" om nieuwe songs toe te voegen aan bestaande songs.`
                );
                replace = importChoice;
            }

            // Import songs
            const result = this.songManager.importSongs(importData.songs, replace);

            // Import setlists if present
            if (importData.setlists && Array.isArray(importData.setlists)) {
                this.setlistManager.importSetlists(importData.setlists);
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

