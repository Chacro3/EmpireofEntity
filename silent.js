// This file provides a utility function to create silent audio files
// for missing or placeholder audio

function createSilentAudio(duration = 1) {
    // Create an empty audio context
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const context = new AudioContext();
    
    // Create a buffer for the specified duration at the sample rate of the AudioContext
    const sampleRate = context.sampleRate;
    const buffer = context.createBuffer(1, sampleRate * duration, sampleRate);
    
    // Fill the buffer with silence
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
        data[i] = 0;
    }
    
    return buffer;
}

// Export for use in audio system
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { createSilentAudio };
} 