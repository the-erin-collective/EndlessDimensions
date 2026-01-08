const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

async function postBuild() {
    const projectRoot = process.cwd();
    const distDir = path.join(projectRoot, 'dist');
    
    // Find the ZIP file
    const files = await fs.promises.readdir(distDir);
    const zipFile = files.find(file => file.endsWith('.zip'));
    
    if (!zipFile) {
        console.error('No ZIP file found in dist directory');
        return;
    }
    
    const zipPath = path.join(distDir, zipFile);
    console.log(`Modifying package: ${zipPath}`);
    
    // Extract the ZIP to a temporary directory
    const tempDir = path.join(projectRoot, '.temp-build');
    if (fs.existsSync(tempDir)) {
        await fs.promises.rm(tempDir, { recursive: true, force: true });
    }
    await fs.promises.mkdir(tempDir, { recursive: true });
    
    console.log('Extracting ZIP...');
    const zip = new AdmZip(zipPath);
    zip.extractAllTo(tempDir);
    
    // Add project structure files to the game directory
    const gameDir = path.join(tempDir, 'game');
    console.log('Adding project structure files...');
    
    const projectFiles = [
        'package.json',
        'moud.json',
        'global-polyfills.js',
        'run-moud.js'
    ];
    
    for (const file of projectFiles) {
        const srcPath = path.join(projectRoot, file);
        if (fs.existsSync(srcPath)) {
            await fs.promises.copyFile(srcPath, path.join(gameDir, file));
            console.log(`  ✓ Copied ${file}`);
        }
    }
    
    // Copy src directory if it exists
    const srcDir = path.join(projectRoot, 'src');
    if (fs.existsSync(srcDir)) {
        await fs.promises.cp(srcDir, path.join(gameDir, 'src'), { recursive: true });
        console.log('  ✓ Copied src directory');
    }
    
    // Re-create the ZIP
    console.log('Repackaging ZIP...');
    const newZip = new AdmZip();
    newZip.addLocalFolder(tempDir);
    newZip.writeZip(zipPath);
    
    // Clean up
    await fs.promises.rm(tempDir, { recursive: true, force: true });
    
    console.log(`✓ Package updated: ${zipPath}`);
    console.log('✓ Package now includes project structure and will work standalone!');
}

postBuild().catch(console.error);
