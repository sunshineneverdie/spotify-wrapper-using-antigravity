const { app, BrowserWindow, ipcMain, session, globalShortcut } = require('electron');
const path = require('path');

let mainWindow;
// Using a slightly newer UA to trigger modern Google UI
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

// Enable DRM, hardware acceleration, and performance flags for Spotify
app.commandLine.appendSwitch('enable-widevine-cdm');
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
app.commandLine.appendSwitch('ignore-gpu-blocklist');
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('disable-software-rasterizer');

function setupSession(ses) {
    // Bypass Google "Insecure Browser" by stripping identifying headers
    ses.webRequest.onBeforeSendHeaders((details, callback) => {
        const { requestHeaders } = details;
        delete requestHeaders['X-Electron-Extra-Params'];
        requestHeaders['User-Agent'] = USER_AGENT;

        // Force desktop experience and hint dark mode
        requestHeaders['Sec-CH-UA-Mobile'] = '?0';
        requestHeaders['Sec-CH-Prefers-Color-Scheme'] = 'dark';

        callback({ requestHeaders });
    });
    ses.setUserAgent(USER_AGENT);
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 850,
        frame: false,
        backgroundColor: '#121212',
        show: false,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            webviewTag: true,
            webSecurity: true,
            plugins: true,
            preload: path.join(__dirname, 'preload.js') // Apply to main container
        }
    });

    mainWindow.loadFile('index.html');

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    setupSession(session.defaultSession);
    const spotifySession = session.fromPartition('persist:spotify');
    setupSession(spotifySession);

    // Global Window Handler for popups (Google OAuth)
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        return {
            action: 'allow',
            overrideBrowserWindowOptions: {
                width: 850,
                height: 650,
                autoHideMenuBar: true,
                frame: true,
                backgroundColor: '#1a1a1a', // Modern dark background for Google Login
                webPreferences: {
                    nodeIntegration: false,
                    contextIsolation: true,
                    userAgent: USER_AGENT,
                    webSecurity: true,
                    preload: path.join(__dirname, 'preload.js') // Critical: Fixes popups!
                }
            }
        };
    });
}

function registerMediaKeys() {
    globalShortcut.register('MediaPlayPause', () => {
        mainWindow.webContents.send('media-command', 'play-pause');
    });
    globalShortcut.register('MediaNextTrack', () => {
        mainWindow.webContents.send('media-command', 'next');
    });
    globalShortcut.register('MediaPreviousTrack', () => {
        mainWindow.webContents.send('media-command', 'previous');
    });
}

// IPC Handlers
ipcMain.on('window-minimize', () => mainWindow.minimize());
ipcMain.on('window-maximize', () => {
    if (mainWindow.isMaximized()) mainWindow.unmaximize();
    else mainWindow.maximize();
});
ipcMain.on('window-close', () => mainWindow.close());

app.whenReady().then(() => {
    createWindow();
    registerMediaKeys();
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('will-quit', () => {
    globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});
