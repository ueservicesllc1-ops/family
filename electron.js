const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
    const win = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1200,
        minHeight: 700,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            enableRemoteModule: false
        },
        backgroundColor: '#0f172a',
        icon: path.join(__dirname, 'icon.png'),
        title: 'Family Express - Sistema de Gestión de Envíos'
    });

    // Load the management app
    win.loadFile('gestion/index.html');

    // Open DevTools in development
    if (process.env.NODE_ENV === 'development') {
        win.webContents.openDevTools();
    }

    // Remove menu bar
    win.setMenuBarVisibility(false);
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
