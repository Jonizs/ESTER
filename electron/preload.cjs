const { contextBridge, ipcRenderer } = require('electron');

// The only thing the page needs from the shell: the pause menu's LEAVE GAME.
contextBridge.exposeInMainWorld('ester', {
  isDesktop: true,
  quit: () => ipcRenderer.send('ester:quit')
});
