const fs = require('node:fs');
const path = require('node:path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
const modules = path.join(__dirname, 'node_modules');

// A linked worktree can share the already installed dependencies through a junction.
// Metro must also index the junction target when it lies outside the project root.
if (fs.existsSync(modules)) {
  const realModules = fs.realpathSync(modules);
  if (realModules !== modules) {
    config.watchFolders = [...config.watchFolders, realModules];
  }
}

module.exports = config;
