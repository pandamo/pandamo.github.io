/**
 * Module that enables saving the gamestate to a Cloudflare D1 database.
 *
 * Flow:
 *   save:    generate a random 12-letter key, store the base64 export under it
 *   restore: given a key, fetch the base64 export back and import it
 *
 * The 12-letter key is the only credential needed to restore a save, so the
 * game must remind the player to keep it somewhere safe.
 */
(function (Engine, $) {

  'use strict';

  if (!Engine) { return false; } // Game Engine not available

  var CloudSave = {

    // TODO: replace with your deployed Worker URL after running
    // `pnpm dlx wrangler deploy` in the cloudflare-save-api/ directory, e.g.
    // 'https://adarkroom-save-api.your-subdomain.workers.dev'
    apiUrl: 'https://adarkroom-save-api.pandamo.workers.dev',

    // Key currently being saved / shown to the user.
    lastKey: '',

    KEY_PATTERN: /^[a-z]{12}$/,

    /**
     * Generate a random key made of lowercase letters.
     *
     * @param length number of letters
     */
    generateKey: function (length) {
      var chars = 'abcdefghijklmnopqrstuvwxyz';
      var key = '';
      for (var i = 0; i < length; i++) {
        key += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return key;
    },

    /**
     * Save the current game state to the cloud under a fresh key.
     *
     * @param callback(err, key)
     */
    saveGame: function (callback) {
      var key = CloudSave.generateKey(12);

      Engine.saveGame();
      var gameState = Engine.generateExport64();

      fetch(CloudSave.apiUrl + '/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: key, gameState: gameState })
      }).then(function (response) {
        if (!response.ok) {
          throw new Error('save failed with status ' + response.status);
        }
        return response.json();
      }).then(function (data) {
        if (!data.success) {
          throw new Error('save failed');
        }
        CloudSave.lastKey = key;
        callback(null, key);
      }).catch(function (err) {
        callback(err || new Error('network error'));
      });
    },

    /**
     * Restore a save from the cloud by key.
     *
     * On success the game is imported and the page reloads.
     *
     * @param callback(err)
     */
    loadGame: function (key, callback) {
      fetch(CloudSave.apiUrl + '/api/load', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: key })
      }).then(function (response) {
        if (response.status === 404) {
          throw new Error('not_found');
        }
        if (!response.ok) {
          throw new Error('load failed with status ' + response.status);
        }
        return response.json();
      }).then(function (data) {
        if (!data.success || !data.gameState) {
          throw new Error('load failed');
        }
        // import64 writes localStorage and reloads the page.
        Engine.import64(data.gameState);
        if (typeof callback === 'function') {
          callback(null);
        }
      }).catch(function (err) {
        if (typeof callback === 'function') {
          callback(err || new Error('network error'));
        }
      });
    },

    /**
     * Copy text to the clipboard. Runs the synchronous execCommand fallback
     * first (inside the user gesture) and then also tries the async Clipboard
     * API when it is available, so the copy works on both https and http.
     *
     * @returns {boolean} true if the synchronous copy succeeded.
     */
    copyText: function (text) {
      var ok = CloudSave._fallbackCopy(text);
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).catch(function () { });
      }
      return ok;
    },

    _fallbackCopy: function (text) {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      var ok = false;
      try {
        ok = document.execCommand('copy');
      } catch (e) {
        ok = false;
      }
      document.body.removeChild(ta);
      return ok;
    }
  };

  Engine.CloudSave = CloudSave;

})(Engine, jQuery);
