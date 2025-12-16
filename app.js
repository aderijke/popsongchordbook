// ChordModal - Modal voor akkoord selectie
class ChordModal {
    constructor() {
        this.modal = document.getElementById('chordModal');
        this.closeBtn = document.getElementById('chordModalClose');
        this.customInput = document.getElementById('chordCustomInput');
        this.addCustomBtn = document.getElementById('chordAddCustom');
        this.currentInput = null;
        this.currentField = null;
        
        this.setupChords();
        this.setupEventListeners();
    }

    setupChords() {
        const majorChords = ['C', 'D', 'E', 'F', 'G', 'A', 'B', 'C#', 'D#', 'F#', 'G#', 'A#', 'Db', 'Eb', 'Gb', 'Ab', 'Bb'];
        const minorChords = ['Cm', 'Dm', 'Em', 'Fm', 'Gm', 'Am', 'Bm', 'C#m', 'D#m', 'F#m', 'G#m', 'A#m', 'Dbm', 'Ebm', 'Gbm', 'Abm', 'Bbm'];
        const susAddChords = ['Csus2', 'Csus4', 'Cadd9', 'Dsus2', 'Dsus4', 'Dsus2', 'Esus4', 'Fsus2', 'Fsus4', 'Gsus2', 'Gsus4', 'Asus2', 'Asus4', 'C2', 'D2', 'E2', 'F2', 'G2', 'A2', 'B2'];
        const specialChords = ['C7', 'D7', 'E7', 'F7', 'G7', 'A7', 'B7', 'Cm7', 'Dm7', 'Em7', 'Fm7', 'Gm7', 'Am7', 'Bm7', 'Cdim', 'Caug', 'C/B', 'C/A', 'C/G', 'D/F#', 'Am/C'];
        
        this.renderChords('majorChords', majorChords);
        this.renderChords('minorChords', minorChords);
        this.renderChords('susAddChords', susAddChords);
        this.renderChords('specialChords', specialChords);
    }

    renderChords(containerId, chords) {
        const container = document.getElementById(containerId);
        container.innerHTML = '';
        chords.forEach(chord => {
            const btn = document.createElement('button');
            btn.className = 'chord-btn';
            btn.textContent = chord;
            btn.addEventListener('click', () => this.addChord(chord));
            container.appendChild(btn);
        });
    }

    setupEventListeners() {
        this.closeBtn.addEventListener('click', () => this.hide());
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.hide();
            }
        });
        this.addCustomBtn.addEventListener('click', () => this.addCustomChords());
        this.customInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.addCustomChords();
            } else if (e.key === 'Escape') {
                this.hide();
            }
        });
        
        // Close modal on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !this.modal.classList.contains('hidden')) {
                this.hide();
            }
        });
    }

    show(inputElement, field) {
        this.currentInput = inputElement;
        this.currentField = field;
        this.modal.classList.remove('hidden');
        
        // Check if this is a chord field
        const chordFields = ['verse', 'chorus', 'preChorus', 'bridge'];
        if (!chordFields.includes(field)) {
            // Don't show modal for non-chord fields
            return;
        }
        
        // Clear custom input and focus on it
        this.customInput.value = '';
        setTimeout(() => {
            this.customInput.focus();
        }, 100);
    }

    hide() {
        this.modal.classList.add('hidden');
        this.currentInput = null;
        this.currentField = null;
        this.customInput.value = '';
    }

    addChord(chord) {
        // Add chord to custom input field instead of directly to table input
        const currentCustomValue = this.customInput.value.trim();
        const separator = currentCustomValue ? ' ' : '';
        this.customInput.value = currentCustomValue + separator + chord;
        
        // Focus on custom input
        this.customInput.focus();
        // Move cursor to end
        const len = this.customInput.value.length;
        this.customInput.setSelectionRange(len, len);
    }

    addCustomChords() {
        if (!this.currentInput) return;
        
        const customChords = this.customInput.value.trim();
        if (customChords) {
            // Get current value from table input
            const currentValue = this.currentInput.value.trim();
            // Add new chords after existing chords with a space
            const separator = currentValue ? ' ' : '';
            this.currentInput.value = currentValue + separator + customChords;
            
            // Clear custom input
            this.customInput.value = '';
            
            // Keep table input focused
            setTimeout(() => {
                this.currentInput.focus();
                // Move cursor to end
                const len = this.currentInput.value.length;
                this.currentInput.setSelectionRange(len, len);
            }, 10);
        }
    }
}

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

    getFilteredSongs(filter) {
        if (filter === 'favorites') {
            return this.songs.filter(song => song.favorite === true);
        }
        return this.songs;
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

// TableRenderer - Tabel rendering en updates
class TableRenderer {
    constructor(songManager, onRowSelect, onCellEdit, onDelete, chordModal, onToggleFavorite) {
        this.songManager = songManager;
        this.onRowSelect = onRowSelect;
        this.onCellEdit = onCellEdit;
        this.onDelete = onDelete;
        this.chordModal = chordModal;
        this.onToggleFavorite = onToggleFavorite;
        this.tbody = document.getElementById('songsTableBody');
        this.selectedRowId = null;
    }

    render(songs) {
        this.tbody.innerHTML = '';
        songs.forEach(song => {
            const row = this.createRow(song);
            this.tbody.appendChild(row);
        });
        this.updateSelection();
    }

    updateFavoriteButton(songId, isFavorite) {
        const btn = this.tbody.querySelector(`button.favorite-btn[data-song-id="${songId}"]`);
        if (btn) {
            btn.innerHTML = isFavorite ? '⭐' : '☆';
            btn.title = isFavorite ? 'Verwijder uit favorieten' : 'Voeg toe aan favorieten';
        }
    }

    createRow(song) {
        const row = document.createElement('tr');
        row.dataset.id = song.id;
        row.className = 'song-row';
        
        // Make entire row clickable for selection (except when editing)
        row.addEventListener('click', (e) => {
            // Don't select if clicking on delete button, favorite button, or input field
            if (e.target.classList.contains('delete-btn') || 
                e.target.classList.contains('favorite-btn') ||
                e.target.closest('.favorite-btn') ||
                e.target.tagName === 'INPUT') {
                return;
            }
            // Don't select if double-clicking (for editing)
            if (e.detail === 2) {
                return;
            }
            this.selectRow(song.id);
        });

        // Artiest
        const artistCell = this.createEditableCell(song.artist, 'artist', song.id);
        row.appendChild(artistCell);

        // Songtitel (clickable for selection, editable via double-click)
        const titleCell = document.createElement('td');
        titleCell.className = 'title-cell editable';
        titleCell.textContent = song.title || '';
        titleCell.dataset.field = 'title';
        titleCell.dataset.songId = song.id;
        
        // Double click edits the title
        titleCell.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            this.startEditing(titleCell, 'title', song.id);
        });
        
        row.appendChild(titleCell);

        // Favorite button
        const favoriteCell = document.createElement('td');
        favoriteCell.className = 'favorite-cell';
        const favoriteBtn = document.createElement('button');
        favoriteBtn.className = 'favorite-btn';
        favoriteBtn.innerHTML = song.favorite ? '⭐' : '☆';
        favoriteBtn.title = song.favorite ? 'Verwijder uit favorieten' : 'Voeg toe aan favorieten';
        favoriteBtn.dataset.songId = song.id;
        favoriteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (this.onToggleFavorite) {
                this.onToggleFavorite(song.id);
            }
        });
        favoriteCell.appendChild(favoriteBtn);
        row.appendChild(favoriteCell);

        // Verse
        const verseCell = this.createEditableCell(song.verse, 'verse', song.id);
        verseCell.className += ' chord-cell';
        row.appendChild(verseCell);

        // Chorus
        const chorusCell = this.createEditableCell(song.chorus, 'chorus', song.id);
        chorusCell.className += ' chorus-cell chord-cell';
        row.appendChild(chorusCell);

        // Pre-Chorus
        const preChorusCell = this.createEditableCell(song.preChorus || '', 'preChorus', song.id);
        preChorusCell.className += ' chord-cell';
        row.appendChild(preChorusCell);

        // Bridge
        const bridgeCell = this.createEditableCell(song.bridge || '', 'bridge', song.id);
        bridgeCell.className += ' chord-cell';
        row.appendChild(bridgeCell);

        // Delete button
        const actionsCell = document.createElement('td');
        actionsCell.className = 'actions-cell';
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.textContent = 'Verwijder';
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm(`Weet je zeker dat je "${song.title || 'dit liedje'}" wilt verwijderen?`)) {
                if (this.onDelete) {
                    this.onDelete(song.id);
                }
            }
        });
        actionsCell.appendChild(deleteBtn);
        row.appendChild(actionsCell);

        return row;
    }

    createEditableCell(value, field, songId) {
        const cell = document.createElement('td');
        cell.className = 'editable';
        cell.textContent = value || '';
        cell.dataset.field = field;
        cell.dataset.songId = songId;

        cell.addEventListener('dblclick', () => {
            this.startEditing(cell, field, songId);
        });

        return cell;
    }

    startEditing(cell, field, songId) {
        const currentValue = cell.textContent;
        const input = document.createElement('input');
        input.type = 'text';
        input.value = currentValue;
        input.className = 'edit-input';

        // Define field order for tab navigation
        const fieldOrder = ['artist', 'title', 'verse', 'chorus', 'preChorus', 'bridge'];
        const currentIndex = fieldOrder.indexOf(field);

        const finishEditing = () => {
            const newValue = input.value.trim();
            cell.textContent = newValue;
            if (this.onCellEdit) {
                this.onCellEdit(songId, field, newValue);
            }
        };

        const cancelEditing = () => {
            cell.textContent = currentValue;
        };

        const moveToNextField = () => {
            // Hide modal when moving to next field
            if (this.chordModal) {
                this.chordModal.hide();
            }
            
            if (currentIndex < fieldOrder.length - 1) {
                const nextField = fieldOrder[currentIndex + 1];
                const row = cell.closest('tr');
                const nextCell = row.querySelector(`td[data-field="${nextField}"]`) || 
                                row.querySelector(`td.title-cell[data-field="${nextField}"]`);
                
                if (nextCell) {
                    finishEditing();
                    // Small delay to ensure the previous edit is saved
                    setTimeout(() => {
                        this.startEditing(nextCell, nextField, songId);
                    }, 50);
                } else {
                    finishEditing();
                }
            } else {
                finishEditing();
            }
        };

        input.addEventListener('blur', (e) => {
            // Don't finish if we're moving to next field
            if (e.relatedTarget && e.relatedTarget.tagName === 'INPUT') {
                return;
            }
            finishEditing();
        });

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                moveToNextField();
            } else if (e.key === 'Tab') {
                e.preventDefault();
                moveToNextField();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                cancelEditing();
                input.remove();
                cell.style.display = '';
            }
        });

        cell.textContent = '';
        cell.appendChild(input);
        input.focus();
        input.select();
        
        // Show chord modal for chord fields
        const chordFields = ['verse', 'chorus', 'preChorus', 'bridge'];
        if (chordFields.includes(field) && this.chordModal) {
            // Small delay to ensure input is ready
            setTimeout(() => {
                this.chordModal.show(input, field);
            }, 100);
        }
        
        // Hide modal when input loses focus, but only if not clicking on modal
        input.addEventListener('blur', (e) => {
            if (this.chordModal) {
                // Check if the blur is because user clicked on modal
                const relatedTarget = e.relatedTarget;
                const modal = this.chordModal.modal;
                
                // Don't hide if clicking on modal elements
                if (relatedTarget && (
                    modal.contains(relatedTarget) || 
                    relatedTarget.closest('.chord-modal')
                )) {
                    return;
                }
                
                // Delay hiding to allow for clicks on modal buttons
                setTimeout(() => {
                    // Only hide if input is still blurred and not focused
                    if (document.activeElement !== input && 
                        this.chordModal.currentInput === input &&
                        !modal.contains(document.activeElement)) {
                        this.chordModal.hide();
                    }
                }, 300);
            }
        });
    }

    selectRow(songId) {
        this.selectedRowId = songId;
        this.updateSelection();
        if (this.onRowSelect) {
            this.onRowSelect(songId);
        }
    }

    updateSelection() {
        const rows = this.tbody.querySelectorAll('tr');
        rows.forEach(row => {
            const rowId = parseInt(row.dataset.id);
            const selectedId = this.selectedRowId ? parseInt(this.selectedRowId) : null;
            if (rowId === selectedId) {
                row.classList.add('selected');
            } else {
                row.classList.remove('selected');
            }
        });
    }

    getSelectedRowId() {
        return this.selectedRowId;
    }
}

// Sorter - Sorteer logica
class Sorter {
    constructor() {
        this.currentSort = {
            column: null,
            direction: 'asc'
        };
    }

    sort(songs, column, currentDirection) {
        const direction = currentDirection === 'asc' ? 'desc' : 'asc';
        this.currentSort = { column, direction };

        const sorted = [...songs].sort((a, b) => {
            // Special handling for favorite column (boolean)
            if (column === 'favorite') {
                const aVal = a.favorite ? 1 : 0;
                const bVal = b.favorite ? 1 : 0;
                if (direction === 'asc') {
                    return bVal - aVal; // Favorites first
                } else {
                    return aVal - bVal; // Non-favorites first
                }
            }
            
            let aVal = a[column] || '';
            let bVal = b[column] || '';

            // Normalize for sorting (case-insensitive)
            aVal = aVal.toString().toLowerCase().trim();
            bVal = bVal.toString().toLowerCase().trim();

            if (direction === 'asc') {
                return aVal.localeCompare(bVal, 'nl');
            } else {
                return bVal.localeCompare(aVal, 'nl');
            }
        });

        return { sorted, direction };
    }

    getCurrentSort() {
        return this.currentSort;
    }
}

// ChordDisplay - Chord detail weergave
class ChordDisplay {
    constructor() {
        this.display = document.getElementById('chordDisplay');
        this.titleElement = document.getElementById('chordDisplayTitle');
        this.blocks = {
            verse: document.getElementById('verseBlock'),
            preChorus: document.getElementById('preChorusBlock'),
            chorus: document.getElementById('chorusBlock'),
            bridge: document.getElementById('bridgeBlock')
        };
        this.content = {
            verse: document.getElementById('verseContent'),
            preChorus: document.getElementById('preChorusContent'),
            chorus: document.getElementById('chorusContent'),
            bridge: document.getElementById('bridgeContent')
        };
    }

    show(song) {
        if (!song) {
            this.hide();
            return;
        }

        this.titleElement.textContent = `${song.artist} - ${song.title}`;

        // Verse (always show)
        this.content.verse.textContent = song.verse || '';
        this.blocks.verse.classList.remove('hidden');

        // Pre-Chorus (optional)
        if (song.preChorus && song.preChorus.trim()) {
            this.content.preChorus.textContent = song.preChorus;
            this.blocks.preChorus.classList.remove('hidden');
        } else {
            this.blocks.preChorus.classList.add('hidden');
        }

        // Chorus (always show)
        this.content.chorus.textContent = song.chorus || '';
        this.blocks.chorus.classList.remove('hidden');

        // Bridge (optional)
        if (song.bridge && song.bridge.trim()) {
            this.content.bridge.textContent = song.bridge;
            this.blocks.bridge.classList.remove('hidden');
        } else {
            this.blocks.bridge.classList.add('hidden');
        }

        this.display.classList.remove('hidden');
    }

    hide() {
        this.display.classList.add('hidden');
    }
}

// Main Application
class App {
    constructor() {
        this.songManager = new SongManager();
        this.sorter = new Sorter();
        this.chordDisplay = new ChordDisplay();
        this.chordModal = new ChordModal();
        this.currentFilter = 'all';
        
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

    init() {
        this.setupSorting();
        this.setupAddSongButton();
        this.setupFilters();
        this.loadAndRender();
        this.addExampleSongIfEmpty();
    }

    loadAndRender() {
        const allSongs = this.songManager.getFilteredSongs(this.currentFilter);
        this.tableRenderer.render(allSongs);
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

    handleToggleFavorite(songId) {
        this.songManager.toggleFavorite(songId);
        this.loadAndRender();
    }

    addExampleSongIfEmpty() {
        if (this.songManager.getAllSongs().length === 0) {
            // Add all default songs
            if (typeof DEFAULT_SONGS !== 'undefined' && DEFAULT_SONGS.length > 0) {
                DEFAULT_SONGS.forEach(song => {
                    this.songManager.addSong(song);
                });
            } else {
                // Fallback to single example if DEFAULT_SONGS is not available
                this.songManager.addSong({
                    artist: 'Bryan Adams',
                    title: 'Summer of 69',
                    verse: 'D A (3x)',
                    chorus: 'Bm A D G (2x)',
                    preChorus: 'D A (2x)',
                    bridge: 'F B C B (2x)'
                });
            }
            this.loadAndRender();
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

                const songsToSort = this.songManager.getFilteredSongs(this.currentFilter);
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

                // Restore selection
                if (selectedId) {
                    this.tableRenderer.selectRow(selectedId);
                }
            });
        });
    }

    handleRowSelect(songId) {
        // Selection is now handled visually in the row itself
        // No need to show separate chord display
    }

    handleCellEdit(songId, field, value) {
        this.songManager.updateSong(songId, { [field]: value });
        // Selection remains visible in the row itself
    }

    setupAddSongButton() {
        const addBtn = document.getElementById('addSongBtn');
        if (addBtn) {
            addBtn.addEventListener('click', () => {
                this.addNewSong();
            });
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

        // Select the new row and scroll to it
        setTimeout(() => {
            this.tableRenderer.selectRow(newSong.id);
            const row = document.querySelector(`tr[data-id="${newSong.id}"]`);
            if (row) {
                row.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                
                // Start editing the artist cell automatically
                const artistCell = row.querySelector('td[data-field="artist"]');
                if (artistCell) {
                    this.tableRenderer.startEditing(artistCell, 'artist', newSong.id);
                }
            }
        }, 100);
    }

    handleDelete(songId) {
        if (this.songManager.deleteSong(songId)) {
            // Re-render table
            this.loadAndRender();
        }
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new App();
});

