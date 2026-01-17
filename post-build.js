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

    // NEW: Copy Terra bridge plugin Shadow JAR to extensions directory
    const terraPluginDir = path.join(projectRoot, 'src', 'bridges', 'terra-bridge-plugin');
    const terraBuildDir = path.join(terraPluginDir, 'build', 'libs');
    const destExtensionsDir = path.join(tempDir, 'extensions');

    if (fs.existsSync(terraBuildDir)) {
        if (!fs.existsSync(destExtensionsDir)) {
            await fs.promises.mkdir(destExtensionsDir, { recursive: true });
        }

        const terraJars = await fs.promises.readdir(terraBuildDir);
        for (const jar of terraJars) {
            if (jar.startsWith('moud-terra-bridge') && jar.endsWith('.jar') && !jar.includes('-sources.jar') && !jar.includes('-javadoc.jar')) {
                const srcPath = path.join(terraBuildDir, jar);
                const destPath = path.join(destExtensionsDir, jar);
                await fs.promises.copyFile(srcPath, destPath);
                console.log(`  ✓ Included Terra bridge plugin ${jar} in extensions/`);
            }
        }
    } else {
        console.log('  ⚠ Terra bridge plugin not built. Run: cd src/bridges/terra-bridge-plugin && ./gradlew shadowJar');
    }

    // Copy Endless bridge plugin if built
    const endlessPluginDir = path.join(projectRoot, 'src', 'bridges', 'endless-bridge-plugin');
    const endlessBuildDir = path.join(endlessPluginDir, 'build', 'libs');

    if (fs.existsSync(endlessBuildDir)) {
        if (!fs.existsSync(destExtensionsDir)) {
            await fs.promises.mkdir(destExtensionsDir, { recursive: true });
        }

        const endlessJars = await fs.promises.readdir(endlessBuildDir);
        for (const jar of endlessJars) {
            if (jar.startsWith('moud-endless-bridge') && jar.endsWith('.jar') && !jar.includes('-sources.jar') && !jar.includes('-javadoc.jar')) {
                const srcPath = path.join(endlessBuildDir, jar);
                const destPath = path.join(destExtensionsDir, jar);
                await fs.promises.copyFile(srcPath, destPath);
                console.log(`  Included Endless bridge plugin ${jar} in extensions/`);
            }
        }
    } else {
        console.log('  Endless bridge plugin not built. Run: cd src/bridges/endless-bridge-plugin && ./gradlew shadowJar');
    }

    // Copy Base bridge plugin if built
    const basePluginDir = path.join(projectRoot, 'src', 'bridges', 'base-bridge-plugin');
    const baseBuildDir = path.join(basePluginDir, 'build', 'libs');

    if (fs.existsSync(baseBuildDir)) {
        if (!fs.existsSync(destExtensionsDir)) {
            await fs.promises.mkdir(destExtensionsDir, { recursive: true });
        }

        const baseJars = await fs.promises.readdir(baseBuildDir);
        for (const jar of baseJars) {
            if (jar.startsWith('moud-base-bridge') && jar.endsWith('.jar') && !jar.includes('-sources.jar') && !jar.includes('-javadoc.jar')) {
                const srcPath = path.join(baseBuildDir, jar);
                const destPath = path.join(destExtensionsDir, jar);
                await fs.promises.copyFile(srcPath, destPath);
                console.log(`  Included Base bridge plugin ${jar} in extensions/`);
            }
        }
    } else {
        console.log('  Base bridge plugin not built. Run: cd src/bridges/base-bridge-plugin && ./gradlew shadowJar');
    }

    // Sync Terra base packs into the Terra extension data folder
    const terraPacksSrc = path.join(projectRoot, 'docs', 'terrapacks');
    const terraPacksDest = path.join(destExtensionsDir, 'terra-bridge-plugin', 'packs');

    const packMappings = [
        { src: path.join(terraPacksSrc, 'TerraOverworldConfig'), dest: path.join(terraPacksDest, 'terra_overworld') },
        { src: path.join(terraPacksSrc, 'Tartarus'), dest: path.join(terraPacksDest, 'terra_nether') },
        { src: path.join(terraPacksSrc, 'ReimagEND'), dest: path.join(terraPacksDest, 'terra_end') }
    ];

    const copyPack = async (srcDir, destDir) => {
        if (!fs.existsSync(srcDir)) {
            console.log(`  Missing Terra pack source: ${srcDir}`);
            return;
        }
        await fs.promises.mkdir(destDir, { recursive: true });
        await fs.promises.cp(srcDir, destDir, {
            recursive: true,
            filter: (src) => !src.includes(`${path.sep}.git${path.sep}`) && !src.endsWith(`${path.sep}.git`)
        });
        console.log(`  Synced Terra pack ${srcDir} -> ${destDir}`);
    };

    for (const mapping of packMappings) {
        await copyPack(mapping.src, mapping.dest);
    }

    // Copy Polar bridge plugin if built
    const polarPluginPath = path.join(__dirname, 'src', 'bridges', 'polar-bridge-plugin', 'build', 'libs', 'moud-polar-bridge-1.0.0-BETA.jar');
    if (fs.existsSync(polarPluginPath)) {
        if (!fs.existsSync(destExtensionsDir)) {
            fs.mkdirSync(destExtensionsDir, { recursive: true });
        }
        fs.copyFileSync(polarPluginPath, path.join(destExtensionsDir, 'moud-polar-bridge-1.0.0-BETA.jar'));
        console.log('  ✓ Included Polar bridge plugin moud-polar-bridge-1.0.0-BETA.jar in extensions/');
    } else {
        console.log('  ⚠ Polar bridge plugin not built. Run: cd src/bridges/polar-bridge-plugin && ./gradlew shadowJar');
    }

    // Copy PvP bridge plugin if built
    const pvpPluginPath = path.join(__dirname, 'src', 'bridges', 'pvp-bridge-plugin', 'build', 'libs', 'moud-pvp-bridge-1.0.0-BETA.jar');
    if (fs.existsSync(pvpPluginPath)) {
        if (!fs.existsSync(destExtensionsDir)) {
            fs.mkdirSync(destExtensionsDir, { recursive: true });
        }
        fs.copyFileSync(pvpPluginPath, path.join(destExtensionsDir, 'moud-pvp-bridge-1.0.0-BETA.jar'));
        console.log('  ✓ Included PvP bridge plugin moud-pvp-bridge-1.0.0-BETA.jar in extensions/');
    } else {
        console.log('  ⚠ PvP bridge plugin not built. Run: cd src/bridges/pvp-bridge-plugin && ./gradlew shadowJar');
    }

    // CRITICAL: Copy the updated Moud server JAR to replace the old one
    const serverJarPath = path.join(__dirname, 'server', 'moud-server.jar');
    if (fs.existsSync(serverJarPath)) {
        const destServerPath = path.join(tempDir, 'server', 'moud-server.jar');
        const destServerDir = path.dirname(destServerPath);
        
        if (!fs.existsSync(destServerDir)) {
            await fs.promises.mkdir(destServerDir, { recursive: true });
        }
        
        await fs.promises.copyFile(serverJarPath, destServerPath);
        console.log('  ✓ Updated Moud server JAR with new build');
    } else {
        console.log('  ⚠ Moud server JAR not found at:', serverJarPath);
    }

    // Copy Trove bridge plugin if built
    const trovePluginPath = path.join(__dirname, 'src', 'bridges', 'trove-bridge-plugin', 'build', 'libs', 'moud-trove-bridge-1.0.0-BETA.jar');
    if (fs.existsSync(trovePluginPath)) {
        if (!fs.existsSync(destExtensionsDir)) {
            fs.mkdirSync(destExtensionsDir, { recursive: true });
        }
        fs.copyFileSync(trovePluginPath, path.join(destExtensionsDir, 'moud-trove-bridge-1.0.0-BETA.jar'));
        console.log('  ✓ Included Trove bridge plugin moud-trove-bridge-1.0.0-BETA.jar in extensions/');
    } else {
        console.log('  ⚠ Trove bridge plugin not built. Run: cd src/bridges/trove-bridge-plugin && ./gradlew shadowJar');
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
