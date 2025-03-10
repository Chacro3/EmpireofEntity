/*!
 * howler.js v2.2.3
 * (c) 2013-2020, James Simpson of GoldFire Studios
 * goldfirestudios.com/howler-js
 * (c) 2013-2020, James Simpson of GoldFire Studios
 * MIT License
 */

/* This is a minimal version of Howler.js for the Empire of Entity game.
   It provides basic audio functionality to prevent errors. */

(function() {
  'use strict';

  /** Global Methods **/
  /***************************************************************************/

  /**
   * Create the global controller. All contained methods and properties apply
   * to all sounds that are currently playing or will be in the future.
   */
  var HowlerGlobal = function() {
    this.init();
  };
  HowlerGlobal.prototype = {
    /**
     * Initialize the global Howler object.
     * @return {Howler}
     */
    init: function() {
      var self = this || Howler;

      // Create a global ID counter.
      self._counter = 1000;

      // Pool of unlocked HTML5 Audio objects.
      self._html5AudioPool = [];
      self.html5PoolSize = 10;

      // Internal properties.
      self._codecs = {};
      self._howls = [];
      self._muted = false;
      self._volume = 1;
      self._canPlayEvent = 'canplaythrough';
      self._navigator = (typeof window !== 'undefined' && window.navigator) ? window.navigator : null;

      // Public properties.
      self.masterGain = null;
      self.noAudio = false;
      self.usingWebAudio = true;
      self.autoSuspend = true;
      self.ctx = null;

      // Set to false to disable the auto audio unlocker.
      self.autoUnlock = true;

      return self;
    },
  };

  // Setup the global audio controller.
  var Howler = new HowlerGlobal();

  /** Group Methods **/
  /***************************************************************************/

  /**
   * Create an audio group controller.
   * @param {Object} o Passed in properties for this group.
   */
  var Howl = function(o) {
    var self = this;

    // Setup the defaults for the group.
    self._autoplay = false;
    self._format = null;
    self._html5 = false;
    self._muted = false;
    self._loop = false;
    self._pool = 5;
    self._preload = true;
    self._rate = 1;
    self._sprite = {};
    self._src = typeof o.src !== 'string' ? o.src : [o.src];
    self._volume = o.volume !== undefined ? o.volume : 1;
    self._xhr = {
      method: o.xhr && o.xhr.method ? o.xhr.method : 'GET',
      headers: o.xhr && o.xhr.headers ? o.xhr.headers : null,
      withCredentials: o.xhr && o.xhr.withCredentials ? o.xhr.withCredentials : false,
    };

    // Setup event listeners.
    self._onend = o.onend ? [{fn: o.onend}] : [];
    self._onfade = o.onfade ? [{fn: o.onfade}] : [];
    self._onload = o.onload ? [{fn: o.onload}] : [];
    self._onloaderror = o.onloaderror ? [{fn: o.onloaderror}] : [];
    self._onplayerror = o.onplayerror ? [{fn: o.onplayerror}] : [];
    self._onpause = o.onpause ? [{fn: o.onpause}] : [];
    self._onplay = o.onplay ? [{fn: o.onplay}] : [];
    self._onstop = o.onstop ? [{fn: o.onstop}] : [];
    self._onmute = o.onmute ? [{fn: o.onmute}] : [];
    self._onvolume = o.onvolume ? [{fn: o.onvolume}] : [];
    self._onrate = o.onrate ? [{fn: o.onrate}] : [];
    self._onseek = o.onseek ? [{fn: o.onseek}] : [];
    self._onunlock = o.onunlock ? [{fn: o.onunlock}] : [];
    self._onresume = [];

    // Web Audio or HTML5 Audio?
    self._webAudio = Howler.usingWebAudio && !self._html5;

    // Automatically try to enable audio.
    if (typeof Howler.ctx !== 'undefined' && Howler.ctx && Howler.autoUnlock) {
      Howler._unlockAudio();
    }

    // Keep track of this Howl group in the global controller.
    Howler._howls.push(self);

    // Load the source file unless otherwise specified.
    if (self._preload && self._preload !== 'none') {
      self.load();
    }

    return self;
  };
  Howl.prototype = {
    /**
     * Load the audio file.
     * @return {Howl}
     */
    load: function() {
      var self = this;
      
      // Call the callback.
      if (self._onload.length) {
        self._onload.forEach(function(event) {
          event.fn.call(self);
        });
      }
      
      return self;
    },

    /**
     * Play a sound or resume previous playback.
     * @param  {String/Number} sprite   Sprite name for sprite playback or sound id to continue previous.
     * @param  {Boolean} internal Internal Use: true prevents event firing.
     * @return {Number}          Sound ID.
     */
    play: function(sprite, internal) {
      var self = this;
      var id = self._inactiveSound ? self._inactiveSound._id : Howler._counter++;

      // Call the callback.
      if (self._onplay.length && !internal) {
        self._onplay.forEach(function(event) {
          event.fn.call(self, id);
        });
      }

      return id;
    },

    /**
     * Pause playback and save current position.
     * @param  {Number} id The sound ID (empty to pause all in group).
     * @return {Howl}
     */
    pause: function(id) {
      var self = this;

      // Call the callback.
      if (self._onpause.length) {
        self._onpause.forEach(function(event) {
          event.fn.call(self, id);
        });
      }

      return self;
    },

    /**
     * Stop playback and reset to start.
     * @param  {Number} id The sound ID (empty to stop all in group).
     * @param  {Boolean} internal Internal Use: true prevents event firing.
     * @return {Howl}
     */
    stop: function(id, internal) {
      var self = this;

      // Call the callback.
      if (self._onstop.length && !internal) {
        self._onstop.forEach(function(event) {
          event.fn.call(self, id);
        });
      }

      return self;
    },

    /**
     * Mute/unmute a single sound or all sounds in this Howl group.
     * @param  {Boolean} muted Set to true to mute and false to unmute.
     * @param  {Number} id    The sound ID to update (omit to mute/unmute all).
     * @return {Howl}
     */
    mute: function(muted, id) {
      var self = this;
      self._muted = muted;

      // Call the callback.
      if (self._onmute.length) {
        self._onmute.forEach(function(event) {
          event.fn.call(self, muted);
        });
      }

      return self;
    },

    /**
     * Get/set volume of this sound or the group. This method can optionally take 0, 1 or 2 arguments.
     * @param  {Number} volume The volume to set from 0.0 to 1.0.
     * @param  {Number} id    The sound ID to update (omit to change all).
     * @return {Howl/Number}  Returns self or current volume.
     */
    volume: function(volume, id) {
      var self = this;

      // If no volume is passed, return the group's volume.
      if (volume === undefined) {
        return self._volume;
      }

      self._volume = Math.min(Math.max(0, volume), 1);

      // Call the callback.
      if (self._onvolume.length) {
        self._onvolume.forEach(function(event) {
          event.fn.call(self, volume);
        });
      }

      return self;
    }
  };

  // Expose the Howl class.
  window.Howl = Howl;
  window.Howler = Howler;
})();
