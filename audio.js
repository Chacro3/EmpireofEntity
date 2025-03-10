/**
 * Empires of Eternity - Audio System
 * Manages game sound effects, music, and voice lines
 */

class AudioSystem {
  /**
   * Create a new audio system
   * @param {Game} game - Game instance
   */
  constructor(game) {
    this.game = game;

    // Audio settings from config
    this.settings = {
      masterVolume: CONFIG.AUDIO.MASTER_VOLUME,
      sfxVolume: CONFIG.AUDIO.SFX_VOLUME,
      musicVolume: CONFIG.AUDIO.MUSIC_VOLUME,
      voiceVolume: CONFIG.AUDIO.VOICE_VOLUME,
      enabled: true,
    };

    // Sound categories
    this.categories = {
      sfx: {}, // Sound effects
      music: {}, // Background music
      voice: {}, // Voice lines
      ui: {}, // UI sounds
      ambient: {}, // Ambient sounds
    };

    // Currently playing sounds
    this.playing = {
      sfx: [],
      music: null,
      voice: null,
      ui: [],
      ambient: [],
    };

    // Audio context (Web Audio API)
    this.context = null;

    // Mixer nodes
    this.masterGain = null;
    this.sfxGain = null;
    this.musicGain = null;
    this.voiceGain = null;
    this.uiGain = null;
    this.ambientGain = null;

    // Crossfade timers
    this.fadeTimers = {
      music: null,
      ambient: null,
    };

    // Sound cooldowns to prevent spam
    this.cooldowns = {};

    // Add this near the top of the file, after the AudioManager constructor
    // or in the initialization method

    /**
     * Create a fallback mechanism for missing audio files
     */
    this.setupFallbacks();

    Utils.log("AudioSystem created");
  }

  /**
   * Initialize the audio system
   */
  init() {
    try {
      // Create audio context
      window.AudioContext = window.AudioContext || window.webkitAudioContext;
      this.context = new AudioContext();

      // Create mixer nodes
      this.masterGain = this.context.createGain();
      this.sfxGain = this.context.createGain();
      this.musicGain = this.context.createGain();
      this.voiceGain = this.context.createGain();
      this.uiGain = this.context.createGain();
      this.ambientGain = this.context.createGain();

      // Connect nodes
      this.sfxGain.connect(this.masterGain);
      this.musicGain.connect(this.masterGain);
      this.voiceGain.connect(this.masterGain);
      this.uiGain.connect(this.masterGain);
      this.ambientGain.connect(this.masterGain);
      this.masterGain.connect(this.context.destination);

      // Set initial volumes
      this.masterGain.gain.value = this.settings.masterVolume;
      this.sfxGain.gain.value = this.settings.sfxVolume;
      this.musicGain.gain.value = this.settings.musicVolume;
      this.voiceGain.gain.value = this.settings.voiceVolume;
      this.uiGain.gain.value = this.settings.sfxVolume; // UI uses SFX volume
      this.ambientGain.gain.value = this.settings.sfxVolume; // Ambient uses SFX volume

      // Load sound effects
      this.loadSounds();

      // Add this to the initialization sequence (init method)
      this.setupFallbacks();

      Utils.log("AudioSystem initialized successfully");
    } catch (error) {
      Utils.log("Error initializing AudioSystem: " + error);

      // Fallback to disabled audio
      this.settings.enabled = false;
    }

    return this;
  }

  /**
   * Load all game sounds
   */
  loadSounds() {
    // Load UI sounds
    this.loadSoundCategory("ui", {
      click: "assets/audio/sfx/ui_click.mp3",
      hover: "assets/audio/sfx/ui_hover.mp3",
      build: "assets/audio/sfx/ui_build.mp3",
      cancel: "assets/audio/sfx/ui_cancel.mp3",
      error: "assets/audio/sfx/ui_error.mp3",
      success: "assets/audio/sfx/ui_success.mp3",
      open: "assets/audio/sfx/ui_open.mp3",
      close: "assets/audio/sfx/ui_close.mp3",
      select: "assets/audio/sfx/ui_select.mp3",
    });

    // Load alert sounds
    this.loadSoundCategory("sfx", {
      alert_attack: "assets/audio/sfx/alert_attack.mp3",
      alert_resource: "assets/audio/sfx/alert_resource.mp3",
      alert_construction: "assets/audio/sfx/alert_construction.mp3",
      alert_research: "assets/audio/sfx/alert_research.mp3",
      alert_unit: "assets/audio/sfx/alert_unit.mp3",
      alert_info: "assets/audio/sfx/alert_info.mp3",
    });

    // Load unit sounds (Solari)
    this.loadSoundCategory("sfx", {
      // Villager sounds
      solari_villager_select: "assets/audio/sfx/solari_villager_select.mp3",
      solari_villager_move: "assets/audio/sfx/solari_villager_move.mp3",
      solari_villager_attack: "assets/audio/sfx/solari_villager_attack.mp3",
      solari_villager_gather: "assets/audio/sfx/solari_villager_gather.mp3",
      solari_villager_build: "assets/audio/sfx/solari_villager_build.mp3",
      solari_villager_death: "assets/audio/sfx/solari_villager_death.mp3",

      // Military unit sounds
      solari_infantry_select: "assets/audio/sfx/solari_infantry_select.mp3",
      solari_infantry_move: "assets/audio/sfx/solari_infantry_move.mp3",
      solari_infantry_attack: "assets/audio/sfx/solari_infantry_attack.mp3",
      solari_infantry_death: "assets/audio/sfx/solari_infantry_death.mp3",

      solari_archer_select: "assets/audio/sfx/solari_archer_select.mp3",
      solari_archer_move: "assets/audio/sfx/solari_archer_move.mp3",
      solari_archer_attack: "assets/audio/sfx/solari_archer_attack.mp3",
      solari_archer_death: "assets/audio/sfx/solari_archer_death.mp3",

      solari_cavalry_select: "assets/audio/sfx/solari_cavalry_select.mp3",
      solari_cavalry_move: "assets/audio/sfx/solari_cavalry_move.mp3",
      solari_cavalry_attack: "assets/audio/sfx/solari_cavalry_attack.mp3",
      solari_cavalry_death: "assets/audio/sfx/solari_cavalry_death.mp3",

      solari_siege_select: "assets/audio/sfx/solari_siege_select.mp3",
      solari_siege_move: "assets/audio/sfx/solari_siege_move.mp3",
      solari_siege_attack: "assets/audio/sfx/solari_siege_attack.mp3",
      solari_siege_death: "assets/audio/sfx/solari_siege_death.mp3",
    });

    // Load unit sounds (Lunari)
    this.loadSoundCategory("sfx", {
      // Villager sounds
      lunari_villager_select: "assets/audio/sfx/lunari_villager_select.mp3",
      lunari_villager_move: "assets/audio/sfx/lunari_villager_move.mp3",
      lunari_villager_attack: "assets/audio/sfx/lunari_villager_attack.mp3",
      lunari_villager_gather: "assets/audio/sfx/lunari_villager_gather.mp3",
      lunari_villager_build: "assets/audio/sfx/lunari_villager_build.mp3",
      lunari_villager_death: "assets/audio/sfx/lunari_villager_death.mp3",

      // Military unit sounds
      lunari_infantry_select: "assets/audio/sfx/lunari_infantry_select.mp3",
      lunari_infantry_move: "assets/audio/sfx/lunari_infantry_move.mp3",
      lunari_infantry_attack: "assets/audio/sfx/lunari_infantry_attack.mp3",
      lunari_infantry_death: "assets/audio/sfx/lunari_infantry_death.mp3",

      lunari_archer_select: "assets/audio/sfx/lunari_archer_select.mp3",
      lunari_archer_move: "assets/audio/sfx/lunari_archer_move.mp3",
      lunari_archer_attack: "assets/audio/sfx/lunari_archer_attack.mp3",
      lunari_archer_death: "assets/audio/sfx/lunari_archer_death.mp3",

      lunari_cavalry_select: "assets/audio/sfx/lunari_cavalry_select.mp3",
      lunari_cavalry_move: "assets/audio/sfx/lunari_cavalry_move.mp3",
      lunari_cavalry_attack: "assets/audio/sfx/lunari_cavalry_attack.mp3",
      lunari_cavalry_death: "assets/audio/sfx/lunari_cavalry_death.mp3",

      lunari_siege_select: "assets/audio/sfx/lunari_siege_select.mp3",
      lunari_siege_move: "assets/audio/sfx/lunari_siege_move.mp3",
      lunari_siege_attack: "assets/audio/sfx/lunari_siege_attack.mp3",
      lunari_siege_death: "assets/audio/sfx/lunari_siege_death.mp3",
    });

    // Load building sounds
    this.loadSoundCategory("sfx", {
      building_place: "assets/audio/sfx/building_place.mp3",
      building_construct: "assets/audio/sfx/building_construct.mp3",
      building_complete: "assets/audio/sfx/building_complete.mp3",
      building_destroy: "assets/audio/sfx/building_destroy.mp3",

      wall_place: "assets/audio/sfx/wall_place.mp3",
      wall_construct: "assets/audio/sfx/wall_construct.mp3",
      wall_complete: "assets/audio/sfx/wall_complete.mp3",
      wall_destroy: "assets/audio/sfx/wall_destroy.mp3",
      wall_breach: "assets/audio/sfx/wall_breach.mp3",

      gate_open: "assets/audio/sfx/gate_open.mp3",
      gate_close: "assets/audio/sfx/gate_close.mp3",
    });

    // Load resource sounds
    this.loadSoundCategory("sfx", {
      wood_gather: "assets/audio/sfx/wood_gather.mp3",
      food_gather: "assets/audio/sfx/food_gather.mp3",
      gold_gather: "assets/audio/sfx/gold_gather.mp3",
      stone_gather: "assets/audio/sfx/stone_gather.mp3",
      iron_gather: "assets/audio/sfx/iron_gather.mp3",

      resource_depleted: "assets/audio/sfx/resource_depleted.mp3",
      resource_dropped: "assets/audio/sfx/resource_dropped.mp3",
    });

    // Load technology sounds
    this.loadSoundCategory("sfx", {
      research_start: "assets/audio/sfx/research_start.mp3",
      research_complete: "assets/audio/sfx/research_complete.mp3",
      age_advance: "assets/audio/sfx/age_advance.mp3",
    });

    // Load game state sounds
    this.loadSoundCategory("sfx", {
      game_start: "assets/audio/sfx/game_start.mp3",
      game_pause: "assets/audio/sfx/game_pause.mp3",
      game_resume: "assets/audio/sfx/game_resume.mp3",
      game_victory: "assets/audio/sfx/game_victory.mp3",
      game_defeat: "assets/audio/sfx/game_defeat.mp3",
    });

    // Load ambient sounds
    this.loadSoundCategory("ambient", {
      day_ambience: "assets/audio/ambient/day_ambience.mp3",
      night_ambience: "assets/audio/ambient/night_ambience.mp3",
      forest_ambience: "assets/audio/ambient/forest_ambience.mp3",
      desert_ambience: "assets/audio/ambient/desert_ambience.mp3",
    });

    // Load music tracks
    this.loadSoundCategory("music", {
      main_theme: "assets/audio/music/main_theme.mp3",
      solari_theme: "assets/audio/music/solari_theme.mp3",
      lunari_theme: "assets/audio/music/lunari_theme.mp3",
      battle_theme: "assets/audio/music/battle_theme.mp3",
      victory_theme: "assets/audio/music/victory_theme.mp3",
      defeat_theme: "assets/audio/music/defeat_theme.mp3",
    });
  }

  /**
   * Load a category of sounds
   * @param {string} category - Sound category
   * @param {Object} sounds - Object mapping sound IDs to file paths
   */
  loadSoundCategory(category, sounds) {
    for (const id in sounds) {
      this.loadSound(category, id, sounds[id]);
    }
  }

  /**
   * Load a single sound
   * @param {string} category - Sound category
   * @param {string} id - Sound ID
   * @param {string} path - Sound file path
   */
  loadSound(category, id, path) {
    // Skip if audio is disabled
    if (!this.settings.enabled) return;

    try {
      // Create placeholder
      this.categories[category][id] = {
        buffer: null,
        path: path,
        loaded: false,
        loading: false,
      };

      Utils.log(`Sound registered: ${category}/${id} (${path})`);
    } catch (error) {
      Utils.log(`Error registering sound ${category}/${id}: ${error}`);
    }
  }

  /**
   * Ensure a sound is loaded (load on demand)
   * @param {string} category - Sound category
   * @param {string} id - Sound ID
   * @returns {Promise} Promise that resolves when sound is loaded
   */
  ensureSoundLoaded(category, id) {
    // Skip if audio is disabled
    if (!this.settings.enabled) {
      return Promise.resolve(null);
    }

    // Check if sound exists
    if (!this.categories[category] || !this.categories[category][id]) {
      Utils.log(`Sound not found: ${category}/${id}`);
      return Promise.resolve(null);
    }

    const sound = this.categories[category][id];

    // Return existing buffer if already loaded
    if (sound.loaded && sound.buffer) {
      return Promise.resolve(sound.buffer);
    }

    // Return existing promise if already loading
    if (sound.loading && sound.loadPromise) {
      return sound.loadPromise;
    }

    // Load the sound
    Utils.log(`Loading sound: ${category}/${id}`);
    sound.loading = true;

    sound.loadPromise = new Promise((resolve, reject) => {
      fetch(sound.path)
        .then((response) => {
          if (!response.ok) {
            throw new Error(`Network error: ${response.status}`);
          }
          return response.arrayBuffer();
        })
        .then((data) => {
          // Decode audio data
          return this.context.decodeAudioData(data);
        })
        .then((buffer) => {
          // Store the decoded buffer
          sound.buffer = buffer;
          sound.loaded = true;
          sound.loading = false;
          Utils.log(`Sound loaded: ${category}/${id}`);
          resolve(buffer);
        })
        .catch((error) => {
          sound.loading = false;
          Utils.log(`Error loading sound ${category}/${id}: ${error}`);
          reject(error);
        });
    });

    return sound.loadPromise;
  }

  /**
   * Play a sound
   * @param {string} id - Sound ID
   * @param {Object} options - Playback options
   * @returns {Object|null} Sound object or null
   */
  play(id, options = {}) {
    // Skip if audio is disabled
    if (!this.settings.enabled) {
      return null;
    }

    // Default options
    const defaultOptions = {
      volume: 1.0,
      loop: false,
      rate: 1.0,
      pan: 0,
      cooldown: 0, // Cooldown in ms
      position: null, // Position in world for spatial audio
      fadeIn: 0, // Fade in time in ms
      priority: 0, // Higher priority sounds interrupt lower ones
    };

    // Merge options
    options = { ...defaultOptions, ...options };

    // Get sound category based on ID prefix or options
    let category = options.category || "sfx";

    if (id.startsWith("ui_")) {
      category = "ui";
    } else if (id.startsWith("music_")) {
      category = "music";
    } else if (id.startsWith("voice_")) {
      category = "voice";
    } else if (id.startsWith("ambient_")) {
      category = "ambient";
    }

    // Apply category overrides from ID
    if (id === "game_start" || id === "game_victory" || id === "game_defeat") {
      category = "music";
    }

    // Check cooldown
    const cooldownKey = `${category}_${id}`;
    const now = Date.now();

    if (options.cooldown > 0 && this.cooldowns[cooldownKey]) {
      const elapsed = now - this.cooldowns[cooldownKey];

      if (elapsed < options.cooldown) {
        // Still on cooldown
        return null;
      }
    }

    // Remove id prefix if present
    const soundId = id.includes("_") ? id : id;

    // Music and ambient sounds are played differently (one at a time with crossfade)
    if (category === "music") {
      return this.playMusic(soundId, options);
    } else if (category === "ambient") {
      return this.playAmbient(soundId, options);
    } else if (category === "voice") {
      return this.playVoice(soundId, options);
    }

    // Load the sound
    this.ensureSoundLoaded(category, soundId)
      .then((buffer) => {
        if (!buffer) return;

        // Create audio source
        const source = this.context.createBufferSource();
        source.buffer = buffer;
        source.playbackRate.value = options.rate;
        source.loop = options.loop;

        // Create gain node for volume
        const gainNode = this.context.createGain();
        gainNode.gain.value = options.volume;

        // Create panner if position provided
        let panner = null;

        if (options.position) {
          panner = this.context.createPanner();
          panner.panningModel = "equalpower";
          panner.distanceModel = "inverse";
          panner.refDistance = 10;
          panner.maxDistance = 100;
          panner.rolloffFactor = 1;
          panner.positionX.value = options.position.x;
          panner.positionY.value = options.position.y;
          panner.positionZ.value = 0;

          // Connect nodes
          source.connect(gainNode);
          gainNode.connect(panner);

          // Get appropriate output node based on category
          let outputNode;

          switch (category) {
            case "sfx":
              outputNode = this.sfxGain;
              break;
            case "ui":
              outputNode = this.uiGain;
              break;
            default:
              outputNode = this.sfxGain;
          }

          panner.connect(outputNode);
        } else {
          // Simple stereo panning
          if (options.pan !== 0) {
            const pannerNode = this.context.createStereoPanner();
            pannerNode.pan.value = options.pan;

            source.connect(gainNode);
            gainNode.connect(pannerNode);

            // Get appropriate output node based on category
            let outputNode;

            switch (category) {
              case "sfx":
                outputNode = this.sfxGain;
                break;
              case "ui":
                outputNode = this.uiGain;
                break;
              default:
                outputNode = this.sfxGain;
            }

            pannerNode.connect(outputNode);
          } else {
            // Direct connection
            source.connect(gainNode);

            // Get appropriate output node based on category
            let outputNode;

            switch (category) {
              case "sfx":
                outputNode = this.sfxGain;
                break;
              case "ui":
                outputNode = this.uiGain;
                break;
              default:
                outputNode = this.sfxGain;
            }

            gainNode.connect(outputNode);
          }
        }

        // Apply fade in
        if (options.fadeIn > 0) {
          gainNode.gain.setValueAtTime(0, this.context.currentTime);
          gainNode.gain.linearRampToValueAtTime(
            options.volume,
            this.context.currentTime + options.fadeIn / 1000
          );
        }

        // Start playback
        source.start(0);

        // Apply cooldown
        if (options.cooldown > 0) {
          this.cooldowns[cooldownKey] = now;
        }

        // Store in playing sounds
        const soundObject = {
          id: soundId,
          category: category,
          source: source,
          gain: gainNode,
          panner: panner,
          options: options,
          startTime: this.context.currentTime,
        };

        this.playing[category].push(soundObject);

        // Set up cleanup on end
        source.onended = () => {
          // Remove from playing sounds
          const index = this.playing[category].indexOf(soundObject);

          if (index !== -1) {
            this.playing[category].splice(index, 1);
          }
        };

        return soundObject;
      })
      .catch((error) => {
        Utils.log(`Error playing sound ${category}/${soundId}: ${error}`);
        return null;
      });

    return null; // Return immediately, actual sound is played asynchronously
  }

  /**
   * Play music track with crossfade
   * @param {string} id - Music ID
   * @param {Object} options - Playback options
   * @returns {Object|null} Sound object or null
   */
  playMusic(id, options = {}) {
    // Skip if audio is disabled
    if (!this.settings.enabled) {
      return null;
    }

    // Default music options
    options = {
      volume: 1.0,
      loop: true,
      fadeIn: 1000, // 1 second fade in
      fadeOut: 1000, // 1 second fade out for current track
      ...options,
    };

    // Load the music
    this.ensureSoundLoaded("music", id)
      .then((buffer) => {
        if (!buffer) return;

        // Fade out current music if playing
        if (this.playing.music) {
          const currentMusic = this.playing.music;

          // Cancel any existing fade
          if (this.fadeTimers.music) {
            clearTimeout(this.fadeTimers.music);
          }

          // Fade out
          currentMusic.gain.gain.cancelScheduledValues(
            this.context.currentTime
          );
          currentMusic.gain.gain.setValueAtTime(
            currentMusic.gain.gain.value,
            this.context.currentTime
          );
          currentMusic.gain.gain.linearRampToValueAtTime(
            0,
            this.context.currentTime + options.fadeOut / 1000
          );

          // Stop after fade out
          this.fadeTimers.music = setTimeout(() => {
            currentMusic.source.stop();
            this.playing.music = null;
          }, options.fadeOut);
        }

        // Create audio source
        const source = this.context.createBufferSource();
        source.buffer = buffer;
        source.loop = options.loop;

        // Create gain node for volume
        const gainNode = this.context.createGain();

        // Start at 0 volume for fade in
        gainNode.gain.setValueAtTime(0, this.context.currentTime);

        // Connect nodes
        source.connect(gainNode);
        gainNode.connect(this.musicGain);

        // Start playback
        source.start(0);

        // Fade in
        gainNode.gain.linearRampToValueAtTime(
          options.volume,
          this.context.currentTime + options.fadeIn / 1000
        );

        // Store as current music
        const musicObject = {
          id: id,
          category: "music",
          source: source,
          gain: gainNode,
          options: options,
          startTime: this.context.currentTime,
        };

        this.playing.music = musicObject;

        // Set up cleanup on end
        source.onended = () => {
          // Only clear if this is still the current music
          if (this.playing.music === musicObject) {
            this.playing.music = null;
          }
        };

        return musicObject;
      })
      .catch((error) => {
        Utils.log(`Error playing music ${id}: ${error}`);
        return null;
      });

    return null; // Return immediately, actual sound is played asynchronously
  }

  /**
   * Play ambient sound with crossfade
   * @param {string} id - Ambient sound ID
   * @param {Object} options - Playback options
   * @returns {Object|null} Sound object or null
   */
  playAmbient(id, options = {}) {
    // Similar to playMusic but for ambient sounds
    // Implemented similarly with crossfade between ambient tracks

    // Skip if audio is disabled
    if (!this.settings.enabled) {
      return null;
    }

    // Default ambient options
    options = {
      volume: 0.5,
      loop: true,
      fadeIn: 2000, // 2 second fade in
      fadeOut: 2000, // 2 second fade out for current ambient
      ...options,
    };

    // Load the ambient sound
    this.ensureSoundLoaded("ambient", id)
      .then((buffer) => {
        if (!buffer) return;

        // Fade out current ambient if playing
        if (this.playing.ambient.length > 0) {
          // Fade out all current ambient sounds
          for (const ambient of this.playing.ambient) {
            ambient.gain.gain.cancelScheduledValues(this.context.currentTime);
            ambient.gain.gain.setValueAtTime(
              ambient.gain.gain.value,
              this.context.currentTime
            );
            ambient.gain.gain.linearRampToValueAtTime(
              0,
              this.context.currentTime + options.fadeOut / 1000
            );

            // Schedule stop
            setTimeout(() => {
              ambient.source.stop();
            }, options.fadeOut);
          }

          // Clear ambient list after fade out
          setTimeout(() => {
            this.playing.ambient = [];
          }, options.fadeOut);
        }

        // Create audio source
        const source = this.context.createBufferSource();
        source.buffer = buffer;
        source.loop = options.loop;

        // Create gain node for volume
        const gainNode = this.context.createGain();

        // Start at 0 volume for fade in
        gainNode.gain.setValueAtTime(0, this.context.currentTime);

        // Connect nodes
        source.connect(gainNode);
        gainNode.connect(this.ambientGain);

        // Start playback
        source.start(0);

        // Fade in
        gainNode.gain.linearRampToValueAtTime(
          options.volume,
          this.context.currentTime + options.fadeIn / 1000
        );

        // Store in ambient sounds
        const ambientObject = {
          id: id,
          category: "ambient",
          source: source,
          gain: gainNode,
          options: options,
          startTime: this.context.currentTime,
        };

        this.playing.ambient.push(ambientObject);

        // Set up cleanup on end
        source.onended = () => {
          // Remove from ambient sounds
          const index = this.playing.ambient.indexOf(ambientObject);

          if (index !== -1) {
            this.playing.ambient.splice(index, 1);
          }
        };

        return ambientObject;
      })
      .catch((error) => {
        Utils.log(`Error playing ambient ${id}: ${error}`);
        return null;
      });

    return null; // Return immediately, actual sound is played asynchronously
  }

  /**
   * Play voice line
   * @param {string} id - Voice line ID
   * @param {Object} options - Playback options
   * @returns {Object|null} Sound object or null
   */
  playVoice(id, options = {}) {
    // Skip if audio is disabled
    if (!this.settings.enabled) {
      return null;
    }

    // Default voice options
    options = {
      volume: 1.0,
      priority: 1, // Higher priority voices interrupt lower ones
      ...options,
    };

    // Check if we should interrupt current voice
    if (this.playing.voice) {
      if (options.priority <= this.playing.voice.options.priority) {
        // Current voice has equal or higher priority, don't interrupt
        return null;
      }

      // Stop current voice
      this.playing.voice.source.stop();
      this.playing.voice = null;
    }

    // Load the voice line
    this.ensureSoundLoaded("voice", id)
      .then((buffer) => {
        if (!buffer) return;

        // Create audio source
        const source = this.context.createBufferSource();
        source.buffer = buffer;

        // Create gain node for volume
        const gainNode = this.context.createGain();
        gainNode.gain.value = options.volume;

        // Connect nodes
        source.connect(gainNode);
        gainNode.connect(this.voiceGain);

        // Start playback
        source.start(0);

        // Store as current voice
        const voiceObject = {
          id: id,
          category: "voice",
          source: source,
          gain: gainNode,
          options: options,
          startTime: this.context.currentTime,
        };

        this.playing.voice = voiceObject;

        // Set up cleanup on end
        source.onended = () => {
          // Only clear if this is still the current voice
          if (this.playing.voice === voiceObject) {
            this.playing.voice = null;
          }
        };

        return voiceObject;
      })
      .catch((error) => {
        Utils.log(`Error playing voice ${id}: ${error}`);
        return null;
      });

    return null; // Return immediately, actual sound is played asynchronously
  }

  /**
   * Stop a playing sound
   * @param {Object} sound - Sound object to stop
   * @param {number} fadeOut - Fade out time in ms (0 for immediate)
   */
  stopSound(sound, fadeOut = 0) {
    if (!sound || !sound.source) return;

    if (fadeOut > 0) {
      // Fade out
      sound.gain.gain.cancelScheduledValues(this.context.currentTime);
      sound.gain.gain.setValueAtTime(
        sound.gain.gain.value,
        this.context.currentTime
      );
      sound.gain.gain.linearRampToValueAtTime(
        0,
        this.context.currentTime + fadeOut / 1000
      );

      // Stop after fade out
      setTimeout(() => {
        try {
          sound.source.stop();
        } catch (e) {
          // Ignore errors if already stopped
        }
      }, fadeOut);
    } else {
      // Stop immediately
      try {
        sound.source.stop();
      } catch (e) {
        // Ignore errors if already stopped
      }
    }
  }

  /**
   * Stop all sounds
   * @param {number} fadeOut - Fade out time in ms (0 for immediate)
   */
  stopAll(fadeOut = 0) {
    // Stop music
    if (this.playing.music) {
      this.stopSound(this.playing.music, fadeOut);
      this.playing.music = null;
    }

    // Stop voice
    if (this.playing.voice) {
      this.stopSound(this.playing.voice, fadeOut);
      this.playing.voice = null;
    }

    // Stop all sfx
    for (const sound of this.playing.sfx) {
      this.stopSound(sound, fadeOut);
    }
    this.playing.sfx = [];

    // Stop all ui sounds
    for (const sound of this.playing.ui) {
      this.stopSound(sound, fadeOut);
    }
    this.playing.ui = [];

    // Stop all ambient sounds
    for (const sound of this.playing.ambient) {
      this.stopSound(sound, fadeOut);
    }
    this.playing.ambient = [];
  }

  /**
   * Set master volume
   * @param {number} volume - Volume level (0-1)
   */
  setMasterVolume(volume) {
    this.settings.masterVolume = Math.max(0, Math.min(1, volume));

    if (this.masterGain) {
      this.masterGain.gain.value = this.settings.masterVolume;
    }
  }

  /**
   * Set SFX volume
   * @param {number} volume - Volume level (0-1)
   */
  setSfxVolume(volume) {
    this.settings.sfxVolume = Math.max(0, Math.min(1, volume));

    if (this.sfxGain) {
      this.sfxGain.gain.value = this.settings.sfxVolume;
    }

    // UI and ambient also use SFX volume
    if (this.uiGain) {
      this.uiGain.gain.value = this.settings.sfxVolume;
    }

    if (this.ambientGain) {
      this.ambientGain.gain.value = this.settings.sfxVolume;
    }
  }

  /**
   * Set music volume
   * @param {number} volume - Volume level (0-1)
   */
  setMusicVolume(volume) {
    this.settings.musicVolume = Math.max(0, Math.min(1, volume));

    if (this.musicGain) {
      this.musicGain.gain.value = this.settings.musicVolume;
    }
  }

  /**
   * Set voice volume
   * @param {number} volume - Volume level (0-1)
   */
  setVoiceVolume(volume) {
    this.settings.voiceVolume = Math.max(0, Math.min(1, volume));

    if (this.voiceGain) {
      this.voiceGain.gain.value = this.settings.voiceVolume;
    }
  }

  /**
   * Enable or disable audio
   * @param {boolean} enabled - Whether audio is enabled
   */
  setEnabled(enabled) {
    this.settings.enabled = enabled;

    if (!enabled) {
      // Stop all sounds
      this.stopAll(0);
    } else if (!this.context) {
      // Re-initialize if needed
      this.init();
    }
  }

  /**
   * Resume audio context (required for browsers that suspend it)
   */
  resume() {
    if (this.context && this.context.state === "suspended") {
      this.context
        .resume()
        .then(() => {
          Utils.log("AudioContext resumed successfully");
        })
        .catch((error) => {
          Utils.log(`Error resuming AudioContext: ${error}`);
        });
    }
  }

  /**
   * Play a unit sound based on action and unit details
   * @param {Entity} unit - Unit entity
   * @param {string} action - Action (select, move, attack, etc.)
   */
  playUnitSound(unit, action) {
    if (!unit) return;

    // Determine civilization prefix
    const civPrefix = unit.owner === "SOLARI" ? "solari" : "lunari";

    // Determine unit type string
    let unitType = "unit";

    if (unit.type === "villager") {
      unitType = "villager";
    } else if (unit.type === "hero") {
      unitType = "hero";
    } else if (unit.unitType) {
      if (
        unit.unitType.includes("spearman") ||
        unit.unitType.includes("skirmisher")
      ) {
        unitType = "infantry";
      } else if (
        unit.unitType.includes("archer") ||
        unit.unitType.includes("hunter")
      ) {
        unitType = "archer";
      } else if (
        unit.unitType.includes("cavalry") ||
        unit.unitType.includes("rider")
      ) {
        unitType = "cavalry";
      } else if (
        unit.unitType.includes("catapult") ||
        unit.unitType.includes("trebuchet")
      ) {
        unitType = "siege";
      }
    }

    // Create sound ID
    const soundId = `${civPrefix}_${unitType}_${action}`;

    // Position for spatial audio
    const position = unit ? { x: unit.x, y: unit.y } : null;

    // Play sound
    this.play(soundId, {
      position: position,
      cooldown: 500, // 500ms cooldown for unit sounds
    });
  }

  /**
   * Play a building sound
   * @param {Entity} building - Building entity
   * @param {string} action - Action (place, construct, complete, etc.)
   */
  playBuildingSound(building, action) {
    if (!building) return;

    // Determine sound ID
    let soundId;

    if (building.type === "wall") {
      soundId = `wall_${action}`;
    } else {
      soundId = `building_${action}`;
    }

    // Position for spatial audio
    const position = building ? { x: building.x, y: building.y } : null;

    // Play sound
    this.play(soundId, {
      position: position,
    });
  }

  /**
   * Update audio system
   * @param {number} deltaTime - Time elapsed since last update
   */
  update(deltaTime) {
    // Update listener position based on camera
    this.updateListenerPosition();

    // Update day/night ambient based on game time
    this.updateAmbientSounds(deltaTime);
  }

  /**
   * Update Web Audio listener position based on camera
   */
  updateListenerPosition() {
    if (!this.context || !this.settings.enabled) return;

    const renderer = this.game.getSystem("renderer");
    if (!renderer) return;

    // Get camera position
    const cameraX =
      renderer.camera.x + renderer.canvas.width / 2 / renderer.camera.zoom;
    const cameraY =
      renderer.camera.y + renderer.canvas.height / 2 / renderer.camera.zoom;

    // Set listener position
    if (this.context.listener.positionX) {
      // Modern API
      this.context.listener.positionX.value = cameraX;
      this.context.listener.positionY.value = cameraY;
      this.context.listener.positionZ.value = 100; // Above the map

      // Set orientation (facing down)
      this.context.listener.forwardX.value = 0;
      this.context.listener.forwardY.value = 0;
      this.context.listener.forwardZ.value = -1;
      this.context.listener.upX.value = 0;
      this.context.listener.upY.value = 1;
      this.context.listener.upZ.value = 0;
    } else {
      // Legacy API
      this.context.listener.setPosition(cameraX, cameraY, 100);
      this.context.listener.setOrientation(0, 0, -1, 0, 1, 0);
    }
  }

  /**
   * Update ambient sounds based on game state
   * @param {number} deltaTime - Time elapsed since last update
   */
  updateAmbientSounds(deltaTime) {
    // Check if game is running
    if (!this.game.state.running || this.game.state.paused) return;

    // Get day/night cycle info
    const dayNightCycle = this.game.state.dayNightCycle;

    if (!dayNightCycle) return;

    // Day/night transition
    const isNight = dayNightCycle.time >= 0.5;
    const timeOfDay = isNight ? "night" : "day";

    // Determine if we need to change ambient
    const currentAmbient = this.playing.ambient[0]
      ? this.playing.ambient[0].id
      : null;
    const targetAmbient = `${timeOfDay}_ambience`;

    // Switch ambient if needed and not in transition
    if (currentAmbient !== targetAmbient && !this.fadeTimers.ambient) {
      // Play the appropriate ambient track
      this.playAmbient(targetAmbient, {
        volume: 0.3,
        loop: true,
        fadeIn: 5000, // 5 second fade in
        fadeOut: 5000, // 5 second fade out
      });
    }
  }

  /**
   * Create a fallback mechanism for missing audio files
   */
  setupFallbacks() {
    // Check if both Howler and AssetLoader are available
    if (typeof Howl === 'undefined') {
      console.warn('Howler.js not available. Audio will be disabled.');
      this.settings.enabled = false;
      return;
    }

    // Default silent sound as fallback
    this.silentSound = new Howl({
      src: ['data:audio/mp3;base64,//uQxAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAACcQCA'],
      preload: true,
      volume: 0
    });

    console.log('Audio fallbacks initialized');
  }

  /**
   * Modified play method with fallback handling
   */
  play(soundId, volume, loop) {
    if (!this.settings.enabled || !this.categories.sfx[soundId]) {
      // Use silent fallback if sound not found
      if (this.silentSound) {
        return this.silentSound.play();
      }
      return -1; // Error code
    }

    try {
      const sound = this.categories.sfx[soundId];
      const actualVolume = typeof volume !== 'undefined' ? volume : 1;
      
      // Set volume and loop status
      sound.gain.gain.value = actualVolume * this.settings.sfxVolume;
      if (typeof loop !== 'undefined') {
        sound.loop = loop;
      }
      
      // Play and return the sound ID
      return sound.source.start();
    } catch (e) {
      console.error('Error playing sound:', soundId, e);
      // Use silent fallback if error occurs
      if (this.silentSound) {
        return this.silentSound.play();
      }
      return -1; // Error code
    }
  }
}

// Export for ES modules or make available globally
if (typeof module !== "undefined" && module.exports) {
  module.exports = AudioSystem;
} else {
  window.AudioSystem = AudioSystem;
}
