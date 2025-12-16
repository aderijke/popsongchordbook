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
        
        // Toggle category buttons
        const toggleSusAdd = document.getElementById('toggleSusAdd');
        const toggleSpecial = document.getElementById('toggleSpecial');
        const susAddCategory = document.getElementById('susAddCategory');
        const specialCategory = document.getElementById('specialCategory');
        const susAddButtons = document.getElementById('susAddChords');
        const specialButtons = document.getElementById('specialChords');
        
        if (toggleSusAdd) {
            toggleSusAdd.addEventListener('click', (e) => {
                e.stopPropagation();
                const isHidden = susAddButtons.classList.contains('hidden');
                susAddButtons.classList.toggle('hidden');
                toggleSusAdd.textContent = isHidden ? 'Verberg' : 'Toon';
            });
        }
        
        if (toggleSpecial) {
            toggleSpecial.addEventListener('click', (e) => {
                e.stopPropagation();
                const isHidden = specialButtons.classList.contains('hidden');
                specialButtons.classList.toggle('hidden');
                toggleSpecial.textContent = isHidden ? 'Verberg' : 'Toon';
            });
        }
        
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
        
        // Reset toggle states - hide Sus & Add and Special buttons by default, but keep category visible
        const susAddButtons = document.getElementById('susAddChords');
        const specialButtons = document.getElementById('specialChords');
        const toggleSusAdd = document.getElementById('toggleSusAdd');
        const toggleSpecial = document.getElementById('toggleSpecial');
        
        if (susAddButtons && toggleSusAdd) {
            susAddButtons.classList.add('hidden');
            toggleSusAdd.textContent = 'Toon';
        }
        
        if (specialButtons && toggleSpecial) {
            specialButtons.classList.add('hidden');
            toggleSpecial.textContent = 'Toon';
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
        this.editingRowId = null;
    }

    render(songs) {
        // Save current editing state
        const wasEditing = this.editingRowId;
        
        this.tbody.innerHTML = '';
        songs.forEach(song => {
            const row = this.createRow(song);
            this.tbody.appendChild(row);
        });
        
        // Restore edit mode if it was active
        if (wasEditing) {
            const song = this.songManager.getSongById(wasEditing);
            if (song) {
                const row = this.tbody.querySelector(`tr[data-id="${wasEditing}"]`);
                if (row) {
                    this.enterEditMode(wasEditing, row, song);
                }
            }
        }
        
        this.updateSelection();
        // Update header if a row is selected
        if (this.selectedRowId) {
            this.updateSelectedSongHeader(this.selectedRowId);
        }
    }

    updateFavoriteButton(songId, isFavorite) {
        const btn = this.tbody.querySelector(`button.favorite-btn[data-song-id="${songId}"]`);
        if (btn) {
            btn.innerHTML = isFavorite ? '⭐' : '☆';
            btn.title = isFavorite ? 'Verwijder uit favorieten' : 'Voeg toe aan favorieten';
            btn.dataset.favorite = isFavorite ? 'true' : 'false';
            if (isFavorite) {
                btn.classList.add('favorite-active');
            } else {
                btn.classList.remove('favorite-active');
            }
        }
    }

    createRow(song) {
        const row = document.createElement('tr');
        row.dataset.id = song.id;
        row.className = 'song-row';
        
        // Make entire row clickable for selection (except when editing)
        row.addEventListener('click', (e) => {
            // Don't select if clicking on buttons or input fields
            if (e.target.classList.contains('delete-btn') || 
                e.target.classList.contains('edit-btn') ||
                e.target.classList.contains('favorite-btn') ||
                e.target.closest('.favorite-btn') ||
                e.target.tagName === 'INPUT') {
                return;
            }
            // Don't select if double-clicking (for editing)
            if (e.detail === 2) {
                return;
            }
            // Don't select if row is in edit mode
            if (this.editingRowId === song.id) {
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
        favoriteBtn.dataset.favorite = song.favorite ? 'true' : 'false';
        if (song.favorite) {
            favoriteBtn.classList.add('favorite-active');
        }
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

        // Actions cell with Edit and Delete buttons
        const actionsCell = document.createElement('td');
        actionsCell.className = 'actions-cell';
        
        const editBtn = document.createElement('button');
        editBtn.className = 'edit-btn';
        editBtn.textContent = '✏️';
        editBtn.title = 'Bewerken';
        editBtn.dataset.songId = song.id;
        editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleEditMode(song.id);
        });
        actionsCell.appendChild(editBtn);
        
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

    toggleEditMode(songId) {
        const row = this.tbody.querySelector(`tr[data-id="${songId}"]`);
        if (!row) return;

        const song = this.songManager.getSongById(songId);
        if (!song) return;

        if (this.editingRowId === songId) {
            // Save and exit edit mode
            this.saveRowEdit(songId, row);
            this.editingRowId = null;
        } else {
            // Enter edit mode
            if (this.editingRowId) {
                // Save previous row first
                const prevRow = this.tbody.querySelector(`tr[data-id="${this.editingRowId}"]`);
                if (prevRow) {
                    this.saveRowEdit(this.editingRowId, prevRow);
                }
            }
            this.editingRowId = songId;
            this.enterEditMode(songId, row, song);
        }
    }

    enterEditMode(songId, row, song) {
        const cells = row.querySelectorAll('td');
        const fieldOrder = ['artist', 'title', 'favorite', 'verse', 'chorus', 'preChorus', 'bridge'];
        const inputs = [];
        
        cells.forEach((cell, index) => {
            // Skip actions cell (last one)
            if (index >= cells.length - 1) return;
            
            // Skip favorite cell (it's a button, not editable)
            if (cell.classList.contains('favorite-cell')) return;
            
            const field = fieldOrder[index];
            if (!field) return;

            const currentValue = cell.textContent.trim();
            const input = document.createElement('input');
            input.type = 'text';
            input.value = currentValue;
            input.className = 'row-edit-input';
            input.dataset.field = field;
            input.dataset.songId = songId;
            inputs.push(input);

            // Special handling for chord fields
            const chordFields = ['verse', 'chorus', 'preChorus', 'bridge'];
            if (chordFields.includes(field)) {
                input.addEventListener('focus', () => {
                    if (this.chordModal) {
                        this.chordModal.show(input, field);
                    }
                });
            }

            // Tab navigation between inputs
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Tab' || e.key === 'Enter') {
                    e.preventDefault();
                    const currentIndex = inputs.indexOf(input);
                    if (currentIndex < inputs.length - 1) {
                        inputs[currentIndex + 1].focus();
                        inputs[currentIndex + 1].select();
                    } else {
                        // Last field - save and exit
                        this.saveRowEdit(songId, row);
                        this.editingRowId = null;
                        const editBtn = row.querySelector('.edit-btn');
                        if (editBtn) {
                            editBtn.textContent = '✏️';
                            editBtn.title = 'Bewerken';
                        }
                    }
                } else if (e.key === 'Escape') {
                    // Cancel editing
                    this.cancelRowEdit(songId, row, song);
                }
            });

            cell.textContent = '';
            cell.appendChild(input);
        });

        // Focus first input
        if (inputs.length > 0) {
            inputs[0].focus();
            inputs[0].select();
        }

        // Update edit button
        const editBtn = row.querySelector('.edit-btn');
        if (editBtn) {
            editBtn.textContent = '💾';
            editBtn.title = 'Opslaan';
        }
    }

    cancelRowEdit(songId, row, song) {
        const inputs = row.querySelectorAll('.row-edit-input');
        const fieldOrder = ['artist', 'title', 'favorite', 'verse', 'chorus', 'preChorus', 'bridge'];
        let fieldIndex = 0;

        inputs.forEach(input => {
            const field = fieldOrder[fieldIndex++];
            if (field && field !== 'favorite') {
                const originalValue = song[field] || '';
                const cell = input.parentElement;
                cell.textContent = originalValue;
                input.remove();
            }
        });

        this.editingRowId = null;

        // Update edit button
        const editBtn = row.querySelector('.edit-btn');
        if (editBtn) {
            editBtn.textContent = '✏️';
            editBtn.title = 'Bewerken';
        }
    }

    saveRowEdit(songId, row) {
        const inputs = row.querySelectorAll('.row-edit-input');
        const updates = {};

        inputs.forEach(input => {
            const field = input.dataset.field;
            const value = input.value.trim();
            updates[field] = value;
            
            // Restore cell content
            const cell = input.parentElement;
            cell.textContent = value;
            input.remove();
        });

        // Save all updates
        if (this.onCellEdit) {
            Object.keys(updates).forEach(field => {
                this.onCellEdit(songId, field, updates[field]);
            });
        }

        // Update edit button
        const editBtn = row.querySelector('.edit-btn');
        if (editBtn) {
            editBtn.textContent = '✏️';
            editBtn.title = 'Bewerken';
        }
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
        if (songId) {
            this.updateSelectedSongHeader(songId);
            // Scroll selected row into view
            setTimeout(() => {
                const selectedRow = this.tbody.querySelector(`tr.selected`);
                if (selectedRow) {
                    selectedRow.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
            }, 100);
        } else {
            // Deselect - hide header
            const header = document.getElementById('selectedSongHeader');
            if (header) {
                header.classList.add('hidden');
            }
        }
        if (this.onRowSelect) {
            this.onRowSelect(songId);
        }
    }

    updateSelectedSongHeader(songId) {
        const header = document.getElementById('selectedSongHeader');
        const artistSpan = document.getElementById('selectedArtist');
        const titleSpan = document.getElementById('selectedTitle');
        
        if (songId && this.songManager) {
            const song = this.songManager.getSongById(songId);
            if (song) {
                artistSpan.textContent = song.artist || '';
                titleSpan.textContent = song.title || '';
                header.classList.remove('hidden');
                
                // Scroll header into view
                setTimeout(() => {
                    header.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }, 100);
            } else {
                header.classList.add('hidden');
            }
        } else {
            header.classList.add('hidden');
        }
    }

    updateSelection() {
        // Remove any existing selected row header
        const existingHeader = this.tbody.querySelector('tr.selected-row-header');
        if (existingHeader) {
            existingHeader.remove();
        }
        
        const rows = this.tbody.querySelectorAll('tr');
        rows.forEach(row => {
            const rowId = parseInt(row.dataset.id);
            const selectedId = this.selectedRowId ? parseInt(this.selectedRowId) : null;
            if (rowId === selectedId) {
                row.classList.add('selected');
                // Add header row above selected row
                this.addSelectedRowHeader(row);
            } else {
                row.classList.remove('selected');
            }
        });
        
        // Update header if no row is selected
        if (!this.selectedRowId) {
            const header = document.getElementById('selectedSongHeader');
            if (header) {
                header.classList.add('hidden');
            }
        }
    }

    addSelectedRowHeader(selectedRow) {
        const headerRow = document.createElement('tr');
        headerRow.className = 'selected-row-header';
        
        // Empty cells for artist, title, favorite (hidden columns)
        const emptyCell1 = document.createElement('td');
        emptyCell1.style.display = 'none';
        headerRow.appendChild(emptyCell1);
        
        const emptyCell2 = document.createElement('td');
        emptyCell2.style.display = 'none';
        headerRow.appendChild(emptyCell2);
        
        const emptyCell3 = document.createElement('td');
        emptyCell3.style.display = 'none';
        headerRow.appendChild(emptyCell3);
        
        // Verse header
        const verseHeader = document.createElement('td');
        verseHeader.className = 'chord-header-cell';
        verseHeader.textContent = 'Verse';
        headerRow.appendChild(verseHeader);
        
        // Chorus header
        const chorusHeader = document.createElement('td');
        chorusHeader.className = 'chord-header-cell chorus-header-cell';
        chorusHeader.textContent = 'Chorus';
        headerRow.appendChild(chorusHeader);
        
        // Pre-Chorus header
        const preChorusHeader = document.createElement('td');
        preChorusHeader.className = 'chord-header-cell';
        preChorusHeader.textContent = 'Pre-Chorus';
        headerRow.appendChild(preChorusHeader);
        
        // Bridge header
        const bridgeHeader = document.createElement('td');
        bridgeHeader.className = 'chord-header-cell';
        bridgeHeader.textContent = 'Bridge';
        headerRow.appendChild(bridgeHeader);
        
        // Empty cell for actions
        const emptyCell4 = document.createElement('td');
        emptyCell4.style.display = 'none';
        headerRow.appendChild(emptyCell4);
        
        // Insert header row before selected row
        selectedRow.parentNode.insertBefore(headerRow, selectedRow);
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
        this.setupDeselect();
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
        const header = document.getElementById('selectedSongHeader');
        if (header) {
            header.classList.add('hidden');
        }
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

