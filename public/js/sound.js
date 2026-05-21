// Sound notification system using Web Audio API
var SoundManager = {
  _ctx: null,
  _enabled: true,

  _resume: function() {
    var ctx = this._getCtx();
    if (ctx && ctx.state === 'suspended') ctx.resume();
  },

  _getCtx: function() {
    if (!this._ctx) {
      try { this._ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; }
    }
    return this._ctx;
  },

  _play: function(freq, duration, type) {
    if (!this._enabled) return;
    this._resume();
    var ctx = this._getCtx();
    if (!ctx) return;
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  },

  success: function() {
    var ctx = this._getCtx();
    if (!ctx) return;
    this._play(523.25, 0.15, 'sine');
    var _this = this;
    setTimeout(function() { _this._play(659.25, 0.15, 'sine'); }, 100);
    setTimeout(function() { _this._play(783.99, 0.2, 'sine'); }, 200);
  },

  error: function() {
    this._play(300, 0.3, 'sawtooth');
    var _this = this;
    setTimeout(function() { _this._play(220, 0.4, 'sawtooth'); }, 200);
  },

  notification: function() {
    this._play(880, 0.1, 'sine');
    var _this = this;
    setTimeout(function() { _this._play(1100, 0.1, 'sine'); }, 120);
  },

  warning: function() {
    this._play(440, 0.15, 'square');
    var _this = this;
    setTimeout(function() { _this._play(440, 0.15, 'square'); }, 200);
  },

  newShipment: function() {
    var ctx = this._getCtx();
    if (!ctx) return;
    this._play(600, 0.1, 'sine');
    var _this = this;
    setTimeout(function() { _this._play(800, 0.1, 'sine'); }, 100);
    setTimeout(function() { _this._play(1000, 0.15, 'sine'); }, 200);
    setTimeout(function() { _this._play(1200, 0.2, 'sine'); }, 300);
  },

  toggle: function() {
    this._enabled = !this._enabled;
    if (this._enabled) this.success();
    return this._enabled;
  }
};

document.addEventListener('click', function() { SoundManager._resume(); }, { once: true });
document.addEventListener('touchstart', function() { SoundManager._resume(); }, { once: true });
