// SongDetailModal - Modal voor song details weergave
class SongDetailModal {
    constructor(songManager, onNavigate, onUpdate = null, chordModal = null, onToggleFavorite = null) {
        this.songManager = songManager;
        this.onNavigate = onNavigate;
        this.onUpdate = onUpdate;
        this.chordModal = chordModal;
        this.onToggleFavorite = onToggleFavorite;
        this.currentSongId = null;
        this.allSongs = [];
        this.modal = document.getElementById('songDetailModal');
        this.closeBtn = document.getElementById('songDetailModalClose');
        this.prevBtn = document.getElementById('songDetailPrev');
        this.nextBtn = document.getElementById('songDetailNext');
        this.saveBtn = document.getElementById('songDetailSaveBtn');
        this.artistElement = document.getElementById('songDetailArtist');
        this.titleElement = document.getElementById('songDetailTitle');
        this.favoriteBtn = document.getElementById('songDetailFavoriteBtn');
        this.sections = {
            verse: {
                section: document.getElementById('verseSection'),
                content: document.getElementById('verseContent')
            },
            preChorus: {
                section: document.getElementById('preChorusSection'),
                content: document.getElementById('preChorusContent')
            },
            chorus: {
                section: document.getElementById('chorusSection'),
                content: document.getElementById('chorusContent')
            },
            bridge: {
                section: document.getElementById('bridgeSection'),
                content: document.getElementById('bridgeContent')
            }
        };
        this.hasUnsavedChanges = false;
        this.originalSongData = null;
        this.setupEventListeners();
    }

    setSongs(songs) {
        this.allSongs = songs;
    }

    setupEventListeners() {
        this.closeBtn.addEventListener('click', () => this.hide());
        this.prevBtn.addEventListener('click', () => this.navigatePrevious());
        this.nextBtn.addEventListener('click', () => this.navigateNext());
        
        if (this.saveBtn) {
            this.saveBtn.addEventListener('click', () => this.saveChanges());
        }
        
        if (this.favoriteBtn) {
            this.favoriteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleFavorite();
            });
        }
        
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.hide();
            }
        });
        
        // Make fields editable on click
        this.setupEditableFields();
        
        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (!this.modal.classList.contains('hidden')) {
                if (e.key === 'Escape') {
                    // If editing, exit edit mode; otherwise close modal
                    const activeElement = document.activeElement;
                    if (activeElement && activeElement.hasAttribute('contenteditable') && activeElement.getAttribute('contenteditable') === 'true') {
                        activeElement.setAttribute('contenteditable', 'false');
                        activeElement.blur();
                    } else {
                        this.hide();
                    }
                } else if (e.key === 'ArrowLeft' && !e.target.hasAttribute('contenteditable')) {
                    this.navigatePrevious();
                } else if (e.key === 'ArrowRight' && !e.target.hasAttribute('contenteditable')) {
                    this.navigateNext();
                } else if ((e.key === 's' || e.key === 'S') && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    if (this.hasUnsavedChanges) {
                        this.saveChanges();
                    }
                }
            }
        });
    }
    
    setupEditableFields() {
        // Setup artist and title
        if (this.artistElement) {
            this.artistElement.addEventListener('click', (e) => {
                e.stopPropagation();
                this.enterEditMode(this.artistElement);
            });
            this.artistElement.addEventListener('blur', () => {
                this.artistElement.setAttribute('contenteditable', 'false');
                this.artistElement.classList.remove('editing');
                this.checkForChanges();
            });
            this.artistElement.addEventListener('input', () => this.checkForChanges());
        }
        if (this.titleElement) {
            this.titleElement.addEventListener('click', (e) => {
                e.stopPropagation();
                this.enterEditMode(this.titleElement);
            });
            this.titleElement.addEventListener('blur', () => {
                this.titleElement.setAttribute('contenteditable', 'false');
                this.titleElement.classList.remove('editing');
                this.checkForChanges();
                // Remove chord button if exists (shouldn't be there for title, but just in case)
                const chordBtn = this.titleElement.parentElement?.querySelector('.chord-modal-btn-detail');
                if (chordBtn) {
                    chordBtn.remove();
                }
            });
            this.titleElement.addEventListener('input', () => this.checkForChanges());
        }
        
        // Setup section fields
        Object.values(this.sections).forEach(section => {
            if (section.content) {
                section.content.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.enterEditMode(section.content);
                });
                section.content.addEventListener('blur', () => {
                    section.content.setAttribute('contenteditable', 'false');
                    section.content.classList.remove('editing');
                    this.checkForChanges();
                    // Remove chord button
                    const chordBtn = section.section?.querySelector('.chord-modal-btn-detail');
                    if (chordBtn) {
                        chordBtn.remove();
                    }
                });
                section.content.addEventListener('input', () => this.checkForChanges());
            }
        });
    }
    
    enterEditMode(element) {
        if (!element) {
            return;
        }
        
        // If already in edit mode, do nothing
        if (element.getAttribute('contenteditable') === 'true') {
            return;
        }
        
        // Exit other edit modes
        document.querySelectorAll('.editable-field[contenteditable="true"]').forEach(el => {
            el.setAttribute('contenteditable', 'false');
            el.classList.remove('editing');
            // Remove chord button if exists
            const chordBtn = el.parentElement?.querySelector('.chord-modal-btn-detail');
            if (chordBtn) {
                chordBtn.remove();
            }
        });
        
        // Enable editing
        element.setAttribute('contenteditable', 'true');
        element.classList.add('editing');
        
        // Add chord button for chord fields (verse, preChorus, chorus, bridge)
        try {
            const fieldName = element.dataset.field;
            const chordFields = ['verse', 'preChorus', 'chorus', 'bridge'];
            if (chordFields.includes(fieldName) && this.chordModal) {
                this.addChordButton(element, fieldName);
            }
        } catch (error) {
            console.warn('Error adding chord button, continuing with edit mode:', error);
            // Don't prevent editing if button addition fails
        }
        
        // Focus and select text
        setTimeout(() => {
            try {
                element.focus();
                
                // Select all text if it's a single line field (artist, title)
                // Also handle placeholder text
                if (element === this.artistElement || element === this.titleElement) {
                    // If element is empty, don't select anything (just focus for editing)
                    if (element.textContent.trim() === '') {
                        // Just focus, cursor will be at start
                    } else {
                        const range = document.createRange();
                        range.selectNodeContents(element);
                        const selection = window.getSelection();
                        selection.removeAllRanges();
                        selection.addRange(range);
                    }
                } else {
                    // For multi-line fields, place cursor at end
                    const range = document.createRange();
                    range.selectNodeContents(element);
                    range.collapse(false);
                    const selection = window.getSelection();
                    selection.removeAllRanges();
                    selection.addRange(range);
                }
            } catch (error) {
                console.warn('Error focusing element:', error);
            }
        }, 50);
    }
    
    addChordButton(element, fieldName) {
        // Remove existing button if any
        const section = element.closest('.song-chord-section');
        if (section) {
            const existingBtn = section.querySelector('.chord-modal-btn-detail');
            if (existingBtn) {
                existingBtn.remove();
            }
        }
        
        // Create chord button
        const chordBtn = document.createElement('button');
        chordBtn.type = 'button';
        chordBtn.className = 'chord-modal-btn-detail';
        chordBtn.innerHTML = '🎵';
        chordBtn.title = 'Akkoorden toevoegen';
        chordBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            if (this.chordModal) {
                // Ensure element is in edit mode and focused
                if (element.getAttribute('contenteditable') !== 'true') {
                    element.setAttribute('contenteditable', 'true');
                    element.classList.add('editing');
                }
                element.focus();
                this.chordModal.show(element, fieldName);
            }
        });
        
        // Insert button in the section header next to title
        if (section) {
            const sectionHeader = section.querySelector('.chord-section-title');
            if (sectionHeader) {
                // Wrap title text in a span if not already wrapped
                if (!sectionHeader.querySelector('.chord-section-title-text')) {
                    const titleText = sectionHeader.textContent || sectionHeader.innerText || '';
                    const titleSpan = document.createElement('span');
                    titleSpan.className = 'chord-section-title-text';
                    titleSpan.textContent = titleText;
                    sectionHeader.textContent = ''; // Clear first
                    sectionHeader.appendChild(titleSpan);
                }
                
                sectionHeader.appendChild(chordBtn);
            }
        }
    }
    
    checkForChanges() {
        if (!this.currentSongId) return;
        
        const song = this.songManager.getSongById(this.currentSongId);
        if (!song) return;
        
        // Store original data if not stored yet (when user first starts editing)
        if (!this.originalSongData) {
            // Get current displayed values, not from song (in case we're reloading)
            this.originalSongData = {
                artist: this.artistElement ? this.artistElement.textContent.trim() : (song.artist || ''),
                title: this.titleElement ? this.titleElement.textContent.trim() : (song.title || ''),
                verse: this.sections.verse?.content ? this.sections.verse.content.textContent.trim() : (song.verse || ''),
                preChorus: this.sections.preChorus?.content ? this.sections.preChorus.content.textContent.trim() : (song.preChorus || ''),
                chorus: this.sections.chorus?.content ? this.sections.chorus.content.textContent.trim() : (song.chorus || ''),
                bridge: this.sections.bridge?.content ? this.sections.bridge.content.textContent.trim() : (song.bridge || '')
            };
        }
        
        // Check current values
        const currentData = {
            artist: this.artistElement ? this.artistElement.textContent.trim() : '',
            title: this.titleElement ? this.titleElement.textContent.trim() : '',
            verse: this.sections.verse?.content ? this.sections.verse.content.textContent.trim() : '',
            preChorus: this.sections.preChorus?.content ? this.sections.preChorus.content.textContent.trim() : '',
            chorus: this.sections.chorus?.content ? this.sections.chorus.content.textContent.trim() : '',
            bridge: this.sections.bridge?.content ? this.sections.bridge.content.textContent.trim() : ''
        };
        
        // Compare with original
        this.hasUnsavedChanges = JSON.stringify(currentData) !== JSON.stringify(this.originalSongData);
        
        // Show/hide save button
        if (this.saveBtn) {
            if (this.hasUnsavedChanges) {
                this.saveBtn.classList.remove('hidden');
            } else {
                this.saveBtn.classList.add('hidden');
            }
        }
    }
    
    saveChanges() {
        if (!this.currentSongId || !this.hasUnsavedChanges) return;
        
        const updates = {};
        
        // Get current values from editable fields
        if (this.artistElement) {
            updates.artist = this.artistElement.textContent.trim();
        }
        if (this.titleElement) {
            updates.title = this.titleElement.textContent.trim();
        }
        if (this.sections.verse?.content) {
            updates.verse = this.sections.verse.content.textContent.trim();
        }
        if (this.sections.preChorus?.content) {
            updates.preChorus = this.sections.preChorus.content.textContent.trim();
        }
        if (this.sections.chorus?.content) {
            updates.chorus = this.sections.chorus.content.textContent.trim();
        }
        if (this.sections.bridge?.content) {
            updates.bridge = this.sections.bridge.content.textContent.trim();
        }
        
        // Update song
        this.songManager.updateSong(this.currentSongId, updates);
        
        // Notify parent to refresh table
        if (this.onUpdate) {
            this.onUpdate();
        }
        
        // Update originalSongData to current values so they become the new baseline
        this.originalSongData = {
            artist: updates.artist !== undefined ? updates.artist : (this.originalSongData?.artist || ''),
            title: updates.title !== undefined ? updates.title : (this.originalSongData?.title || ''),
            verse: updates.verse !== undefined ? updates.verse : (this.originalSongData?.verse || ''),
            preChorus: updates.preChorus !== undefined ? updates.preChorus : (this.originalSongData?.preChorus || ''),
            chorus: updates.chorus !== undefined ? updates.chorus : (this.originalSongData?.chorus || ''),
            bridge: updates.bridge !== undefined ? updates.bridge : (this.originalSongData?.bridge || '')
        };
        
        // Reset change tracking
        this.hasUnsavedChanges = false;
        
        // Hide save button
        if (this.saveBtn) {
            this.saveBtn.classList.add('hidden');
        }
        
        // Exit edit mode and remove chord buttons
        document.querySelectorAll('.editable-field[contenteditable="true"]').forEach(el => {
            el.setAttribute('contenteditable', 'false');
            el.classList.remove('editing');
            // Remove chord buttons
            const section = el.closest('.song-chord-section');
            if (section) {
                const chordBtn = section.querySelector('.chord-modal-btn-detail');
                if (chordBtn) {
                    chordBtn.remove();
                }
            }
        });
    }

    navigatePrevious() {
        if (!this.currentSongId || this.allSongs.length === 0) return;
        
        const currentIndex = this.allSongs.findIndex(song => song.id === this.currentSongId);
        if (currentIndex > 0) {
            const previousSong = this.allSongs[currentIndex - 1];
            if (this.onNavigate) {
                this.onNavigate(previousSong.id, true);
            }
        }
    }

    navigateNext() {
        if (!this.currentSongId || this.allSongs.length === 0) return;
        
        const currentIndex = this.allSongs.findIndex(song => song.id === this.currentSongId);
        if (currentIndex < this.allSongs.length - 1) {
            const nextSong = this.allSongs[currentIndex + 1];
            if (this.onNavigate) {
                this.onNavigate(nextSong.id, true);
            }
        }
    }

    show(song) {
        if (!song) {
            this.hide();
            return;
        }

        // Save any unsaved changes before switching songs
        if (this.hasUnsavedChanges && this.currentSongId) {
            if (confirm('Je hebt niet-opgeslagen wijzigingen. Wil je deze eerst opslaan?')) {
                this.saveChanges();
            } else {
                // Discard changes and reload original data
                this.discardChanges();
            }
        }

        this.currentSongId = song.id;
        this.hasUnsavedChanges = false;
        this.originalSongData = null;

        // Update artist and title
        if (this.artistElement) {
            this.artistElement.textContent = song.artist || '';
            this.artistElement.setAttribute('contenteditable', 'false');
            this.artistElement.classList.remove('editing');
        }
        if (this.titleElement) {
            this.titleElement.textContent = song.title || '';
            this.titleElement.setAttribute('contenteditable', 'false');
            this.titleElement.classList.remove('editing');
        }

        // Update favorite button
        if (this.favoriteBtn) {
            this.updateFavoriteButton(song.favorite || false);
        }

        // Hide save button
        if (this.saveBtn) {
            this.saveBtn.classList.add('hidden');
        }

        // Update navigation buttons
        this.updateNavigationButtons();

        // Verse (always show, even if empty - so user can add content)
        if (this.sections.verse && this.sections.verse.content) {
            this.sections.verse.content.textContent = song.verse || '';
            this.sections.verse.content.setAttribute('contenteditable', 'false');
            this.sections.verse.content.classList.remove('editing');
            if (this.sections.verse.section) {
                this.sections.verse.section.classList.remove('hidden');
            }
        }

        // Pre-Chorus (always show)
        if (this.sections.preChorus && this.sections.preChorus.content) {
            this.sections.preChorus.content.textContent = song.preChorus || '';
            this.sections.preChorus.content.setAttribute('contenteditable', 'false');
            this.sections.preChorus.content.classList.remove('editing');
            if (this.sections.preChorus.section) {
                this.sections.preChorus.section.classList.remove('hidden');
            }
        }

        // Chorus (always show)
        if (this.sections.chorus && this.sections.chorus.content) {
            this.sections.chorus.content.textContent = song.chorus || '';
            this.sections.chorus.content.setAttribute('contenteditable', 'false');
            this.sections.chorus.content.classList.remove('editing');
            if (this.sections.chorus.section) {
                this.sections.chorus.section.classList.remove('hidden');
            }
        }

        // Bridge (always show)
        if (this.sections.bridge && this.sections.bridge.content) {
            this.sections.bridge.content.textContent = song.bridge || '';
            this.sections.bridge.content.setAttribute('contenteditable', 'false');
            this.sections.bridge.content.classList.remove('editing');
            if (this.sections.bridge.section) {
                this.sections.bridge.section.classList.remove('hidden');
            }
        }

        // Show modal
        if (this.modal) {
            this.modal.classList.remove('hidden');
        }
    }

    updateNavigationButtons() {
        if (!this.currentSongId || this.allSongs.length === 0) {
            this.prevBtn.style.opacity = '0.5';
            this.prevBtn.style.cursor = 'not-allowed';
            this.nextBtn.style.opacity = '0.5';
            this.nextBtn.style.cursor = 'not-allowed';
            return;
        }

        const currentIndex = this.allSongs.findIndex(song => song.id === this.currentSongId);
        
        // Previous button
        if (currentIndex > 0) {
            this.prevBtn.style.opacity = '1';
            this.prevBtn.style.cursor = 'pointer';
            this.prevBtn.disabled = false;
        } else {
            this.prevBtn.style.opacity = '0.5';
            this.prevBtn.style.cursor = 'not-allowed';
            this.prevBtn.disabled = true;
        }

        // Next button
        if (currentIndex < this.allSongs.length - 1) {
            this.nextBtn.style.opacity = '1';
            this.nextBtn.style.cursor = 'pointer';
            this.nextBtn.disabled = false;
        } else {
            this.nextBtn.style.opacity = '0.5';
            this.nextBtn.style.cursor = 'not-allowed';
            this.nextBtn.disabled = true;
        }
    }

    toggleFavorite() {
        if (!this.currentSongId || !this.onToggleFavorite) return;
        this.onToggleFavorite(this.currentSongId);
        
        // Update button state from current song data
        const song = this.songManager.getSongById(this.currentSongId);
        if (song) {
            this.updateFavoriteButton(song.favorite || false);
        }
    }

    updateFavoriteButton(isFavorite) {
        if (!this.favoriteBtn) return;
        this.favoriteBtn.innerHTML = isFavorite ? '⭐' : '☆';
        this.favoriteBtn.title = isFavorite ? 'Verwijder uit favorieten' : 'Voeg toe aan favorieten';
        if (isFavorite) {
            this.favoriteBtn.classList.add('favorite-active');
        } else {
            this.favoriteBtn.classList.remove('favorite-active');
        }
    }

    discardChanges() {
        if (!this.currentSongId || !this.originalSongData) return;
        
        // Reload original song data
        const song = this.songManager.getSongById(this.currentSongId);
        if (!song) return;
        
        // Restore original values
        if (this.artistElement) {
            this.artistElement.textContent = this.originalSongData.artist || '';
        }
        if (this.titleElement) {
            this.titleElement.textContent = this.originalSongData.title || '';
        }
        if (this.sections.verse?.content) {
            this.sections.verse.content.textContent = this.originalSongData.verse || '';
        }
        if (this.sections.preChorus?.content) {
            this.sections.preChorus.content.textContent = this.originalSongData.preChorus || '';
        }
        if (this.sections.chorus?.content) {
            this.sections.chorus.content.textContent = this.originalSongData.chorus || '';
        }
        if (this.sections.bridge?.content) {
            this.sections.bridge.content.textContent = this.originalSongData.bridge || '';
        }
        
        // Reset change tracking
        this.hasUnsavedChanges = false;
        this.originalSongData = null;
        
        // Hide save button
        if (this.saveBtn) {
            this.saveBtn.classList.add('hidden');
        }
        
        // Exit edit mode and remove chord buttons
        document.querySelectorAll('.editable-field[contenteditable="true"]').forEach(el => {
            el.setAttribute('contenteditable', 'false');
            el.classList.remove('editing');
            // Remove chord buttons
            const section = el.closest('.song-chord-section');
            if (section) {
                const chordBtn = section.querySelector('.chord-modal-btn-detail');
                if (chordBtn) {
                    chordBtn.remove();
                }
            }
        });
    }
    
    hide() {
        // Check for unsaved changes before closing
        if (this.hasUnsavedChanges) {
            if (confirm('Je hebt niet-opgeslagen wijzigingen. Wil je deze eerst opslaan?')) {
                this.saveChanges();
            } else {
                this.discardChanges();
            }
        }
        
        this.modal.classList.add('hidden');
        this.currentSongId = null;
        this.hasUnsavedChanges = false;
        this.originalSongData = null;
    }
}

