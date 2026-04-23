#!/usr/bin/env node
const { spawn } = require('child_process');
const path = require('path');

const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;

const electronBinary = require('electron');
const appPath = path.resolve(__dirname, '..');

const child = spawn(electronBinary, [appPath], {
  stdio: 'inherit',
  env
});

child.on('error', (error) => {
  console.error('Failed to launch Electron:', error);
  process.exit(1);
});

child.on('exit', (code) => {
  process.exit(code ?? 0);
});
