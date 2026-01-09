const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Build script for Endless Dimensions mod
class Builder {
    constructor() {
        this.srcDir = path.join(__dirname, 'src');
        this.distDir = path.join(__dirname, 'dist');
        this.buildDir = path.join(__dirname, 'build');
    }

    async build() {
        console.log('🔨 Building Endless Dimensions Mod...');

        try {
            // Build Terra bridge plugin first
            await this.buildTerraPlugin();

            // Build Polar bridge plugin
            await this.buildPolarPlugin();

            // Clean previous builds
            await this.clean();

            // Create directories
            await this.createDirectories();

            // Copy static files
            await this.copyStaticFiles();

            // Generate mod metadata
            await this.generateMetadata();

            console.log('✅ Build completed successfully!');
            console.log(`📦 Output: ${this.buildDir}`);

        } catch (error) {
            console.error('❌ Build failed:', error);
            process.exit(1);
        }
    }

    async buildTerraPlugin() {
        console.log('🌍 Building Terra bridge plugin...');
        
        const terraPluginDir = path.join(__dirname, 'terra-bridge-plugin');
        
        if (!fs.existsSync(terraPluginDir)) {
            console.log('  ⚠ Terra bridge plugin directory not found, skipping...');
            return;
        }
        
        try {
            // Check if Gradle wrapper exists
            const gradlewWrapper = process.platform === 'win32' ? 'gradlew.bat' : './gradlew';
            const gradlewPath = path.join(terraPluginDir, gradlewWrapper);
            
            if (!fs.existsSync(gradlewPath)) {
                console.log('  ⚠ Gradle wrapper not found, skipping Terra plugin build...');
                return;
            }
            
            // Build the Terra bridge plugin
            console.log('  📦 Building Terra bridge plugin with Gradle...');
            execSync(gradlewWrapper + ' shadowJar', {
                cwd: terraPluginDir,
                stdio: 'inherit'
            });
            
            console.log('  ✅ Terra bridge plugin built successfully');
            
        } catch (error) {
            console.warn('  ⚠ Terra bridge plugin build failed:', error.message);
            console.log('  💡 Run manually: cd terra-bridge-plugin && ./gradlew shadowJar');
        }
    }

    async buildPolarPlugin() {
        console.log('🧊 Building Polar bridge plugin...');
        
        const polarPluginDir = path.join(__dirname, 'polar-bridge-plugin');
        
        if (!fs.existsSync(polarPluginDir)) {
            console.log('  ⚠ Polar bridge plugin directory not found, skipping...');
            return;
        }
        
        try {
            // Build the Polar bridge plugin using Gradle
            console.log('  📦 Building Polar bridge plugin with Gradle...');
            execSync('./gradlew shadowJar', { cwd: polarPluginDir, stdio: 'inherit' });
            
            // Copy the built JAR to the plugins directory
            const polarJarPath = path.join(polarPluginDir, 'build', 'libs', 'moud-polar-bridge-1.0.0-BETA.jar');
            const pluginsDir = path.join(this.buildDir, 'plugins');
            
            // Ensure plugins directory exists
            if (!fs.existsSync(pluginsDir)) {
                fs.mkdirSync(pluginsDir, { recursive: true });
            }
            
            if (fs.existsSync(polarJarPath)) {
                fs.copyFileSync(polarJarPath, path.join(pluginsDir, 'moud-polar-bridge-1.0.0-BETA.jar'));
                console.log('  ✅ Polar bridge plugin built and copied successfully');
            } else {
                console.log('  ⚠ Polar bridge plugin JAR not found, skipping...');
            }
            
        } catch (error) {
            console.error('  ❌ Failed to build Polar bridge plugin:', error.message);
            console.log('  ⚠ Continuing build without Polar bridge plugin...');
        }
    }

    async clean() {
        console.log('🧹 Cleaning previous builds...');

        if (fs.existsSync(this.distDir)) {
            fs.rmSync(this.distDir, { recursive: true });
        }

        if (fs.existsSync(this.buildDir)) {
            fs.rmSync(this.buildDir, { recursive: true });
        }
    }

    async createDirectories() {
        console.log('📁 Creating directories...');

        fs.mkdirSync(this.distDir, { recursive: true });
        fs.mkdirSync(this.buildDir, { recursive: true });
        fs.mkdirSync(path.join(this.buildDir, 'assets'), { recursive: true });
        fs.mkdirSync(path.join(this.buildDir, 'data'), { recursive: true });
    }

    async copyStaticFiles() {
        console.log('📋 Copying static files...');

        // Copy compiled TypeScript files
        if (fs.existsSync(this.distDir)) {
            this.copyDirectory(this.distDir, this.buildDir);
        }

        // Copy mod metadata
        fs.copyFileSync(
            path.join(__dirname, 'moud.json'),
            path.join(this.buildDir, 'moud.json')
        );

        // Copy README
        if (fs.existsSync(path.join(__dirname, 'README.md'))) {
            fs.copyFileSync(
                path.join(__dirname, 'README.md'),
                path.join(this.buildDir, 'README.md')
            );
        }

        // Copy LICENSE
        if (fs.existsSync(path.join(__dirname, 'LICENSE'))) {
            fs.copyFileSync(
                path.join(__dirname, 'LICENSE'),
                path.join(this.buildDir, 'LICENSE')
            );
        }

        // Copy custom block resources
        if (fs.existsSync(path.join(__dirname, 'src', 'resources'))) {
            this.copyDirectory(
                path.join(__dirname, 'src', 'resources'),
                path.join(this.buildDir, 'resources')
            );
        }

        // NEW: Copy data directory
        if (fs.existsSync(path.join(__dirname, 'src', 'data'))) {
            this.copyDirectory(
                path.join(__dirname, 'src', 'data'),
                path.join(this.buildDir, 'data')
            );
        }

        // Copy JAR libraries to mods folder (Moud 0.7.x scans /mods for mod jars)
        if (fs.existsSync(path.join(__dirname, 'libs'))) {
            this.copyDirectory(
                path.join(__dirname, 'libs'),
                path.join(this.buildDir, 'mods')
            );
        }

        // Copy Terra bridge plugin to plugins folder
        const terraBuildDir = path.join(__dirname, 'terra-bridge-plugin', 'build', 'libs');
        if (fs.existsSync(terraBuildDir)) {
            const pluginsDir = path.join(this.buildDir, 'plugins');
            fs.mkdirSync(pluginsDir, { recursive: true });

            const terraJars = fs.readdirSync(terraBuildDir);
            for (const jar of terraJars) {
                if (jar.startsWith('moud-terra-bridge') && jar.endsWith('.jar') && 
                    !jar.includes('-sources.jar') && !jar.includes('-javadoc.jar')) {
                    fs.copyFileSync(
                        path.join(terraBuildDir, jar),
                        path.join(pluginsDir, jar)
                    );
                    console.log(`  ✓ Copied Terra bridge plugin ${jar} to plugins/`);
                }
            }
        }
    }

    async generateMetadata() {
        console.log('📄 Generating mod metadata...');

        // Create pack.mcmeta for resource pack compatibility
        const packMcmeta = {
            pack: {
                pack_format: 12,
                description: 'Endless Dimensions - Unlimited block possibilities for infinite worlds'
            }
        };

        fs.writeFileSync(
            path.join(this.buildDir, 'pack.mcmeta'),
            JSON.stringify(packMcmeta, null, 2)
        );

        // Create mod info file
        const modInfo = {
            modId: 'endlessdimensions',
            name: 'Endless Dimensions',
            version: '1.0.0',
            description: 'A Minecraft mod that replicates 20w14infinite snapshot mechanics with unlimited block possibilities',
            author: 'EndlessDimensions',
            dependencies: [],
            mixins: [],
            entrypoints: {
                main: 'index.js'
            }
        };

        fs.writeFileSync(
            path.join(this.buildDir, 'mod.info.json'),
            JSON.stringify(modInfo, null, 2)
        );
    }

    copyDirectory(src, dest) {
        const entries = fs.readdirSync(src, { withFileTypes: true });

        for (const entry of entries) {
            const srcPath = path.join(src, entry.name);
            const destPath = path.join(dest, entry.name);

            if (entry.isDirectory()) {
                fs.mkdirSync(destPath, { recursive: true });
                this.copyDirectory(srcPath, destPath);
            } else {
                fs.copyFileSync(srcPath, destPath);
            }
        }
    }
}

// Run the build
const builder = new Builder();
builder.build();
