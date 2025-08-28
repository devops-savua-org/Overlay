const {
  app,
  BrowserWindow,
  globalShortcut,
  protocol,
  ipcMain
} = require('electron');
const path = require('path');
const {
  createWriteStream,
  promises: fs
} = require('fs');
const {
  autoUpdater
} = require('electron-updater');
const cron = require('node-cron');
const {
  v4: uuidv4
} = require('uuid');
const {
  ipcChannels,
  ipcSchemes
} = require('../shared/ipc-schema');

const isDev = process.env.NODE_ENV === 'development';
const isMac = process.platform === 'darwin';

let mainWindow;
let overlayWindow;
let menuWindow;
let overlayData = {};
let activeOverlayPath = null;
let pairedPlayerId = null;

const storePath = app.getPath('userData');
const configFilePath = path.join(storePath, 'config.json');
const overlaysDir = path.join(storePath, 'overlays');

const API_URL = 'https://your-backend-api.com/api/players';
const UPDATE_FEED_URL_MAC = 'https://static-updates.example.com/mac/';
const UPDATE_FEED_URL_WIN = 'https://static-updates.example.com/win/';

// Security: Disable navigation and new window creation for untrusted content
app.on('web-contents-created', (event, contents) => {
  contents.on('will-navigate', (event, navigationUrl) => {
    // Only allow navigation to trusted local files
    if (!navigationUrl.startsWith('file://')) {
      event.preventDefault();
      console.warn('Navigation blocked to:', navigationUrl);
    }
  });

  contents.setWindowOpenHandler(({
    url
  }) => {
    // Block all new windows
    console.warn('New window creation blocked for:', url);
    return {
      action: 'deny'
    };
  });
});

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true
    }
  });

  // Security: Handle window visibility gracefully to prevent flash of unstyled content.
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  // Security: Implement strict CSP
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': ["default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';"]
      }
    });
  });
};

const createOverlayWindow = () => {
  overlayWindow = new BrowserWindow({
    fullscreen: true,
    show: false,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true
    }
  });

  overlayWindow.setIgnoreMouseEvents(true);
  overlayWindow.loadFile(path.join(__dirname, '../renderer/overlay.html'));
  if (isDev) overlayWindow.webContents.openDevTools();
};

const createMenuWindow = () => {
  menuWindow = new BrowserWindow({
    width: 400,
    height: 600,
    show: false,
    frame: false,
    transparent: true,
    resizable: false,
    alwaysOnTop: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true
    }
  });

  menuWindow.loadFile(path.join(__dirname, '../renderer/menu.html'));
  if (isDev) menuWindow.webContents.openDevTools();
};

const setupGlobalShortcuts = () => {
  const hotkeys = [
    ...Array(10).fill().map((_, i) => `${isMac ? 'CommandOrControl' : 'Ctrl'}+Alt+Shift+${i}`),
    `${isMac ? 'CommandOrControl' : 'Ctrl'}+Alt+Shift+H`,
    `${isMac ? 'CommandOrControl' : 'Ctrl'}+Alt+Shift+O`
  ];

  hotkeys.forEach(hotkey => {
    globalShortcut.register(hotkey, () => {
      handleHotkey(hotkey);
    });
  });
};

const handleHotkey = (hotkey) => {
  const overlayIndexMatch = hotkey.match(/\d$/);
  const isShowHotkey = overlayIndexMatch !== null;
  const isHideHotkey = hotkey.endsWith('H');
  const isMenuHotkey = hotkey.endsWith('O');

  if (isShowHotkey) {
    const index = parseInt(overlayIndexMatch[0], 10);
    const overlayKeys = Object.keys(overlayData);
    const targetKey = overlayKeys[index];

    if (activeOverlayPath === overlayData[targetKey]?.filePath) {
      overlayWindow.hide();
      activeOverlayPath = null;
      if (menuWindow && menuWindow.isVisible()) {
        menuWindow.webContents.send(ipcChannels.UPDATE_ACTIVE_OVERLAY, null);
      }
    } else {
      const filePath = overlayData[targetKey]?.filePath;
      if (filePath && overlayWindow) {
        overlayWindow.webContents.send(ipcChannels.SHOW_OVERLAY, filePath);
        overlayWindow.show();
        activeOverlayPath = filePath;
        if (menuWindow && menuWindow.isVisible()) {
          menuWindow.webContents.send(ipcChannels.UPDATE_ACTIVE_OVERLAY, filePath);
        }
      }
    }
  } else if (isHideHotkey) {
    if (overlayWindow && overlayWindow.isVisible()) {
      overlayWindow.hide();
      activeOverlayPath = null;
      if (menuWindow && menuWindow.isVisible()) {
        menuWindow.webContents.send(ipcChannels.UPDATE_ACTIVE_OVERLAY, null);
      }
    }
  } else if (isMenuHotkey) {
    if (menuWindow && menuWindow.isVisible()) {
      menuWindow.hide();
    } else {
      if (overlayData) {
        const overlayList = Object.keys(overlayData).map(key => ({
          name: key,
          filePath: overlayData[key].filePath
        }));
        menuWindow.webContents.send(ipcChannels.UPDATE_OVERLAY_LIST, {
          overlays: overlayList,
          active: activeOverlayPath
        });
      }
      menuWindow.show();
    }
  }
};

const fetchOverlays = async () => {
  if (!pairedPlayerId) {
    console.warn('Player not paired. Skipping overlay fetch.');
    return;
  }

  try {
    const response = await fetch(`${API_URL}/${pairedPlayerId}/overlays`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    await cacheOverlays(data.overlays);
    overlayData = data.overlays.reduce((acc, current) => {
      acc[current.name] = {
        hotkey: current.hotkey,
        filePath: path.join(overlaysDir, path.basename(current.url))
      };
      return acc;
    }, {});
    console.log('Overlays fetched and cached.');
  } catch (error) {
    console.error('Failed to fetch overlays:', error);
  }
};

const cacheOverlays = async (overlays) => {
  await fs.mkdir(overlaysDir, {
    recursive: true
  });
  const promises = overlays.map(async (overlay) => {
    const filePath = path.join(overlaysDir, path.basename(overlay.url));
    if (await fileExists(filePath)) {
      console.log(`File already exists, skipping download: ${filePath}`);
      return;
    }
    try {
      const response = await fetch(overlay.url);
      if (!response.ok) throw new Error(`Failed to download ${overlay.url}`);
      const fileStream = createWriteStream(filePath);
      await new Promise((resolve, reject) => {
        response.body.pipe(fileStream);
        response.body.on('error', reject);
        fileStream.on('finish', resolve);
      });
      console.log(`Downloaded and cached: ${filePath}`);
    } catch (error) {
      console.error(`Error caching overlay ${overlay.url}:`, error);
    }
  });
  await Promise.all(promises);
};

const fileExists = async (filePath) => {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
};

const registerPlayer = async (pairingCode) => {
  try {
    const response = await fetch(`${API_URL}/pair`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        pairingCode
      })
    });

    if (!response.ok) {
      throw new Error('Pairing failed.');
    }

    const {
      playerId
    } = await response.json();
    pairedPlayerId = playerId;
    await fs.writeFile(configFilePath, JSON.stringify({
      playerId
    }));
    console.log('Player paired successfully.');
    await fetchOverlays();
  } catch (error) {
    console.error('Registration failed:', error);
    return false;
  }
};

const pingBackend = async () => {
  if (!pairedPlayerId) return;
  try {
    const response = await fetch(`${API_URL}/${pairedPlayerId}/ping`, {
      method: 'POST'
    });
    if (!response.ok) {
      console.warn('Failed to send ping:', response.status);
    }
  } catch (error) {
    console.error('Error sending ping:', error);
  }
};

const initializeApp = async () => {
  try {
    const config = JSON.parse(await fs.readFile(configFilePath));
    pairedPlayerId = config.playerId;
    await fetchOverlays();
    cron.schedule('*/5 * * * *', fetchOverlays);
    cron.schedule('* * * * *', pingBackend);
  } catch (error) {
    console.log('No player ID found, entering pairing mode.');
    const pairingCode = uuidv4().slice(0, 6).toUpperCase();
    mainWindow.webContents.send(ipcChannels.ENTER_PAIRING_MODE, {
      pairingCode
    });
  }
};

// IPC Handlers
ipcMain.on(ipcChannels.REGISTER_PLAYER, async (event, payload) => {
  if (!ipcSchemes.registerPlayer.validate(payload)) {
    console.warn('IPC Validation failed for REGISTER_PLAYER:', payload);
    return;
  }
  const success = await registerPlayer(payload.pairingCode);
  if (success) {
    event.sender.send(ipcChannels.PAIRING_SUCCESS);
  }
});

// Auto-update flow
if (!isDev) {
  autoUpdater.setFeedURL({
    url: isMac ? UPDATE_FEED_URL_MAC : UPDATE_FEED_URL_WIN
  });
  autoUpdater.on('update-downloaded', (event, releaseNotes, releaseName) => {
    const dialogOpts = {
      type: 'info',
      buttons: ['Restart', 'Later'],
      title: 'Application Update',
      message: process.platform === 'win32' ? releaseNotes : releaseName,
      detail: 'A new version has been downloaded. Restart the application to apply the updates.'
    };
    dialog.showMessageBox(dialogOpts).then((returnValue) => {
      if (returnValue.response === 0) autoUpdater.quitAndInstall();
    });
  });

  autoUpdater.on('error', message => {
    console.error('There was a problem updating the application');
    console.error(message);
  });
}

app.whenReady().then(() => {
  createWindow();
  createOverlayWindow();
  createMenuWindow();
  setupGlobalShortcuts();
  initializeApp();

  if (!isDev) {
    // Check for updates on startup
    autoUpdater.checkForUpdatesAndNotify();
  }
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
