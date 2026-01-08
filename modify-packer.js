const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

// Read the original packer source
const packerPath = path.join(__dirname, 'node_modules/@epi-studio/moud-cli/dist/services/packer.js');
let packerSource = fs.readFileSync(packerPath, 'utf8');

// Modify the packProject method to include project structure files
const modifiedPacker = packerSource.replace(
    /logger\.step\('Compressing package into a distributable zip\.\.\.\');[\s\S]*?zip\.writeZip\(zipFilePath\);[\s\S]*?logger\.success\(`Game packaged successfully!`\);[\s\S]*?logger\.info\(`Package available at: dist\/\$\{zipFileName\}`\);[\s\S]*?await fs\.promises\.rm\(buildDir, \{ recursive: true, force: true \}\);[\s\S]*?\}/s,
    `logger.step('Compressing package into a distributable zip...');
        const distDir = path.join(projectRoot, 'dist');
        await fs.promises.mkdir(distDir, { recursive: true });
        const zipFileName = \`\${gameName}-v\${gameVersion}.zip\`;
        const zipFilePath = path.join(distDir, zipFileName);

        // Add project structure files to the game directory
        logger.step('Adding project structure files...');
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
                logger.info(\`Copied \${file} to package\`);
            }
        }

        // Copy src directory if it exists
        const srcDir = path.join(projectRoot, 'src');
        if (fs.existsSync(srcDir)) {
            await fs.promises.cp(srcDir, path.join(gameDir, 'src'), { recursive: true });
            logger.info('Copied src directory to package');
        }

        // Copy assets directory if it exists
        const assetsDir = path.join(projectRoot, 'assets');
        if (fs.existsSync(assetsDir)) {
            await fs.promises.cp(assetsDir, path.join(gameDir, 'assets'), { recursive: true });
            logger.info('Copied assets directory to package');
        }

        const zip = new AdmZip();
        zip.addLocalFolder(buildDir);
        zip.writeZip(zipFilePath);
        logger.success(\`Game packaged successfully!\`);
        logger.info(\`Package available at: dist/\${zipFileName}\`);

        await fs.promises.rm(buildDir, { recursive: true, force: true });
    }`
);

// Write the modified packer
const modifiedPackerPath = path.join(__dirname, 'node_modules/@epi-studio/moud-cli/dist/services/packer.js');
fs.writeFileSync(modifiedPackerPath, modifiedPacker);

console.log('Packer modified to include project structure files');
