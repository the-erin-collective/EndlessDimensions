const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Set environment variables for Moud
process.env.MOUD_DEV_MODE = 'true';
process.env.MOUD_LOCAL_DEV = 'true';

// Ensure plugins directory exists and copy compiled plugins
const extensionsDir = path.join(__dirname, 'extensions');
if (!fs.existsSync(extensionsDir)) {
    fs.mkdirSync(extensionsDir);
}

const bridgesDir = path.join(__dirname, 'src', 'bridges');
// List of bridge plugins to check
const bridges = ['terra-bridge-plugin', 'polar-bridge-plugin', 'trove-bridge-plugin', 'pvp-bridge-plugin'];

console.log('Preparing plugins for dev server...');
bridges.forEach(bridge => {
    const buildDir = path.join(bridgesDir, bridge, 'build', 'libs');
    if (fs.existsSync(buildDir)) {
        const files = fs.readdirSync(buildDir);
        files.forEach(file => {
            // Copy the main jar, excluding sources and javadoc
            if (file.endsWith('.jar') && !file.includes('-sources') && !file.includes('-javadoc')) {
                const srcPath = path.join(buildDir, file);
                const destPath = path.join(extensionsDir, file);

                // Only copy if changed or missing
                let shouldCopy = true;
                if (fs.existsSync(destPath)) {
                    const srcStat = fs.statSync(srcPath);
                    const destStat = fs.statSync(destPath);
                    if (srcStat.mtimeMs === destStat.mtimeMs && srcStat.size === destStat.size) {
                        shouldCopy = false;
                    }
                }

                if (shouldCopy) {
                    fs.copyFileSync(srcPath, destPath);
                    console.log(`✓ Copied ${file} to extensions/`);
                }
            }
        });
    }
});
console.log('Plugin preparation complete.\n');

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
