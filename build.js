const fs = require('fs');
const path = require('path');

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

        // Copy JAR libraries to server folder
        if (fs.existsSync(path.join(__dirname, 'libs'))) {
            this.copyDirectory(
                path.join(__dirname, 'libs'),
                path.join(this.buildDir, 'server')
            );
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
