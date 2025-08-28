const {
  contextBridge,
  ipcRenderer
} = require('electron');
const {
  ipcChannels,
  ipcSchemes
} = require('../shared/ipc-schema');

const exposedApi = {
  // IPC methods for pairing
  registerPlayer: (pairingCode) => {
    if (!ipcSchemes.registerPlayer.validate({
        pairingCode
      })) {
      console.warn('IPC Validation failed for registerPlayer:', pairingCode);
      return;
    }
    ipcRenderer.send(ipcChannels.REGISTER_PLAYER, {
      pairingCode
    });
  },
  onPairingSuccess: (callback) => ipcRenderer.on(ipcChannels.PAIRING_SUCCESS, callback),
  onEnterPairingMode: (callback) => ipcRenderer.on(ipcChannels.ENTER_PAIRING_MODE, (event, payload) => {
    if (!ipcSchemes.enterPairingMode.validate(payload)) {
      console.warn('IPC Validation failed for onEnterPairingMode:', payload);
      return;
    }
    callback(payload);
  }),

  // IPC methods for overlay window
  onShowOverlay: (callback) => ipcRenderer.on(ipcChannels.SHOW_OVERLAY, (event, payload) => {
    if (!ipcSchemes.showOverlay.validate(payload)) {
      console.warn('IPC Validation failed for onShowOverlay:', payload);
      return;
    }
    callback(payload);
  }),
  onUpdateOverlayList: (callback) => ipcRenderer.on(ipcChannels.UPDATE_OVERLAY_LIST, (event, payload) => {
    if (!ipcSchemes.updateOverlayList.validate(payload)) {
      console.warn('IPC Validation failed for onUpdateOverlayList:', payload);
      return;
    }
    callback(payload);
  }),
  onUpdateActiveOverlay: (callback) => ipcRenderer.on(ipcChannels.UPDATE_ACTIVE_OVERLAY, (event, payload) => {
    if (!ipcSchemes.updateActiveOverlay.validate(payload)) {
      console.warn('IPC Validation failed for onUpdateActiveOverlay:', payload);
      return;
    }
    callback(payload);
  }),
};

contextBridge.exposeInMainWorld('api', exposedApi);
