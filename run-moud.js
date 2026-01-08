const { spawn } = require('child_process');
const path = require('path');

// Set environment variables for Moud
process.env.MOUD_DEV_MODE = 'true';
process.env.MOUD_LOCAL_DEV = 'true';

// Get the command line arguments
const args = process.argv.slice(2);

// Run moud with the provided arguments
const moudProcess = spawn('npx', ['moud', ...args], {
    stdio: 'inherit',
    shell: true,
    env: process.env
});

moudProcess.on('close', (code) => {
    process.exit(code);
});

moudProcess.on('error', (err) => {
    console.error('Failed to start moud:', err);
    process.exit(1);
});
