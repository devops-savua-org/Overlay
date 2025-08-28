const Joi = require('joi');

const ipcChannels = {
  // Main to Renderer
  ENTER_PAIRING_MODE: 'enter-pairing-mode',
  PAIRING_SUCCESS: 'pairing-success',
  SHOW_OVERLAY: 'show-overlay',
  UPDATE_OVERLAY_LIST: 'update-overlay-list',
  UPDATE_ACTIVE_OVERLAY: 'update-active-overlay',

  // Renderer to Main
  REGISTER_PLAYER: 'register-player',
};

const ipcSchemes = {
  // Main to Renderer
  enterPairingMode: Joi.object({
    pairingCode: Joi.string().alphanum().length(6).required(),
  }).required(),
  showOverlay: Joi.string().required(),
  updateOverlayList: Joi.object({
    overlays: Joi.array().items(Joi.object({
      name: Joi.string().required(),
      filePath: Joi.string().required(),
    })).required(),
    active: Joi.string().allow(null).required(),
  }).required(),
  updateActiveOverlay: Joi.string().allow(null).required(),

  // Renderer to Main
  registerPlayer: Joi.object({
    pairingCode: Joi.string().alphanum().length(6).required(),
  }).required(),
};

// Simple validation function
const validatePayload = (payload, schema) => {
  const {
    error
  } = schema.validate(payload);
  return !error;
};

// Attach validator to each schema
Object.keys(ipcSchemes).forEach(key => {
  ipcSchemes[key].validate = (payload) => validatePayload(payload, ipcSchemes[key]);
});

module.exports = {
  ipcChannels,
  ipcSchemes
};
--- path: forge.config.js
const {
  notarize
} = require('electron-notarize');
const path = require('path');

module.exports = {
  packagerConfig: {
    asar: true,
    executableName: 'player-app',
    icon: path.join(__dirname, 'assets', 'icon'),
    // Code signing config for macOS
    osxSign: {
      identity: process.env.APPLE_SIGNING_IDENTITY,
      'hardened-runtime': true,
      'entitlements': 'entitlements.plist',
      'entitlements-inherit': 'entitlements.plist',
      'signature-flags': 'library'
    }
  },
  rebuildConfig: {},
  makers: [{
    name: '@electron-forge/maker-squirrel',
    config: {
      // Windows specific config
      name: 'player-app',
      setupIcon: path.join(__dirname, 'assets', 'icon.ico'),
      // Windows Code Signing
      certificateFile: process.env.WINDOWS_SIGNING_CERT_FILE,
      certificatePassword: process.env.WINDOWS_SIGNING_CERT_PASSWORD
    }
  }, {
    name: '@electron-forge/maker-dmg',
    config: {
      background: './assets/dmg-bg.png',
      format: 'ULFO',
      icon: path.join(__dirname, 'assets', 'icon.icns'),
      contents: (targetPath) => {
        return [{
          x: 410,
          y: 150,
          type: 'link',
          path: '/Applications'
        }, {
          x: 130,
          y: 150,
          type: 'file',
          path: targetPath,
        }]
      }
    }
  }, {
    name: '@electron-forge/maker-zip',
    platforms: ['darwin']
  }, {
    name: '@electron-forge/maker-deb',
    config: {}
  }, {
    name: '@electron-forge/maker-rpm',
    config: {}
  }],
  publishers: [{
    name: '@electron-forge/publisher-github',
    config: {
      repository: {
        owner: 'your-github-username',
        name: 'player-app-repo'
      },
      draft: true,
      // Update feeds for mac and windows
      update: {
        mac: {
          url: 'https://static-updates.example.com/mac/'
        },
        windows: {
          url: 'https://static-updates.example.com/win/'
        }
      }
    }
  }],
  hooks: {
    postMake: async (forgeConfig, buildResults) => {
      // Notarization for macOS
      if (process.platform === 'darwin') {
        const result = buildResults.find(r => r.platform === 'darwin');
        if (result && process.env.APPLE_ID && process.env.APPLE_ID_PASSWORD) {
          console.log('Notarizing macOS app...');
          await notarize({
            appPath: result.artifacts[0],
            appleId: process.env.APPLE_ID,
            appleIdPassword: process.env.APPLE_ID_PASSWORD,
            teamId: process.env.APPLE_TEAM_ID,
          });
          console.log('Notarization complete.');
        }
      }
    }
  }
};
