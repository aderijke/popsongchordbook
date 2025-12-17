// ChordDetectorOverlay - UI component for chord detection display
class ChordDetectorOverlay {
    constructor() {
        this.overlay = document.getElementById('chordDetectorOverlay');
        this.toggleButton = document.getElementById('chordDetectorToggle');
        this.chordDisplay = document.getElementById('detectedChord');
        this.statusDisplay = document.getElementById('chordDetectorStatus');
        this.minimizeButton = document.getElementById('chordDetectorMinimize');
        this.audioLevelIndicator = document.getElementById('audioLevelIndicator');
        this.microphoneSelect = document.getElementById('microphoneSelect');
        this.header = this.overlay ? this.overlay.querySelector('.chord-detector-header') : null;
        
        this.chordDetector = new ChordDetector();
        this.isMinimized = false;
        this.isActive = false;
        
        // Dragging state
        this.isDragging = false;
        this.dragOffset = { x: 0, y: 0 };
        
        // Ensure overlay is not minimized by default
        if (this.overlay) {
            this.overlay.classList.remove('minimized');
            this.isMinimized = false;
            // Force body to be visible
            const body = this.overlay.querySelector('.chord-detector-body');
            if (body) {
                body.style.display = 'flex';
                body.style.visibility = 'visible';
                body.style.opacity = '1';
            }
            // Update button to show minimize icon (not maximize)
            if (this.minimizeButton) {
                this.minimizeButton.textContent = '🔻';
                this.minimizeButton.title = 'Minimaliseer';
            }
            // Load saved position
            this.loadPosition();
        }
        
        this.setupEventListeners();
        this.setupChordDetector();
        this.setupDragging();
        this.setupMicrophoneSelection();
    }
    
    setupEventListeners() {
        if (this.toggleButton) {
            this.toggleButton.addEventListener('click', () => this.toggleListening());
        }
        
        if (this.minimizeButton) {
            this.minimizeButton.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent dragging when clicking minimize
                this.toggleMinimize();
            });
        }
    }
    
    setupDragging() {
        if (!this.overlay || !this.header) return;
        
        // Make header draggable
        this.header.style.cursor = 'move';
        this.header.setAttribute('draggable', 'false'); // Prevent default drag
        
        // Mouse events
        this.header.addEventListener('mousedown', (e) => {
            if (e.target === this.minimizeButton || this.minimizeButton?.contains(e.target)) {
                return; // Don't drag when clicking minimize button
            }
            this.startDrag(e);
        });
        
        document.addEventListener('mousemove', (e) => {
            if (this.isDragging) {
                this.onDrag(e);
            }
        });
        
        document.addEventListener('mouseup', () => {
            if (this.isDragging) {
                this.endDrag();
            }
        });
        
        // Touch events for mobile
        this.header.addEventListener('touchstart', (e) => {
            if (e.target === this.minimizeButton || this.minimizeButton?.contains(e.target)) {
                return;
            }
            this.startDrag(e.touches[0]);
            e.preventDefault();
        });
        
        document.addEventListener('touchmove', (e) => {
            if (this.isDragging) {
                this.onDrag(e.touches[0]);
                e.preventDefault();
            }
        });
        
        document.addEventListener('touchend', () => {
            if (this.isDragging) {
                this.endDrag();
            }
        });
    }
    
    startDrag(e) {
        this.isDragging = true;
        const rect = this.overlay.getBoundingClientRect();
        this.dragOffset.x = e.clientX - rect.left;
        this.dragOffset.y = e.clientY - rect.top;
        this.overlay.style.transition = 'none'; // Disable transition during drag
        document.body.style.userSelect = 'none'; // Prevent text selection
    }
    
    onDrag(e) {
        if (!this.isDragging) return;
        
        const x = e.clientX - this.dragOffset.x;
        const y = e.clientY - this.dragOffset.y;
        
        // Keep overlay within viewport
        const maxX = window.innerWidth - this.overlay.offsetWidth;
        const maxY = window.innerHeight - this.overlay.offsetHeight;
        
        const constrainedX = Math.max(0, Math.min(x, maxX));
        const constrainedY = Math.max(0, Math.min(y, maxY));
        
        this.overlay.style.left = constrainedX + 'px';
        this.overlay.style.top = constrainedY + 'px';
        this.overlay.style.right = 'auto';
    }
    
    endDrag() {
        if (!this.isDragging) return;
        this.isDragging = false;
        this.overlay.style.transition = ''; // Re-enable transition
        document.body.style.userSelect = ''; // Re-enable text selection
        this.savePosition();
    }
    
    savePosition() {
        if (!this.overlay) return;
        const rect = this.overlay.getBoundingClientRect();
        localStorage.setItem('chordDetectorPosition', JSON.stringify({
            x: rect.left,
            y: rect.top
        }));
    }
    
    loadPosition() {
        if (!this.overlay) return;
        try {
            const saved = localStorage.getItem('chordDetectorPosition');
            if (saved) {
                const position = JSON.parse(saved);
                this.overlay.style.left = position.x + 'px';
                this.overlay.style.top = position.y + 'px';
                this.overlay.style.right = 'auto';
            }
        } catch (e) {
            console.warn('Failed to load chord detector position:', e);
        }
    }
    
    setupChordDetector() {
        // Set up chord detection callbacks
        this.chordDetector.setOnChordDetected((chord, confidence) => {
            this.updateChordDisplay(chord, confidence);
        });
        
        this.chordDetector.setOnStatusChange((status, message) => {
            this.updateStatus(status, message);
        });
        
        // Set up audio level callback
        this.chordDetector.setOnAudioLevel((level) => {
            this.updateAudioLevel(level);
        });
    }
    
    async toggleListening() {
        if (this.isActive) {
            this.stopListening();
        } else {
            await this.startListening();
        }
    }
    
    async startListening() {
        try {
            // Ensure overlay is maximized when starting detection
            if (this.isMinimized) {
                this.toggleMinimize();
            }
            
            const selectedDeviceId = this.microphoneSelect?.value || null;
            await this.chordDetector.startListening(selectedDeviceId);
            this.isActive = true;
            this.updateToggleButton(true);
        } catch (error) {
            this.handleError(error);
        }
    }
    
    stopListening() {
        this.chordDetector.stopListening();
        this.isActive = false;
        this.updateToggleButton(false);
        this.updateChordDisplay(null, 0);
        this.updateAudioLevel(0);
    }
    
    updateChordDisplay(chord, confidence) {
        if (this.chordDisplay) {
            if (chord) {
                this.chordDisplay.textContent = chord;
                this.chordDisplay.classList.remove('no-chord');
                this.chordDisplay.classList.add('detected-chord');
                
                // Add confidence indicator (optional visual feedback)
                if (confidence) {
                    const opacity = Math.min(1, 0.6 + (confidence * 0.4));
                    this.chordDisplay.style.opacity = opacity;
                }
            } else {
                this.chordDisplay.textContent = '--';
                this.chordDisplay.classList.remove('detected-chord');
                this.chordDisplay.classList.add('no-chord');
                this.chordDisplay.style.opacity = '0.5';
            }
        }
    }
    
    updateStatus(status, message) {
        if (!this.statusDisplay) return;
        
        let statusText = 'Niet actief';
        let statusClass = 'status-inactive';
        
        switch (status) {
            case 'listening':
                statusText = '🎤 Microfoon actief - speel een akkoord';
                statusClass = 'status-listening';
                break;
            case 'stopped':
                statusText = 'Gestopt';
                statusClass = 'status-inactive';
                break;
            case 'error':
                statusText = message || 'Fout opgetreden';
                statusClass = 'status-error';
                break;
            default:
                statusText = 'Niet actief';
                statusClass = 'status-inactive';
        }
        
        this.statusDisplay.textContent = statusText;
        this.statusDisplay.className = `chord-detector-status ${statusClass}`;
    }
    
    updateToggleButton(isActive) {
        if (this.toggleButton) {
            if (isActive) {
                this.toggleButton.classList.add('active');
                this.toggleButton.textContent = '⏸';
                this.toggleButton.title = 'Stop detectie';
            } else {
                this.toggleButton.classList.remove('active');
                this.toggleButton.textContent = '🎤';
                this.toggleButton.title = 'Start detectie';
            }
        }
    }
    
    handleError(error) {
        let errorMessage = 'Fout bij starten van microfoon';
        
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
            errorMessage = 'Microfoon toegang geweigerd. Controleer browser instellingen.';
        } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
            errorMessage = 'Geen microfoon gevonden. Controleer uw apparaat.';
        } else if (error.name === 'NotSupportedError') {
            errorMessage = 'Web Audio API niet ondersteund in deze browser.';
        } else if (error.message) {
            errorMessage = error.message;
        }
        
        this.updateStatus('error', errorMessage);
        this.isActive = false;
        this.updateToggleButton(false);
        
        // Show alert for critical errors
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
            alert(errorMessage);
        }
    }
    
    toggleMinimize() {
        if (!this.overlay) return;
        
        this.isMinimized = !this.isMinimized;
        
        if (this.isMinimized) {
            this.overlay.classList.add('minimized');
            if (this.minimizeButton) {
                this.minimizeButton.textContent = '🔺';
                this.minimizeButton.title = 'Maximaliseer';
            }
        } else {
            this.overlay.classList.remove('minimized');
            if (this.minimizeButton) {
                this.minimizeButton.textContent = '🔻';
                this.minimizeButton.title = 'Minimaliseer';
            }
            // Force reflow to ensure smooth animation
            const body = this.overlay.querySelector('.chord-detector-body');
            if (body) {
                body.offsetHeight; // Trigger reflow
            }
        }
    }
    
    // Public method to ensure overlay is visible
    ensureVisible() {
        if (this.overlay && this.isMinimized) {
            this.toggleMinimize();
        }
    }
    
    updateAudioLevel(level) {
        if (!this.audioLevelIndicator) {
            // Fallback: try to find the element again if it wasn't found initially
            this.audioLevelIndicator = document.getElementById('audioLevelIndicator');
        }
        
        if (this.audioLevelIndicator) {
            const percentage = Math.round(level * 100);
            this.audioLevelIndicator.style.width = `${percentage}%`;
            
            // Change color based on level
            if (level > 0.3) {
                this.audioLevelIndicator.classList.remove('level-low', 'level-medium');
                this.audioLevelIndicator.classList.add('level-high');
            } else if (level > 0.1) {
                this.audioLevelIndicator.classList.remove('level-low', 'level-high');
                this.audioLevelIndicator.classList.add('level-medium');
            } else {
                this.audioLevelIndicator.classList.remove('level-medium', 'level-high');
                this.audioLevelIndicator.classList.add('level-low');
            }
        } else {
            console.warn('Audio level indicator element not found');
        }
    }
    
    async setupMicrophoneSelection() {
        if (!this.microphoneSelect) return;
        
        // Populate microphone list
        await this.updateMicrophoneList();
        
        // Reload list when devices change
        navigator.mediaDevices.addEventListener('devicechange', () => {
            this.updateMicrophoneList();
        });
        
        // Stop listening if device changes while active
        this.microphoneSelect.addEventListener('change', () => {
            if (this.isActive) {
                this.stopListening();
                // Optionally restart with new device
                setTimeout(() => {
                    this.startListening();
                }, 100);
            }
        });
    }
    
    async updateMicrophoneList() {
        if (!this.microphoneSelect) return;
        
        const devices = await this.chordDetector.getAvailableDevices();
        const currentValue = this.microphoneSelect.value;
        
        this.microphoneSelect.innerHTML = '';
        
        if (devices.length === 0) {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'Geen microfoons gevonden';
            this.microphoneSelect.appendChild(option);
            return;
        }
        
        devices.forEach(device => {
            const option = document.createElement('option');
            option.value = device.deviceId;
            option.textContent = device.label || `Microfoon ${devices.indexOf(device) + 1}`;
            this.microphoneSelect.appendChild(option);
        });
        
        // Restore selection if still available
        if (currentValue) {
            const stillExists = Array.from(this.microphoneSelect.options).some(opt => opt.value === currentValue);
            if (stillExists) {
                this.microphoneSelect.value = currentValue;
            }
        }
    }
    
    // Public method to get current detected chord (if needed by other components)
    getCurrentChord() {
        return this.chordDetector.getDetectedChord();
    }
}

