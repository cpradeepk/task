const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

// Find the project and workspace directories
const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// 1. Watch all files in the monorepo
config.watchFolders = [workspaceRoot];

// 2. Let Metro know where to resolve packages from
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// 3. Block Metro from resolving the WRONG copies of React and React Native.
// This is critical for preventing the "useReducer of null" error.
config.resolver.blockList = [
  new RegExp(`${workspaceRoot}/node_modules/react/.*`),
  new RegExp(`${workspaceRoot}/node_modules/react-native/.*`),
];

module.exports = config;

