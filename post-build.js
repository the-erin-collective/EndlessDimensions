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

    // Most moud builds put things in a /game folder. We want them in the ROOT
    const gameDir = path.join(tempDir, 'game');
    if (fs.existsSync(gameDir)) {
        console.log('Moving files from /game to root...');
        const gameFiles = await fs.promises.readdir(gameDir);
        for (const file of gameFiles) {
            const oldPath = path.join(gameDir, file);
            const newPath = path.join(tempDir, file);

            if (fs.lstatSync(oldPath).isDirectory()) {
                if (fs.existsSync(newPath)) {
                    await fs.promises.rm(newPath, { recursive: true, force: true });
                }
                await fs.promises.cp(oldPath, newPath, { recursive: true });
            } else {
                await fs.promises.copyFile(oldPath, newPath);
            }
        }
        await fs.promises.rm(gameDir, { recursive: true, force: true });
    }

    // Copy critical project files to root
    console.log('Adding/Updating project structure files in root...');
    const projectFiles = [
        'package.json',
        'moud.json',
        'global-polyfills.js',
        'run-moud.js'
    ];

    for (const file of projectFiles) {
        const srcPath = path.join(projectRoot, file);
        if (fs.existsSync(srcPath)) {
            await fs.promises.copyFile(srcPath, path.join(tempDir, file));
            console.log(`  ✓ Updated ${file}`);
        }
    }

    // CRITICAL: Copy entry.js to root
    const entryJsPath = path.join(projectRoot, 'src', 'entry.js');
    if (fs.existsSync(entryJsPath)) {
        await fs.promises.copyFile(entryJsPath, path.join(tempDir, 'entry.js'));
        console.log(`  ✓ Updated entry.js`);
    }

    // Copy src directory to root
    const srcDir = path.join(projectRoot, 'src');
    if (fs.existsSync(srcDir)) {
        const destSrcDir = path.join(tempDir, 'src');
        if (fs.existsSync(destSrcDir)) {
            await fs.promises.rm(destSrcDir, { recursive: true, force: true });
        }
        await fs.promises.cp(srcDir, destSrcDir, { recursive: true });
        console.log('  ✓ Updated src directory in root');
    }

    // NEW: Copy libs directory to server folder and REMOVE libs folder
    const libsDir = path.join(projectRoot, 'libs');
    const tempLibsDir = path.join(tempDir, 'libs');

    // First, remove the 'libs' directory if it exists in the temp build (added by moud pack)
    if (fs.existsSync(tempLibsDir)) {
        await fs.promises.rm(tempLibsDir, { recursive: true, force: true });
        console.log('  ✓ Removed default libs directory from package');
    }

    if (fs.existsSync(libsDir)) {
        const destServerDir = path.join(tempDir, 'server');
        if (!fs.existsSync(destServerDir)) {
            await fs.promises.mkdir(destServerDir, { recursive: true });
        }

        const libsFiles = await fs.promises.readdir(libsDir);
        for (const file of libsFiles) {
            if (file.endsWith('.jar')) {
                const srcPath = path.join(libsDir, file);
                const destPath = path.join(destServerDir, file);
                await fs.promises.copyFile(srcPath, destPath);
                console.log(`  ✓ Included ${file} in server/`);
            }
        }
    }

    // Update launcher scripts to use current directory as project root
    console.log('Updating launcher scripts...');
    const runBatPath = path.join(tempDir, 'run.bat');
    if (fs.existsSync(runBatPath)) {
        let runBatContent = await fs.promises.readFile(runBatPath, 'utf8');
        runBatContent = runBatContent.replace('--project-root .\\game', '--project-root .');
        await fs.promises.writeFile(runBatPath, runBatContent);
    }

    const runShPath = path.join(tempDir, 'run.sh');
    if (fs.existsSync(runShPath)) {
        let runShContent = await fs.promises.readFile(runShPath, 'utf8');
        runShContent = runShContent.replace('--project-root ./game', '--project-root .');
        await fs.promises.writeFile(runShPath, runShContent);
    }

    // Re-create the ZIP
    console.log('Repackaging ZIP...');
    const newZip = new AdmZip();
    newZip.addLocalFolder(tempDir);
    newZip.writeZip(zipPath);

    // Clean up
    await fs.promises.rm(tempDir, { recursive: true, force: true });
    console.log(`✓ Package updated: ${zipPath}`);
}

postBuild().catch(console.error);
