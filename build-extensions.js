#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('Building all bridge extensions...');

const bridgePlugins = [
    { name: 'polar-bridge', path: 'src/bridges/polar-bridge-plugin' },
    { name: 'terra-bridge', path: 'src/bridges/terra-bridge-plugin' },
    { name: 'trove-bridge', path: 'src/bridges/trove-bridge-plugin' },
    { name: 'pvp-bridge', path: 'src/bridges/pvp-bridge-plugin' },
    { name: 'endless-bridge', path: 'src/bridges/endless-bridge-plugin' },
    { name: 'base-bridge', path: 'src/bridges/base-bridge-plugin' }
];

const extensionsDir = path.join(__dirname, 'extensions');

// Ensure extensions directory exists
if (!fs.existsSync(extensionsDir)) {
    fs.mkdirSync(extensionsDir, { recursive: true });
}

// Clean existing extensions
console.log('Cleaning existing extensions...');
fs.readdirSync(extensionsDir).forEach(file => {
    if (file.endsWith('.jar')) {
        fs.unlinkSync(path.join(extensionsDir, file));
        console.log(`Removed existing extension: ${file}`);
    }
});

// Build each bridge plugin
bridgePlugins.forEach(plugin => {
    console.log(`\nBuilding ${plugin.name}...`);
    
    const pluginPath = path.join(__dirname, plugin.path);
    
    try {
        // Build the plugin
        process.chdir(pluginPath);
        console.log(`Running gradle build in ${pluginPath}...`);
        
        if (process.platform === 'win32') {
            execSync('gradlew.bat shadowJar', { stdio: 'inherit' });
        } else {
            execSync('./gradlew shadowJar', { stdio: 'inherit' });
        }
        
        // Find the built JAR
        const buildDir = path.join(pluginPath, 'build', 'libs');
        if (fs.existsSync(buildDir)) {
            const jarFiles = fs.readdirSync(buildDir).filter(file => file.endsWith('.jar') && !file.includes('-sources.jar') && !file.includes('-javadoc.jar'));
            
            if (jarFiles.length > 0) {
                const jarFile = jarFiles[0]; // Take the first (main) JAR
                const sourcePath = path.join(buildDir, jarFile);
                const destPath = path.join(extensionsDir, jarFile);
                
                // Copy to extensions directory
                fs.copyFileSync(sourcePath, destPath);
                console.log(`✓ Built and copied ${plugin.name}: ${jarFile}`);
            } else {
                console.warn(`⚠ No JAR file found for ${plugin.name}`);
            }
        } else {
            console.warn(`⚠ Build directory not found for ${plugin.name}`);
        }
        
    } catch (error) {
        console.error(`✗ Failed to build ${plugin.name}:`, error.message);
    }
    
    // Return to root directory
    process.chdir(__dirname);
});

console.log('\nExtension build complete!');
console.log('Extensions directory contents:');
if (fs.existsSync(extensionsDir)) {
    fs.readdirSync(extensionsDir).forEach(file => {
        console.log(`  - ${file}`);
    });
} else {
    console.log('  (empty)');
}

// Sync base Terra packs for vanilla overworld/nether/end
const terraPacksSrc = path.join(__dirname, 'docs', 'terrapacks');
const terraPacksDest = path.join(extensionsDir, 'terra-bridge-plugin', 'packs');

const packMappings = [
    { src: path.join(terraPacksSrc, 'TerraOverworldConfig'), dest: path.join(terraPacksDest, 'terra_overworld') },
    { src: path.join(terraPacksSrc, 'Tartarus'), dest: path.join(terraPacksDest, 'terra_nether') },
    { src: path.join(terraPacksSrc, 'ReimagEND'), dest: path.join(terraPacksDest, 'terra_end') }
];

const copyPack = (srcDir, destDir) => {
    if (!fs.existsSync(srcDir)) {
        console.warn(`Missing Terra pack source: ${srcDir}`);
        return;
    }
    fs.mkdirSync(destDir, { recursive: true });
    fs.cpSync(srcDir, destDir, {
        recursive: true,
        filter: (src) => !src.includes(`${path.sep}.git${path.sep}`) && !src.endsWith(`${path.sep}.git`)
    });
    console.log(`Synced Terra pack: ${srcDir} -> ${destDir}`);
};

packMappings.forEach(({ src, dest }) => copyPack(src, dest));
