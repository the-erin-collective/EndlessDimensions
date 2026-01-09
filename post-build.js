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
        'moud.toml',
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

        // Ensure data folder is also at the root (some paths depend on this)
        const dataDir = path.join(srcDir, 'data');
        if (fs.existsSync(dataDir)) {
            const destDataDir = path.join(tempDir, 'data');
            if (fs.existsSync(destDataDir)) {
                // Merge if exists
                await fs.promises.cp(dataDir, destDataDir, { recursive: true });
            } else {
                await fs.promises.cp(dataDir, destDataDir, { recursive: true });
            }
            console.log('  ✓ Updated data directory in root');
        }
    }

    // NEW: Copy libs directory to package mods folder (Moud 0.7.x scans /mods)
    const libsDir = path.join(projectRoot, 'libs');
    const destModsDir = path.join(tempDir, 'mods');

    if (fs.existsSync(libsDir)) {
        if (!fs.existsSync(destModsDir)) {
            await fs.promises.mkdir(destModsDir, { recursive: true });
        }

        const libsFiles = await fs.promises.readdir(libsDir);
        for (const file of libsFiles) {
            if (file.endsWith('.jar')) {
                const srcPath = path.join(libsDir, file);
                const destPath = path.join(destModsDir, file);
                await fs.promises.copyFile(srcPath, destPath);
                console.log(`  ✓ Included ${file} in mods/`);
            }
        }
    }

    // NEW: Copy Terra bridge plugin Shadow JAR to plugins directory
    const terraPluginDir = path.join(projectRoot, 'src', 'bridges', 'terra-bridge-plugin');
    const terraBuildDir = path.join(terraPluginDir, 'build', 'libs');
    const destPluginsDir = path.join(tempDir, 'plugins');

    if (fs.existsSync(terraBuildDir)) {
        if (!fs.existsSync(destPluginsDir)) {
            await fs.promises.mkdir(destPluginsDir, { recursive: true });
        }

        const terraJars = await fs.promises.readdir(terraBuildDir);
        for (const jar of terraJars) {
            if (jar.startsWith('moud-terra-bridge') && jar.endsWith('.jar') && !jar.includes('-sources.jar') && !jar.includes('-javadoc.jar')) {
                const srcPath = path.join(terraBuildDir, jar);
                const destPath = path.join(destPluginsDir, jar);
                await fs.promises.copyFile(srcPath, destPath);
                console.log(`  ✓ Included Terra bridge plugin ${jar} in plugins/`);
            }
        }
    } else {
        console.log('  ⚠ Terra bridge plugin not built. Run: cd src/bridges/terra-bridge-plugin && ./gradlew shadowJar');
    }

    // Copy Polar bridge plugin if built
    const polarPluginPath = path.join(__dirname, 'src', 'bridges', 'polar-bridge-plugin', 'build', 'libs', 'moud-polar-bridge-1.0.0-BETA.jar');
    if (fs.existsSync(polarPluginPath)) {
        const pluginsDir = path.join(tempDir, 'plugins');
        if (!fs.existsSync(pluginsDir)) {
            fs.mkdirSync(pluginsDir, { recursive: true });
        }
        fs.copyFileSync(polarPluginPath, path.join(pluginsDir, 'moud-polar-bridge-1.0.0-BETA.jar'));
        console.log('  ✓ Included Polar bridge plugin moud-polar-bridge-1.0.0-BETA.jar in plugins/');
    } else {
        console.log('  ⚠ Polar bridge plugin not built. Run: cd src/bridges/polar-bridge-plugin && ./gradlew shadowJar');
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
