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
        // Check if this is a chord field first
        const chordFields = ['verse', 'chorus', 'preChorus', 'bridge'];
        if (!chordFields.includes(field)) {
            // Don't show modal for non-chord fields
            return;
        }
        
        if (!this.modal) {
            console.error('ChordModal: modal element not found');
            return;
        }
        
        this.currentInput = inputElement;
        this.currentField = field;
        this.modal.classList.remove('hidden');
        
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
        // Check if we should insert directly into contenteditable element
        const isContentEditable = this.currentInput && 
            this.currentInput.hasAttribute && 
            this.currentInput.hasAttribute('contenteditable') && 
            (this.currentInput.getAttribute('contenteditable') === 'true' || this.currentInput.contentEditable === 'true');
        
        if (isContentEditable && this.currentInput) {
            // Insert chord directly into contenteditable at cursor position
            const selection = window.getSelection();
            let range = selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
            
            // Check if range is inside the currentInput element
            const rangeInElement = range && (
                range.commonAncestorContainer === this.currentInput || 
                this.currentInput.contains(range.commonAncestorContainer)
            );
            
            if (!range || !rangeInElement) {
                // No valid selection in this element, insert at end
                range = document.createRange();
                range.selectNodeContents(this.currentInput);
                range.collapse(false);
            }
            
            // Insert chord with space before if needed
            const textBefore = range.startContainer.textContent ? range.startContainer.textContent.substring(0, range.startOffset) : '';
            const needsSpace = textBefore.length > 0 && !textBefore.endsWith(' ') && !textBefore.endsWith('\n');
            const textToInsert = (needsSpace ? ' ' : '') + chord;
            
            const textNode = document.createTextNode(textToInsert);
            range.insertNode(textNode);
            
            // Move cursor after inserted text
            range.setStartAfter(textNode);
            range.collapse(true);
            selection.removeAllRanges();
            selection.addRange(range);
            
            // Keep focus on contenteditable element
            this.currentInput.focus();
        } else {
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
    }

    addCustomChords() {
        if (!this.currentInput) return;
        
        const customChords = this.customInput.value.trim();
        if (customChords) {
            // Check if this is a contenteditable element or an input element
            const isContentEditable = this.currentInput.hasAttribute && 
                this.currentInput.hasAttribute('contenteditable') &&
                (this.currentInput.getAttribute('contenteditable') === 'true' || this.currentInput.contentEditable === 'true');
            
            if (isContentEditable) {
                // Handle contenteditable element
                const selection = window.getSelection();
                let range = selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
                
                // Check if range is inside the currentInput element
                const rangeInElement = range && (
                    range.commonAncestorContainer === this.currentInput || 
                    this.currentInput.contains(range.commonAncestorContainer)
                );
                
                if (!range || !rangeInElement) {
                    // No valid selection, insert at end
                    range = document.createRange();
                    range.selectNodeContents(this.currentInput);
                    range.collapse(false);
                }
                
                // Insert chords at cursor position
                const textNode = document.createTextNode(customChords);
                range.insertNode(textNode);
                
                // Move cursor after inserted text
                range.setStartAfter(textNode);
                range.collapse(true);
                selection.removeAllRanges();
                selection.addRange(range);
                
                // Focus the contenteditable element
                this.currentInput.focus();
            } else {
                // Handle regular input element
                const currentValue = this.currentInput.value.trim();
                // Add new chords after existing chords with a space
                const separator = currentValue ? ' ' : '';
                this.currentInput.value = currentValue + separator + customChords;
                
                // Keep table input focused
                setTimeout(() => {
                    this.currentInput.focus();
                    // Move cursor to end
                    const len = this.currentInput.value.length;
                    this.currentInput.setSelectionRange(len, len);
                }, 10);
            }
            
            // Clear custom input
            this.customInput.value = '';
            
            // Close modal after adding chords
            this.hide();
        }
    }
}

