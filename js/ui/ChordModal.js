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
            
            // Close modal after adding chords
            this.hide();
        }
    }
}

