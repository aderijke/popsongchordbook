// SongDetailModal - Modal voor song details weergave
class SongDetailModal {
    constructor(songManager, onNavigate, onUpdate = null, chordModal = null, onToggleFavorite = null, onPlayYouTube = null) {
        this.songManager = songManager;
        this.onNavigate = onNavigate;
        this.onUpdate = onUpdate;
        this.chordModal = chordModal;
        this.onToggleFavorite = onToggleFavorite;
        this.onPlayYouTube = onPlayYouTube;
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
        this.youtubeBtn = document.getElementById('songDetailYouTubeBtn');
        this.youtubePlayBtn = document.getElementById('songDetailYouTubePlayBtn');
        this.youtubeUrlModal = document.getElementById('youtubeUrlModal');
        this.youtubeUrlInput = document.getElementById('youtubeUrlInput');
        this.youtubeUrlSaveBtn = document.getElementById('youtubeUrlSaveBtn');
        this.youtubeUrlCancelBtn = document.getElementById('youtubeUrlCancelBtn');
        this.youtubeUrlModalClose = document.getElementById('youtubeUrlModalClose');
        this.sections = {
            verse: {
                section: document.getElementById('verseSection'),
                content: document.getElementById('verseContent')
            },
            chorus: {
                section: document.getElementById('chorusSection'),
                content: document.getElementById('chorusContent')
            },
            preChorus: {
                section: document.getElementById('preChorusSection'),
                content: document.getElementById('preChorusContent')
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
        
        // Setup YouTube URL button
        if (this.youtubeBtn) {
            this.youtubeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.openYouTubeUrlModal();
            });
        }
        
        // Setup YouTube Play button
        if (this.youtubePlayBtn) {
            this.youtubePlayBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (this.onPlayYouTube && this.currentSongId) {
                    this.onPlayYouTube(this.currentSongId);
                }
            });
        }
        
        // Setup YouTube URL modal
        if (this.youtubeUrlModal) {
            if (this.youtubeUrlModalClose) {
                this.youtubeUrlModalClose.addEventListener('click', () => {
                    this.closeYouTubeUrlModal();
                });
            }
            if (this.youtubeUrlCancelBtn) {
                this.youtubeUrlCancelBtn.addEventListener('click', () => {
                    this.closeYouTubeUrlModal();
                });
            }
            if (this.youtubeUrlSaveBtn) {
                this.youtubeUrlSaveBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    this.saveYouTubeUrl();
                });
            }
            this.youtubeUrlModal.addEventListener('click', (e) => {
                if (e.target === this.youtubeUrlModal) {
                    this.closeYouTubeUrlModal();
                }
            });
            if (this.youtubeUrlInput) {
                this.youtubeUrlInput.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        this.saveYouTubeUrl();
                    } else if (e.key === 'Escape') {
                        e.preventDefault();
                        this.closeYouTubeUrlModal();
                    }
                });
            }
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
            this.artistElement.addEventListener('blur', (e) => {
                // Don't blur if we're moving to next field with Tab
                if (e.relatedTarget && e.relatedTarget.hasAttribute('contenteditable') && e.relatedTarget.getAttribute('contenteditable') === 'true') {
                    return;
                }
                
                this.artistElement.setAttribute('contenteditable', 'false');
                this.artistElement.classList.remove('editing');
                
                // Update placeholder state
                const artistText = this.artistElement.textContent || '';
                if (!artistText.trim()) {
                    this.artistElement.classList.add('empty-field');
                    this.artistElement.dataset.placeholder = 'Artiest';
                    this.artistElement.textContent = ''; // Clear any whitespace
                } else {
                    this.artistElement.classList.remove('empty-field');
                    this.artistElement.removeAttribute('data-placeholder');
                }
                
                this.checkForChanges();
            });
            this.artistElement.addEventListener('input', () => {
                // Remove placeholder when user starts typing
                if (this.artistElement.classList.contains('empty-field')) {
                    this.artistElement.classList.remove('empty-field');
                    this.artistElement.removeAttribute('data-placeholder');
                }
                this.checkForChanges();
            });
            this.artistElement.addEventListener('keydown', (e) => {
                if (e.key === 'Tab' && !e.shiftKey) {
                    e.preventDefault();
                    this.moveToNextField(this.artistElement);
                }
            });
        }
        if (this.titleElement) {
            this.titleElement.addEventListener('click', (e) => {
                e.stopPropagation();
                this.enterEditMode(this.titleElement);
            });
            this.titleElement.addEventListener('blur', (e) => {
                // Don't blur if we're moving to next field with Tab
                if (e.relatedTarget && e.relatedTarget.hasAttribute('contenteditable') && e.relatedTarget.getAttribute('contenteditable') === 'true') {
                    return;
                }
                
                this.titleElement.setAttribute('contenteditable', 'false');
                this.titleElement.classList.remove('editing');
                
                // Update placeholder state
                const titleText = this.titleElement.textContent || '';
                if (!titleText.trim()) {
                    this.titleElement.classList.add('empty-field');
                    this.titleElement.dataset.placeholder = 'Songtitel';
                    this.titleElement.textContent = ''; // Clear any whitespace
                } else {
                    this.titleElement.classList.remove('empty-field');
                    this.titleElement.removeAttribute('data-placeholder');
                }
                
                this.checkForChanges();
                // Remove chord button if exists (shouldn't be there for title, but just in case)
                const chordBtn = this.titleElement.parentElement?.querySelector('.chord-modal-btn-detail');
                if (chordBtn) {
                    chordBtn.remove();
                }
            });
            this.titleElement.addEventListener('input', () => {
                // Remove placeholder when user starts typing
                if (this.titleElement.classList.contains('empty-field')) {
                    this.titleElement.classList.remove('empty-field');
                    this.titleElement.removeAttribute('data-placeholder');
                }
                this.checkForChanges();
            });
            this.titleElement.addEventListener('keydown', (e) => {
                if (e.key === 'Tab' && !e.shiftKey) {
                    e.preventDefault();
                    this.moveToNextField(this.titleElement);
                }
            });
        }
        
        // Setup section fields
        Object.values(this.sections).forEach(section => {
            if (section.content) {
                section.content.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.enterEditMode(section.content);
                });
                section.content.addEventListener('blur', (e) => {
                    // Don't blur if we're moving to next field with Tab
                    if (e.relatedTarget && e.relatedTarget.hasAttribute('contenteditable') && e.relatedTarget.getAttribute('contenteditable') === 'true') {
                        return;
                    }
                    
                    // Use setTimeout to allow click event on button to fire first
                    setTimeout(() => {
                        // Check if button still exists and if we're still in edit mode
                        const chordBtn = section.section?.querySelector('.chord-modal-btn-detail');
                        const isStillEditing = section.content.getAttribute('contenteditable') === 'true';
                        
                        // Only exit edit mode if we're not clicking on the button
                        // Check if the active element is the button
                        const activeElement = document.activeElement;
                        if (!chordBtn || (activeElement !== chordBtn && !chordBtn.contains(activeElement))) {
                            section.content.setAttribute('contenteditable', 'false');
                            section.content.classList.remove('editing');
                            this.checkForChanges();
                            // Remove chord button
                            if (chordBtn) {
                                chordBtn.remove();
                            }
                        }
                    }, 100);
                });
                section.content.addEventListener('input', () => this.checkForChanges());
                section.content.addEventListener('keydown', (e) => {
                    if (e.key === 'Tab' && !e.shiftKey) {
                        e.preventDefault();
                        this.moveToNextField(section.content);
                    }
                });
            }
        });
    }
    
    moveToNextField(currentElement) {
        // Define field order: artist -> title -> verse -> chorus -> preChorus -> bridge
        const fieldOrder = ['artist', 'title', 'verse', 'chorus', 'preChorus', 'bridge'];
        const currentField = currentElement.dataset.field;
        const currentIndex = fieldOrder.indexOf(currentField);
        
        if (currentIndex === -1 || currentIndex >= fieldOrder.length - 1) {
            // Last field or unknown field - just exit edit mode
            currentElement.setAttribute('contenteditable', 'false');
            currentElement.classList.remove('editing');
            return;
        }
        
        // Save current field content
        const currentValue = currentElement.textContent.trim();
        currentElement.setAttribute('contenteditable', 'false');
        currentElement.classList.remove('editing');
        
        // Update placeholder for current field if empty
        if (!currentValue && (currentField === 'artist' || currentField === 'title')) {
            if (currentField === 'artist') {
                currentElement.classList.add('empty-field');
                currentElement.dataset.placeholder = 'Artiest';
                currentElement.textContent = '';
            } else if (currentField === 'title') {
                currentElement.classList.add('empty-field');
                currentElement.dataset.placeholder = 'Songtitel';
                currentElement.textContent = '';
            }
        }
        
        // Check for changes on current field
        this.checkForChanges();
        
        // Find next field
        const nextField = fieldOrder[currentIndex + 1];
        let nextElement = null;
        
        if (nextField === 'artist') {
            nextElement = this.artistElement;
        } else if (nextField === 'title') {
            nextElement = this.titleElement;
        } else {
            // Section field
            const section = this.sections[nextField];
            nextElement = section?.content;
        }
        
        if (nextElement) {
            // Small delay to ensure previous field is saved
            setTimeout(() => {
                this.enterEditMode(nextElement);
            }, 50);
        }
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
        
        // Remove placeholder when entering edit mode
        if (element.classList.contains('empty-field')) {
            element.classList.remove('empty-field');
            element.removeAttribute('data-placeholder');
            // Clear text content so placeholder doesn't interfere
            if (!element.textContent.trim()) {
                element.textContent = '';
            }
        }
        
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
        console.log('addChordButton called for field:', fieldName);
        // Remove existing button if any
        const section = element.closest('.song-chord-section');
        console.log('Section found:', !!section);
        if (section) {
            const existingBtn = section.querySelector('.chord-modal-btn-detail');
            if (existingBtn) {
                console.log('Removing existing button');
                existingBtn.remove();
            }
        }
        
        // Create chord button
        const chordBtn = document.createElement('button');
        chordBtn.type = 'button';
        chordBtn.className = 'chord-modal-btn-detail';
        chordBtn.innerHTML = '🎵';
        chordBtn.title = 'Akkoorden toevoegen';
        chordBtn.style.cursor = 'pointer';
        chordBtn.style.pointerEvents = 'auto';
        chordBtn.addEventListener('mousedown', (e) => {
            // Use mousedown instead of click, and prevent default to avoid blur
            e.stopPropagation();
            e.preventDefault();
        });
        
        chordBtn.addEventListener('click', (e) => {
            console.log('Chord button clicked, fieldName:', fieldName);
            e.stopPropagation();
            e.preventDefault();
            // Prevent blur by keeping focus
            if (element.getAttribute('contenteditable') !== 'true') {
                element.setAttribute('contenteditable', 'true');
                element.classList.add('editing');
            }
            // Use setTimeout to ensure click completes before any blur
            setTimeout(() => {
                if (this.chordModal) {
                    console.log('ChordModal exists, calling show()');
                    this.chordModal.show(element, fieldName, () => {
                    // Callback when chords are added - check for changes
                    this.checkForChanges();
                });
                } else {
                    console.error('ChordModal is null!');
                }
            }, 0);
        });
        
        // Insert button in the section header next to title
        if (section) {
            const sectionHeader = section.querySelector('.chord-section-title');
            console.log('Section header found:', !!sectionHeader);
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
                console.log('Button appended to section header');
                console.log('Button in DOM:', document.body.contains(chordBtn));
            } else {
                console.error('Section header not found!');
            }
        } else {
            console.error('Section not found!');
        }
    }
    
    checkForChanges() {
        if (!this.currentSongId) return;
        
        const song = this.songManager.getSongById(this.currentSongId);
        if (!song) return;
        
        // Ensure originalSongData is set (should be set in show(), but fallback for safety)
        if (!this.originalSongData) {
            this.originalSongData = {
                artist: song.artist || '',
                title: song.title || '',
                verse: song.verse || '',
                preChorus: song.preChorus || '',
                chorus: song.chorus || '',
                bridge: song.bridge || ''
            };
        }
        
        // Check current values - use textContent directly (not trimmed) to detect all changes including spaces
        const currentData = {
            artist: this.artistElement ? this.artistElement.textContent : '',
            title: this.titleElement ? this.titleElement.textContent : '',
            verse: this.sections.verse?.content ? this.sections.verse.content.textContent : '',
            preChorus: this.sections.preChorus?.content ? this.sections.preChorus.content.textContent : '',
            chorus: this.sections.chorus?.content ? this.sections.chorus.content.textContent : '',
            bridge: this.sections.bridge?.content ? this.sections.bridge.content.textContent : ''
        };
        
        // Compare with original - normalize whitespace for comparison (trim each value)
        // This way we detect any change, including spaces, but ignore leading/trailing whitespace differences
        const normalizeData = (data) => ({
            artist: (data.artist || '').trim(),
            title: (data.title || '').trim(),
            verse: (data.verse || '').trim(),
            preChorus: (data.preChorus || '').trim(),
            chorus: (data.chorus || '').trim(),
            bridge: (data.bridge || '').trim()
        });
        
        const normalizedCurrent = normalizeData(currentData);
        const normalizedOriginal = normalizeData(this.originalSongData);
        
        // Compare normalized data
        this.hasUnsavedChanges = JSON.stringify(normalizedCurrent) !== JSON.stringify(normalizedOriginal);
        
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
        
        // Update originalSongData to current saved values so they become the new baseline
        const savedSong = this.songManager.getSongById(this.currentSongId);
        if (savedSong) {
            this.originalSongData = {
                artist: savedSong.artist || '',
                title: savedSong.title || '',
                verse: savedSong.verse || '',
                preChorus: savedSong.preChorus || '',
                chorus: savedSong.chorus || '',
                bridge: savedSong.bridge || ''
            };
        } else {
            // Fallback: use the updates we just saved
            this.originalSongData = {
                artist: updates.artist !== undefined ? updates.artist : (this.originalSongData?.artist || ''),
                title: updates.title !== undefined ? updates.title : (this.originalSongData?.title || ''),
                verse: updates.verse !== undefined ? updates.verse : (this.originalSongData?.verse || ''),
                preChorus: updates.preChorus !== undefined ? updates.preChorus : (this.originalSongData?.preChorus || ''),
                chorus: updates.chorus !== undefined ? updates.chorus : (this.originalSongData?.chorus || ''),
                bridge: updates.bridge !== undefined ? updates.bridge : (this.originalSongData?.bridge || '')
            };
        }
        
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

    show(song, autoEditArtist = false) {
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
        
        // Set originalSongData immediately when showing a song, before any user interaction
        this.originalSongData = {
            artist: song.artist || '',
            title: song.title || '',
            verse: song.verse || '',
            preChorus: song.preChorus || '',
            chorus: song.chorus || '',
            bridge: song.bridge || ''
        };

        // Update artist and title
        if (this.artistElement) {
            const artistText = song.artist || '';
            this.artistElement.textContent = artistText;
            this.artistElement.setAttribute('contenteditable', 'false');
            this.artistElement.classList.remove('editing');
            
            // Add placeholder styling if empty
            if (!artistText.trim()) {
                this.artistElement.classList.add('empty-field');
                this.artistElement.dataset.placeholder = 'Artiest';
            } else {
                this.artistElement.classList.remove('empty-field');
                this.artistElement.removeAttribute('data-placeholder');
            }
        }
        if (this.titleElement) {
            const titleText = song.title || '';
            this.titleElement.textContent = titleText;
            this.titleElement.setAttribute('contenteditable', 'false');
            this.titleElement.classList.remove('editing');
            
            // Add placeholder styling if empty
            if (!titleText.trim()) {
                this.titleElement.classList.add('empty-field');
                this.titleElement.dataset.placeholder = 'Songtitel';
            } else {
                this.titleElement.classList.remove('empty-field');
                this.titleElement.removeAttribute('data-placeholder');
            }
        }

        // Update favorite button
        if (this.favoriteBtn) {
            this.updateFavoriteButton(song.favorite || false);
        }
        
        // Update YouTube button
        if (this.youtubeBtn) {
            this.updateYouTubeButton(song.youtubeUrl || '');
        }
        
        // Update YouTube Play button visibility
        if (this.youtubePlayBtn) {
            this.updateYouTubePlayButton(song.youtubeUrl || '');
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

        // Chorus (always show)
        if (this.sections.chorus && this.sections.chorus.content) {
            this.sections.chorus.content.textContent = song.chorus || '';
            this.sections.chorus.content.setAttribute('contenteditable', 'false');
            this.sections.chorus.content.classList.remove('editing');
            if (this.sections.chorus.section) {
                this.sections.chorus.section.classList.remove('hidden');
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
        
        // Auto-focus and enter edit mode for artist field if requested (for new songs)
        if (autoEditArtist && this.artistElement) {
            setTimeout(() => {
                this.enterEditMode(this.artistElement);
            }, 100);
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

    openYouTubeUrlModal() {
        if (!this.youtubeUrlModal || !this.currentSongId) return;
        
        const song = this.songManager.getSongById(this.currentSongId);
        if (!song) return;
        
        // Set current URL in input
        if (this.youtubeUrlInput) {
            this.youtubeUrlInput.value = song.youtubeUrl || '';
        }
        
        // Show modal
        this.youtubeUrlModal.classList.remove('hidden');
        
        // Focus input
        setTimeout(() => {
            if (this.youtubeUrlInput) {
                this.youtubeUrlInput.focus();
                this.youtubeUrlInput.select();
            }
        }, 100);
    }

    closeYouTubeUrlModal() {
        if (this.youtubeUrlModal) {
            this.youtubeUrlModal.classList.add('hidden');
        }
        if (this.youtubeUrlInput) {
            this.youtubeUrlInput.value = '';
        }
    }

    saveYouTubeUrl() {
        if (!this.currentSongId) {
            return;
        }
        
        if (!this.youtubeUrlInput) {
            return;
        }
        
        const url = this.youtubeUrlInput.value.trim();
        
        // Update song
        this.songManager.updateSong(this.currentSongId, { youtubeUrl: url });
        
        // Update button state
        this.updateYouTubeButton(url);
        this.updateYouTubePlayButton(url);
        
        // Close modal first
        this.closeYouTubeUrlModal();
        
        // Notify parent to refresh table
        if (this.onUpdate && typeof this.onUpdate === 'function') {
            this.onUpdate();
        }
    }

    updateYouTubeButton(youtubeUrl) {
        if (!this.youtubeBtn) return;
        
        if (youtubeUrl && youtubeUrl.trim()) {
            this.youtubeBtn.classList.add('youtube-active');
            this.youtubeBtn.title = 'YouTube URL bewerken (ingesteld)';
        } else {
            this.youtubeBtn.classList.remove('youtube-active');
            this.youtubeBtn.title = 'YouTube URL bewerken';
        }
    }

    updateYouTubePlayButton(youtubeUrl) {
        if (!this.youtubePlayBtn) return;
        
        if (youtubeUrl && youtubeUrl.trim()) {
            this.youtubePlayBtn.classList.remove('hidden');
        } else {
            this.youtubePlayBtn.classList.add('hidden');
        }
    }

    discardChanges() {
        if (!this.currentSongId || !this.originalSongData) return;
        
        // Reload original song data
        const song = this.songManager.getSongById(this.currentSongId);
        if (!song) return;
        
        // Restore original values
        if (this.artistElement) {
            const artistText = this.originalSongData.artist || '';
            this.artistElement.textContent = artistText;
            if (!artistText.trim()) {
                this.artistElement.classList.add('empty-field');
                this.artistElement.dataset.placeholder = 'Artiest';
            } else {
                this.artistElement.classList.remove('empty-field');
                this.artistElement.removeAttribute('data-placeholder');
            }
        }
        if (this.titleElement) {
            const titleText = this.originalSongData.title || '';
            this.titleElement.textContent = titleText;
            if (!titleText.trim()) {
                this.titleElement.classList.add('empty-field');
                this.titleElement.dataset.placeholder = 'Songtitel';
            } else {
                this.titleElement.classList.remove('empty-field');
                this.titleElement.removeAttribute('data-placeholder');
            }
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
        
        // Exit edit mode and remove chord buttons when hiding
        document.querySelectorAll('.editable-field[contenteditable="true"]').forEach(el => {
            el.setAttribute('contenteditable', 'false');
            el.classList.remove('editing');
            const section = el.closest('.song-chord-section');
            if (section) {
                const chordBtn = section.querySelector('.chord-modal-btn-detail');
                if (chordBtn) {
                    chordBtn.remove();
                }
            }
        });
    }
}

