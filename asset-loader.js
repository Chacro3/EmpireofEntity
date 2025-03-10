/**
 * Empires of Eternity - Asset Loader
 * Handles loading game assets with fallbacks for missing files
 */

class AssetLoader {
    constructor() {
        // Asset caches
        this.images = {};
        this.audio = {};
        this.loadedCount = 0;
        this.totalCount = 0;
        this.errors = [];
        
        // Default fallbacks
        this.defaultImage = new Image();
        this.defaultImage.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
        
        // Event callbacks
        this.onProgress = null;
        this.onComplete = null;
        
        console.log('AssetLoader initialized');
    }
    
    /**
     * Set progress callback
     * @param {Function} callback - Function that receives progress (0-1)
     */
    setProgressCallback(callback) {
        this.onProgress = callback;
    }
    
    /**
     * Set completion callback
     * @param {Function} callback - Function called when all assets are loaded
     */
    setCompleteCallback(callback) {
        this.onComplete = callback;
    }
    
    /**
     * Update loading progress
     * @private
     */
    updateProgress() {
        this.loadedCount++;
        const progress = this.totalCount > 0 ? this.loadedCount / this.totalCount : 1;
        
        if (this.onProgress) {
            this.onProgress(progress);
        }
        
        if (this.loadedCount >= this.totalCount && this.onComplete) {
            console.log('Asset loading complete.');
            
            if (this.errors.length > 0) {
                console.warn(`Loading completed with ${this.errors.length} errors.`);
                console.warn('Errors:', this.errors);
            }
            
            this.onComplete();
        }
    }
    
    /**
     * Load a single image with fallback
     * @param {string} key - Asset identifier
     * @param {string} path - Path to the image file
     * @param {Image} fallback - Optional specific fallback image
     * @returns {Promise<Image>} Promise that resolves with the loaded image
     */
    loadImage(key, path, fallback = null) {
        return new Promise((resolve) => {
            if (this.images[key]) {
                resolve(this.images[key]);
                return;
            }
            
            const img = new Image();
            
            img.onload = () => {
                this.images[key] = img;
                this.updateProgress();
                resolve(img);
            };
            
            img.onerror = () => {
                console.warn(`Failed to load image: ${path}`);
                this.errors.push({ type: 'image', path });
                
                // Use specific fallback or default
                const fallbackImage = fallback || this.defaultImage;
                this.images[key] = fallbackImage;
                this.updateProgress();
                resolve(fallbackImage);
            };
            
            img.src = path;
        });
    }
    
    /**
     * Load a single audio file with fallback
     * @param {string} key - Asset identifier
     * @param {string} path - Path to the audio file
     * @returns {Promise<Howl>} Promise that resolves with the loaded audio
     */
    loadAudio(key, path) {
        return new Promise((resolve) => {
            if (this.audio[key]) {
                resolve(this.audio[key]);
                return;
            }
            
            // Check if Howler is available
            if (typeof Howl === 'undefined') {
                console.warn('Howler not available, cannot load audio');
                this.errors.push({ type: 'audio', path, reason: 'Howler not available' });
                this.updateProgress();
                resolve(null);
                return;
            }
            
            const sound = new Howl({
                src: [path],
                preload: true,
                onload: () => {
                    this.audio[key] = sound;
                    this.updateProgress();
                    resolve(sound);
                },
                onloaderror: (id, err) => {
                    console.warn(`Failed to load audio: ${path}`, err);
                    this.errors.push({ type: 'audio', path, error: err });
                    
                    // Create a silent audio as fallback
                    const fallbackSound = new Howl({
                        src: ['data:audio/mp3;base64,//uQxAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAACcQCA'],
                        preload: true,
                        volume: 0
                    });
                    
                    this.audio[key] = fallbackSound;
                    this.updateProgress();
                    resolve(fallbackSound);
                }
            });
        });
    }
    
    /**
     * Load multiple images
     * @param {Object} imageMap - Map of key:path pairs for images
     * @returns {Promise<Object>} Promise that resolves when all images are loaded
     */
    loadImages(imageMap) {
        const keys = Object.keys(imageMap);
        this.totalCount += keys.length;
        
        const promises = keys.map(key => 
            this.loadImage(key, imageMap[key])
        );
        
        return Promise.all(promises).then(() => this.images);
    }
    
    /**
     * Load multiple audio files
     * @param {Object} audioMap - Map of key:path pairs for audio files
     * @returns {Promise<Object>} Promise that resolves when all audio is loaded
     */
    loadAudioFiles(audioMap) {
        const keys = Object.keys(audioMap);
        this.totalCount += keys.length;
        
        const promises = keys.map(key => 
            this.loadAudio(key, audioMap[key])
        );
        
        return Promise.all(promises).then(() => this.audio);
    }
    
    /**
     * Load all game assets
     * @param {Object} assets - Object containing imagePaths and audioPaths
     * @returns {Promise<Object>} Promise that resolves when all assets are loaded
     */
    loadAll(assets) {
        const promises = [];
        
        if (assets.images) {
            promises.push(this.loadImages(assets.images));
        }
        
        if (assets.audio) {
            promises.push(this.loadAudioFiles(assets.audio));
        }
        
        return Promise.all(promises).then(() => {
            return {
                images: this.images,
                audio: this.audio,
                errors: this.errors
            };
        });
    }
    
    /**
     * Get a loaded image (with fallback)
     * @param {string} key - Image key
     * @returns {Image} The loaded image or fallback
     */
    getImage(key) {
        return this.images[key] || this.defaultImage;
    }
    
    /**
     * Get a loaded audio (with fallback)
     * @param {string} key - Audio key
     * @returns {Howl} The loaded audio or null
     */
    getAudio(key) {
        return this.audio[key] || null;
    }
}

// Make assetLoader globally available
window.AssetLoader = AssetLoader; 