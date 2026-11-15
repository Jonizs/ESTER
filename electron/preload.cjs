const { contextBridge, ipcRenderer } = require('electron');

// The only thing the page needs from the shell: the pause menu's LEAVE GAME.
contextBridge.exposeInMainWorld('ester', {
  isDesktop: true,
  quit: () => ipcRenderer.send('ester:quit'),
  // The pause menu's playtest page: writes the feedback file to the Desktop.
  saveFeedback: (name, text) => ipcRenderer.invoke('ester:save-feedback', name, text)
});
