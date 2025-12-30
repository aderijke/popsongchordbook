// PianoAudioPlayer - Synthesizes realistic piano sounds using Web Audio API
class PianoAudioPlayer {
    constructor() {
        this.audioContext = null;
        this.masterGain = null;
        this.isInitialized = false;
        this.activeNotes = new Map(); // Track active notes for cleanup
        this.noiseBuffer = null; // Pre-computed hammer noise
        
        // Piano sound parameters
        this.baseVolume = 0.3;
        
        // ADSR envelope parameters (in seconds)
        this.attack = 0.005;
        this.decay = 0.3;
        this.sustain = 0.4;
        this.release = 0.8;
        
        // Harmonic overtones for realistic piano sound
        // Each overtone has: [frequency multiplier, amplitude, decay rate]
        // Reduced number of harmonics for better performance on mobile
        this.harmonics = [
            [1, 1.0, 1.0],      // Fundamental
            [2, 0.5, 1.2],      // 2nd harmonic
            [3, 0.25, 1.5],     // 3rd harmonic
            [4, 0.15, 1.8],     // 4th harmonic
            [5, 0.1, 2.0],      // 5th harmonic
        ];
    }
    
    async initialize() {
        if (this.isInitialized) return;
        
        try {
            // Create audio context
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Create master gain node
            this.masterGain = this.audioContext.createGain();
            this.masterGain.gain.value = this.baseVolume;
            this.masterGain.connect(this.audioContext.destination);
            
            // Add a subtle reverb/room effect using convolution
            this.createReverbEffect();
            
            // Pre-compute hammer noise buffer
            this.precomputeNoise();
            
            this.isInitialized = true;
        } catch (error) {
            console.error('Failed to initialize audio context:', error);
            throw error;
        }
    }
    
    precomputeNoise() {
        const bufferSize = this.audioContext.sampleRate * 0.02; // 20ms of noise
        this.noiseBuffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const output = this.noiseBuffer.getChannelData(0);
        
        for (let i = 0; i < bufferSize; i++) {
            output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.2));
        }
    }
    
    createReverbEffect() {
        // Create a simple synthetic reverb using delay and feedback
        this.reverbGain = this.audioContext.createGain();
        this.reverbGain.gain.value = 0.12; // Slightly reduced
        
        // Simplified reverb with fewer nodes for better mobile performance
        const delays = [0.05, 0.08];
        const gains = [0.4, 0.2];
        
        delays.forEach((delayTime, i) => {
            const delay = this.audioContext.createDelay(0.5);
            delay.delayTime.value = delayTime;
            
            const gain = this.audioContext.createGain();
            gain.gain.value = gains[i];
            
            this.masterGain.connect(delay);
            delay.connect(gain);
            gain.connect(this.reverbGain);
        });
        
        this.reverbGain.connect(this.audioContext.destination);
    }
    
    // Convert semitone offset (C4=0) to frequency in Hz
    semitoneToFrequency(semitone) {
        // C4 (middle C) = 261.63 Hz = semitone 0
        // Each semitone is 2^(1/12) times the previous
        const c4Frequency = 261.63;
        return c4Frequency * Math.pow(2, semitone / 12);
    }
    
    // Play a single note with piano-like sound
    playNote(semitone, duration = 1.5, velocity = 0.7, startTime = null) {
        if (!this.isInitialized) {
            console.warn('Audio not initialized. Call initialize() first.');
            return;
        }
        
        // Resume context if suspended (required for iOS Safari)
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
        
        const now = startTime || this.audioContext.currentTime;
        const frequency = this.semitoneToFrequency(semitone);
        
        // Create a gain node for this note's envelope
        const noteGain = this.audioContext.createGain();
        noteGain.gain.value = 0;
        noteGain.connect(this.masterGain);
        
        // ADSR envelope
        const attackEnd = now + this.attack;
        const decayEnd = attackEnd + this.decay;
        const sustainLevel = this.sustain * velocity;
        const releaseStart = now + duration;
        const releaseEnd = releaseStart + this.release;
        
        // Apply envelope
        noteGain.gain.setValueAtTime(0, now);
        noteGain.gain.linearRampToValueAtTime(velocity, attackEnd);
        noteGain.gain.linearRampToValueAtTime(sustainLevel, decayEnd);
        noteGain.gain.setValueAtTime(sustainLevel, releaseStart);
        noteGain.gain.exponentialRampToValueAtTime(0.001, releaseEnd);
        
        // Create oscillators for each harmonic
        const oscillators = [];
        const harmonicGains = [];
        
        this.harmonics.forEach(([multiplier, amplitude, decayRate]) => {
            const harmonicFreq = frequency * multiplier;
            
            // Skip harmonics above 6000 Hz to avoid aliasing and harsh sounds on mobile
            if (harmonicFreq > 6000) return;
            
            // Create oscillator
            const osc = this.audioContext.createOscillator();
            osc.type = 'sine';
            osc.frequency.value = harmonicFreq;
            
            // Create gain for this harmonic with its own decay
            const harmonicGain = this.audioContext.createGain();
            const harmonicAmplitude = amplitude * (1 - (semitone / 24) * 0.3); // Higher notes have less harmonics
            harmonicGain.gain.value = Math.max(0.01, harmonicAmplitude);
            
            // Add decay to higher harmonics (they die out faster like real piano)
            harmonicGain.gain.setValueAtTime(harmonicAmplitude, now);
            harmonicGain.gain.exponentialRampToValueAtTime(
                Math.max(0.001, harmonicAmplitude * 0.1), 
                now + duration / decayRate
            );
            
            osc.connect(harmonicGain);
            harmonicGain.connect(noteGain);
            
            osc.start(now);
            osc.stop(releaseEnd + 0.1);
            
            oscillators.push(osc);
            harmonicGains.push(harmonicGain);
        });
        
        // Add a subtle "hammer" noise for attack realism
        this.addHammerNoise(noteGain, now, velocity);
        
        // Store reference for potential cleanup
        const noteId = `${semitone}-${now}`;
        this.activeNotes.set(noteId, { oscillators, harmonicGains, noteGain });
        
        // Clean up nodes after note ends to save memory and CPU
        const cleanupTime = (releaseEnd - this.audioContext.currentTime + 0.5) * 1000;
        setTimeout(() => {
            if (this.activeNotes.has(noteId)) {
                const note = this.activeNotes.get(noteId);
                note.oscillators.forEach(osc => {
                    try { osc.disconnect(); } catch (e) {}
                });
                note.harmonicGains.forEach(g => {
                    try { g.disconnect(); } catch (e) {}
                });
                try { note.noteGain.disconnect(); } catch (e) {}
                this.activeNotes.delete(noteId);
            }
        }, Math.max(0, cleanupTime));
    }
    
    addHammerNoise(destination, startTime, velocity) {
        if (!this.noiseBuffer) return;
        
        const noise = this.audioContext.createBufferSource();
        noise.buffer = this.noiseBuffer;
        
        // Filter the noise to sound more like a piano hammer
        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 2000;
        filter.Q.value = 1;
        
        const noiseGain = this.audioContext.createGain();
        noiseGain.gain.value = velocity * 0.15;
        
        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(destination);
        
        noise.start(startTime);
        
        // Cleanup noise nodes
        setTimeout(() => {
            try {
                noise.disconnect();
                filter.disconnect();
                noiseGain.disconnect();
            } catch (e) {}
        }, 100);
    }
    
    // Play a chord (array of semitones)
    playChord(semitones, duration = 2.0, velocity = 0.6, stagger = 0.02) {
        if (!this.isInitialized) {
            this.initialize().then(() => {
                this.playChordInternal(semitones, duration, velocity, stagger);
            });
        } else {
            this.playChordInternal(semitones, duration, velocity, stagger);
        }
    }
    
    playChordInternal(semitones, duration, velocity, stagger) {
        // Resume context if suspended
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
        
        const now = this.audioContext.currentTime;
        
        // Sort notes from low to high
        const sortedNotes = [...semitones].sort((a, b) => a - b);
        
        // Play each note with a slight stagger (like a human strumming)
        // Using Web Audio timing instead of setTimeout for better performance and precision
        sortedNotes.forEach((semitone, index) => {
            // Vary velocity slightly for more natural sound
            const noteVelocity = velocity * (0.9 + Math.random() * 0.2);
            const startTime = now + (index * stagger);
            this.playNote(semitone, duration, noteVelocity, startTime);
        });
    }
    
    // Play a chord by name using the chord parser
    playChordByName(chordName, chordParser) {
        const chord = chordParser(chordName);
        if (chord && chord.notes) {
            this.playChord(chord.notes);
        }
    }
    
    // Stop all currently playing notes
    stopAll() {
        if (!this.isInitialized) return;
        
        const now = this.audioContext.currentTime;
        
        this.activeNotes.forEach(({ noteGain }) => {
            noteGain.gain.cancelScheduledValues(now);
            noteGain.gain.setValueAtTime(noteGain.gain.value, now);
            noteGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        });
        
        this.activeNotes.clear();
    }
    
    // Set master volume (0.0 to 1.0)
    setVolume(volume) {
        this.baseVolume = Math.max(0, Math.min(1, volume));
        if (this.masterGain) {
            this.masterGain.gain.value = this.baseVolume;
        }
    }
    
    // Get current volume
    getVolume() {
        return this.baseVolume;
    }
    
    // Clean up resources
    dispose() {
        this.stopAll();
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
        this.isInitialized = false;
    }
}

// Make it globally available
window.PianoAudioPlayer = PianoAudioPlayer;


