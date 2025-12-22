// PianoChordOverlay - Modal for displaying piano chord fingerings
class PianoChordOverlay {
    constructor() {
        this.overlay = null;
        this.isVisible = false;
        this.currentChords = [];
        this.sectionName = '';
        
        // Define chord fingerings (notes to highlight on piano)
        // Notes are in MIDI-like format: C4 = 60, C#4 = 61, etc.
        // We'll use octave 4 as base (middle C area)
        this.chordDefinitions = this.initializeChordDefinitions();
        
        this.createOverlay();
        this.setupEventListeners();
    }
    
    initializeChordDefinitions() {
        // Note names to semitone offset (C = 0, C# = 1, etc.)
        const noteToSemitone = {
            'C': 0, 'C#': 1, 'Db': 1,
            'D': 2, 'D#': 3, 'Eb': 3,
            'E': 4, 'Fb': 4,
            'F': 5, 'F#': 6, 'Gb': 6,
            'G': 7, 'G#': 8, 'Ab': 8,
            'A': 9, 'A#': 10, 'Bb': 10,
            'B': 11, 'Cb': 11
        };
        
        // Chord intervals from root
        const chordIntervals = {
            // Major
            '': [0, 4, 7],
            'maj': [0, 4, 7],
            'M': [0, 4, 7],
            // Minor
            'm': [0, 3, 7],
            'min': [0, 3, 7],
            '-': [0, 3, 7],
            // 7th chords
            '7': [0, 4, 7, 10],
            'maj7': [0, 4, 7, 11],
            'M7': [0, 4, 7, 11],
            'm7': [0, 3, 7, 10],
            'min7': [0, 3, 7, 10],
            'dim': [0, 3, 6],
            'dim7': [0, 3, 6, 9],
            'aug': [0, 4, 8],
            // Sus chords
            'sus2': [0, 2, 7],
            'sus4': [0, 5, 7],
            'sus': [0, 5, 7],
            '7sus4': [0, 5, 7, 10],
            // Add chords
            'add9': [0, 4, 7, 14],
            'add2': [0, 2, 4, 7],
            // 9th, 11th, 13th
            '9': [0, 4, 7, 10, 14],
            'maj9': [0, 4, 7, 11, 14],
            'm9': [0, 3, 7, 10, 14],
            '11': [0, 4, 7, 10, 14, 17],
            '13': [0, 4, 7, 10, 14, 21],
            // 6th chords
            '6': [0, 4, 7, 9],
            'm6': [0, 3, 7, 9],
            // Power chord
            '5': [0, 7],
        };
        
        return { noteToSemitone, chordIntervals };
    }
    
    parseChord(chordName) {
        if (!chordName || typeof chordName !== 'string') return null;
        
        const { noteToSemitone, chordIntervals } = this.chordDefinitions;
        
        // Clean up chord name
        chordName = chordName.trim();
        
        // Match root note (with optional sharp/flat)
        const rootMatch = chordName.match(/^([A-Ga-g])([#b]?)/);
        if (!rootMatch) return null;
        
        let rootNote = rootMatch[1].toUpperCase();
        const accidental = rootMatch[2];
        const rootKey = rootNote + accidental;
        
        const rootSemitone = noteToSemitone[rootKey];
        if (rootSemitone === undefined) return null;
        
        // Get the chord suffix (everything after the root note)
        let suffix = chordName.slice(rootMatch[0].length);
        
        // Handle slash chords (e.g., C/G) - we'll ignore the bass note for piano
        const slashIndex = suffix.indexOf('/');
        if (slashIndex !== -1) {
            suffix = suffix.slice(0, slashIndex);
        }
        
        // Check for inversion indicator at the end (custom notation)
        // "2" = 2nd inversion (3rd note is bass note)
        // "3" = 1st inversion (2nd note is bass note)
        // e.g., C2 = C chord with G as bass (2nd inversion), C3 = C chord with E as bass (1st inversion)
        let inversion = 0;
        const inversionMatch = suffix.match(/([23])$/);
        if (inversionMatch) {
            const invNum = parseInt(inversionMatch[1]);
            // Custom notation: "2" means 2nd inversion (3rd note as bass), "3" means 1st inversion (2nd note as bass)
            if (invNum === 2) {
                inversion = 2; // 2nd inversion: 3rd note becomes bass
            } else if (invNum === 3) {
                inversion = 1; // 1st inversion: 2nd note becomes bass
            }
            suffix = suffix.slice(0, -1); // Remove the inversion number from suffix
        }
        
        // Find matching interval pattern
        let intervals = chordIntervals[suffix];
        
        // If no exact match, try to find a partial match
        if (!intervals) {
            // Try common variations
            if (suffix.startsWith('m') && !suffix.startsWith('maj')) {
                // It's some kind of minor chord
                if (chordIntervals['m' + suffix.slice(1)]) {
                    intervals = chordIntervals['m' + suffix.slice(1)];
                } else {
                    intervals = chordIntervals['m']; // Default to minor triad
                }
            } else {
                intervals = chordIntervals['']; // Default to major triad
            }
        }
        
        // Calculate actual notes (semitones from C4)
        // C4 = 0, C#4 = 1, ... B4 = 11, C5 = 12, etc.
        let notes = intervals.map(interval => {
            let note = rootSemitone + interval;
            // Keep notes in a reasonable range (octave 4-5)
            while (note > 23) note -= 12; // Keep below C6
            return note;
        });
        
        // Apply inversion if specified
        // Inversion 1 (from "2"): move 1st note up an octave, 2nd note becomes bass
        // Inversion 2 (from "3"): move 1st and 2nd notes up an octave, 3rd note becomes bass
        let bassNoteSemitone = rootSemitone; // Default: root is bass
        if (inversion > 0 && inversion < notes.length) {
            // Get the bass note (the note that will be lowest after inversion)
            bassNoteSemitone = notes[inversion] % 12;
            
            // Rearrange notes for the inversion
            // Move the first 'inversion' notes up by an octave
            for (let i = 0; i < inversion; i++) {
                notes[i] = notes[i] + 12;
            }
            
            // Sort notes so bass is first (lowest)
            notes.sort((a, b) => a - b);
            
            // Ensure notes stay in reasonable range
            while (notes[notes.length - 1] > 23) {
                notes = notes.map(n => n - 12);
            }
            while (notes[0] < 0) {
                notes = notes.map(n => n + 12);
            }
        }
        
        // Build display name with inversion indicator
        let displayName = rootKey + suffix;
        if (inversion > 0) {
            // Show original notation number in display
            const originalNotation = inversion === 2 ? '2' : '3';
            displayName += ` (${inversion === 1 ? '1st' : '2nd'} inversion)`;
        }
        
        return {
            name: chordName,
            displayName: displayName,
            notes: notes,
            rootSemitone: rootSemitone,
            bassNoteSemitone: bassNoteSemitone,
            inversion: inversion
        };
    }
    
    extractChordsFromText(text) {
        if (!text) return [];
        
        // Common chord pattern: matches chords like C, Am, F#m7, Bb, Gsus4, etc.
        const chordPattern = /\b([A-Ga-g][#b]?(?:m|min|maj|dim|aug|sus|add)?[0-9]?(?:sus[24]?|add[29]|maj[79]?|min[79]?|dim[79]?|aug)?[0-9]?(?:\/[A-Ga-g][#b]?)?)\b/g;
        
        const matches = text.match(chordPattern) || [];
        
        // Remove duplicates while preserving order
        const seen = new Set();
        const uniqueChords = [];
        
        for (const chord of matches) {
            const normalized = chord.trim();
            if (!seen.has(normalized) && this.parseChord(normalized)) {
                seen.add(normalized);
                uniqueChords.push(normalized);
            }
        }
        
        return uniqueChords;
    }
    
    createOverlay() {
        // Create overlay container
        this.overlay = document.createElement('div');
        this.overlay.id = 'pianoChordOverlay';
        this.overlay.className = 'piano-chord-overlay hidden';
        
        this.overlay.innerHTML = `
            <div class="piano-chord-modal">
                <div class="piano-chord-header">
                    <h3 id="pianoChordTitle">Piano Chords</h3>
                    <button class="piano-chord-close" id="pianoChordClose">&times;</button>
                </div>
                <div class="piano-chord-body">
                    <div class="piano-chord-list" id="pianoChordList">
                        <!-- Chord cards will be inserted here -->
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(this.overlay);
    }
    
    setupEventListeners() {
        // Close button
        const closeBtn = this.overlay.querySelector('#pianoChordClose');
        closeBtn.addEventListener('click', () => this.hide());
        
        // Click outside to close
        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) {
                this.hide();
            }
        });
        
        // Escape key to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isVisible) {
                this.hide();
            }
        });
    }
    
    createPianoKeyboard(chord, highlightedNotes) {
        // Create a compact piano keyboard showing only chord notes + 2 white keys on each side
        const keyboard = document.createElement('div');
        keyboard.className = 'piano-keyboard';
        
        // Find the range of notes we need to display
        const minNote = Math.min(...highlightedNotes);
        const maxNote = Math.max(...highlightedNotes);
        
        // White keys are at semitone positions: 0(C), 2(D), 4(E), 5(F), 7(G), 9(A), 11(B)
        const whiteKeyPositions = [0, 2, 4, 5, 7, 9, 11];
        const whiteKeyNames = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
        
        // Find all white keys in a wider range (from minNote-12 to maxNote+12 to ensure we have enough)
        const allWhiteKeys = [];
        for (let note = minNote - 12; note <= maxNote + 12; note++) {
            const semitone = ((note % 12) + 12) % 12;
            if (whiteKeyPositions.includes(semitone)) {
                const nameIndex = whiteKeyPositions.indexOf(semitone);
                allWhiteKeys.push({
                    note: note,
                    name: whiteKeyNames[nameIndex],
                    semitone: semitone
                });
            }
        }
        
        // Find white keys that are closest to or contain our chord notes
        const chordWhiteKeyIndices = new Set();
        highlightedNotes.forEach(chordNote => {
            // Find the closest white key to this chord note
            let closestIndex = -1;
            let closestDistance = Infinity;
            
            for (let i = 0; i < allWhiteKeys.length; i++) {
                const distance = Math.abs(allWhiteKeys[i].note - chordNote);
                if (distance < closestDistance) {
                    closestDistance = distance;
                    closestIndex = i;
                }
            }
            
            if (closestIndex >= 0) {
                chordWhiteKeyIndices.add(closestIndex);
            }
        });
        
        // Convert to array and sort
        const chordIndices = Array.from(chordWhiteKeyIndices).sort((a, b) => a - b);
        
        if (chordIndices.length === 0) {
            // Fallback: use middle of range
            const midIndex = Math.floor(allWhiteKeys.length / 2);
            chordIndices.push(Math.max(0, midIndex - 1), midIndex, Math.min(allWhiteKeys.length - 1, midIndex + 1));
        }
        
        // Get the range: 2 white keys before first chord white key, 2 after last
        const firstChordIndex = Math.min(...chordIndices);
        const lastChordIndex = Math.max(...chordIndices);
        const startIndex = Math.max(0, firstChordIndex - 2);
        const endIndex = Math.min(allWhiteKeys.length - 1, lastChordIndex + 2);
        
        // Extract the white keys we need
        const whiteKeys = allWhiteKeys.slice(startIndex, endIndex + 1).map((wk, idx) => ({
            note: wk.note,
            name: wk.name,
            position: idx
        }));
        
        // Build black keys array for the range we need
        const blackKeys = [];
        const blackKeyPositions = [
            { semitone: 1, name: 'C#', afterWhiteIndex: 0 },
            { semitone: 3, name: 'D#', afterWhiteIndex: 1 },
            { semitone: 6, name: 'F#', afterWhiteIndex: 3 },
            { semitone: 8, name: 'G#', afterWhiteIndex: 4 },
            { semitone: 10, name: 'A#', afterWhiteIndex: 5 }
        ];
        
        // Find black keys in the range
        const minWhiteNote = whiteKeys[0].note;
        const maxWhiteNote = whiteKeys[whiteKeys.length - 1].note;
        
        for (let note = minWhiteNote; note <= maxWhiteNote; note++) {
            const semitone = ((note % 12) + 12) % 12;
            const blackKeyInfo = blackKeyPositions.find(bk => bk.semitone === semitone);
            if (blackKeyInfo) {
                // Find which white key this black key should be positioned after
                let whiteKeyIndex = -1;
                for (let i = 0; i < whiteKeys.length; i++) {
                    const wkSemitone = ((whiteKeys[i].note % 12) + 12) % 12;
                    if (wkSemitone < semitone && whiteKeys[i].note <= note) {
                        whiteKeyIndex = i;
                    }
                }
                // If not found, try matching by the standard pattern
                if (whiteKeyIndex === -1) {
                    const standardAfterIndex = blackKeyInfo.afterWhiteIndex;
                    // Find white key with matching pattern
                    for (let i = 0; i < whiteKeys.length; i++) {
                        const wkSemitone = ((whiteKeys[i].note % 12) + 12) % 12;
                        if (whiteKeyPositions.indexOf(wkSemitone) === standardAfterIndex) {
                            whiteKeyIndex = i;
                            break;
                        }
                    }
                }
                if (whiteKeyIndex >= 0) {
                    blackKeys.push({
                        note: note,
                        name: blackKeyInfo.name,
                        position: whiteKeyIndex
                    });
                }
            }
        }
        
        // Create white keys container
        const whiteKeysContainer = document.createElement('div');
        whiteKeysContainer.className = 'white-keys';
        
        whiteKeys.forEach((key, index) => {
            const keyEl = document.createElement('div');
            keyEl.className = 'piano-key white-key';
            keyEl.dataset.note = key.note;
            
            if (highlightedNotes.includes(key.note)) {
                keyEl.classList.add('highlighted');
                // Check if it's the root note (original chord root) - only root gets special color
                if (key.note % 12 === chord.rootSemitone) {
                    keyEl.classList.add('root');
                }
            }
            
            // Add note label for highlighted keys
            if (highlightedNotes.includes(key.note)) {
                const label = document.createElement('span');
                label.className = 'key-label';
                label.textContent = key.name;
                keyEl.appendChild(label);
            }
            
            whiteKeysContainer.appendChild(keyEl);
        });
        
        // Create black keys container
        const blackKeysContainer = document.createElement('div');
        blackKeysContainer.className = 'black-keys';
        
        const whiteKeyCount = whiteKeys.length;
        
        blackKeys.forEach((key) => {
            const keyEl = document.createElement('div');
            keyEl.className = 'piano-key black-key';
            keyEl.dataset.note = key.note;
            // Position black key relative to white keys (each white key takes 100/whiteKeyCount %)
            keyEl.style.left = `calc(${key.position * (100/whiteKeyCount)}% + ${(100/whiteKeyCount) * 0.65}%)`;
            
            if (highlightedNotes.includes(key.note)) {
                keyEl.classList.add('highlighted');
                // Check if it's the root note - only root gets special color
                if (key.note % 12 === chord.rootSemitone) {
                    keyEl.classList.add('root');
                }
                
                // Add note label for highlighted keys
                const label = document.createElement('span');
                label.className = 'key-label';
                label.textContent = key.name;
                keyEl.appendChild(label);
            }
            
            blackKeysContainer.appendChild(keyEl);
        });
        
        keyboard.appendChild(whiteKeysContainer);
        keyboard.appendChild(blackKeysContainer);
        
        return keyboard;
    }
    
    createChordCard(chordName) {
        const chord = this.parseChord(chordName);
        if (!chord) return null;
        
        const card = document.createElement('div');
        card.className = 'piano-chord-card';
        
        // Chord name header
        const header = document.createElement('div');
        header.className = 'chord-card-header';
        header.innerHTML = `<span class="chord-name">${chord.displayName}</span>`;
        
        // Piano keyboard
        const keyboard = this.createPianoKeyboard(chord, chord.notes);
        
        // Notes info
        const notesInfo = document.createElement('div');
        notesInfo.className = 'chord-notes-info';
        const noteNames = this.getNotesAsNames(chord.notes);
        
        notesInfo.innerHTML = `<span class="notes-label">Keys:</span> <span class="notes-list">${noteNames.join(' - ')}</span>`;
        
        card.appendChild(header);
        card.appendChild(keyboard);
        card.appendChild(notesInfo);
        
        return card;
    }
    
    getNotesAsNames(notes) {
        const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        return notes.map(note => {
            const octave = Math.floor(note / 12) + 4;
            const noteName = noteNames[note % 12];
            return noteName + octave;
        });
    }
    
    show(sectionName, chordText) {
        this.sectionName = sectionName;
        
        // Extract chords from the text
        const chords = this.extractChordsFromText(chordText);
        this.currentChords = chords;
        
        // Update title
        const title = this.overlay.querySelector('#pianoChordTitle');
        title.textContent = `Piano Chords - ${sectionName}`;
        
        // Clear and populate chord list
        const chordList = this.overlay.querySelector('#pianoChordList');
        chordList.innerHTML = '';
        
        if (chords.length === 0) {
            chordList.innerHTML = `
                <div class="no-chords-message">
                    <p>No chords found in this section.</p>
                    <p class="hint">Make sure the chords are in the correct format (e.g., C, Am, F#m7, Bb)</p>
                </div>
            `;
        } else {
            chords.forEach(chordName => {
                const card = this.createChordCard(chordName);
                if (card) {
                    chordList.appendChild(card);
                }
            });
        }
        
        // Show overlay
        this.overlay.classList.remove('hidden');
        this.isVisible = true;
        
        // Prevent body scroll
        document.body.style.overflow = 'hidden';
    }
    
    hide() {
        this.overlay.classList.add('hidden');
        this.isVisible = false;
        
        // Restore body scroll
        document.body.style.overflow = '';
    }
}

