// SongDetailModal - Modal voor song details weergave
class SongDetailModal {
    constructor(songManager, onNavigate) {
        this.songManager = songManager;
        this.onNavigate = onNavigate;
        this.currentSongId = null;
        this.allSongs = [];
        this.modal = document.getElementById('songDetailModal');
        this.closeBtn = document.getElementById('songDetailModalClose');
        this.prevBtn = document.getElementById('songDetailPrev');
        this.nextBtn = document.getElementById('songDetailNext');
        this.artistElement = document.getElementById('songDetailArtist');
        this.titleElement = document.getElementById('songDetailTitle');
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
        this.setupEventListeners();
    }

    setSongs(songs) {
        this.allSongs = songs;
    }

    setupEventListeners() {
        this.closeBtn.addEventListener('click', () => this.hide());
        this.prevBtn.addEventListener('click', () => this.navigatePrevious());
        this.nextBtn.addEventListener('click', () => this.navigateNext());
        
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.hide();
            }
        });
        
        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (!this.modal.classList.contains('hidden')) {
                if (e.key === 'Escape') {
                    this.hide();
                } else if (e.key === 'ArrowLeft') {
                    this.navigatePrevious();
                } else if (e.key === 'ArrowRight') {
                    this.navigateNext();
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

        this.currentSongId = song.id;

        // Update artist and title
        if (this.artistElement) {
            this.artistElement.textContent = song.artist || 'Onbekende artiest';
        }
        if (this.titleElement) {
            this.titleElement.textContent = song.title || 'Geen titel';
        }

        // Update navigation buttons
        this.updateNavigationButtons();

        // Verse (only show if has content)
        if (song.verse && song.verse.trim()) {
            if (this.sections.verse && this.sections.verse.content) {
                this.sections.verse.content.textContent = song.verse;
                if (this.sections.verse.section) {
                    this.sections.verse.section.classList.remove('hidden');
                }
            }
        } else {
            if (this.sections.verse && this.sections.verse.section) {
                this.sections.verse.section.classList.add('hidden');
            }
        }

        // Pre-Chorus (only show if has content)
        if (song.preChorus && song.preChorus.trim()) {
            if (this.sections.preChorus && this.sections.preChorus.content) {
                this.sections.preChorus.content.textContent = song.preChorus;
                if (this.sections.preChorus.section) {
                    this.sections.preChorus.section.classList.remove('hidden');
                }
            }
        } else {
            if (this.sections.preChorus && this.sections.preChorus.section) {
                this.sections.preChorus.section.classList.add('hidden');
            }
        }

        // Chorus (only show if has content)
        if (song.chorus && song.chorus.trim()) {
            if (this.sections.chorus && this.sections.chorus.content) {
                this.sections.chorus.content.textContent = song.chorus;
                if (this.sections.chorus.section) {
                    this.sections.chorus.section.classList.remove('hidden');
                }
            }
        } else {
            if (this.sections.chorus && this.sections.chorus.section) {
                this.sections.chorus.section.classList.add('hidden');
            }
        }

        // Bridge (only show if has content)
        if (song.bridge && song.bridge.trim()) {
            if (this.sections.bridge && this.sections.bridge.content) {
                this.sections.bridge.content.textContent = song.bridge;
                if (this.sections.bridge.section) {
                    this.sections.bridge.section.classList.remove('hidden');
                }
            }
        } else {
            if (this.sections.bridge && this.sections.bridge.section) {
                this.sections.bridge.section.classList.add('hidden');
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

    hide() {
        this.modal.classList.add('hidden');
        this.currentSongId = null;
    }
}

