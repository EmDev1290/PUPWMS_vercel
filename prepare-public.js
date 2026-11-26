/**
 * Prepare Public Assets for Firebase Hosting
 * 
 * Assembles the 'public/' directory required by Firebase Hosting:
 * - Copies Frontend pages to public root and public/Frontend/
 * - Copies JS/ and style/ asset folders
 */
const fs = require('fs');
const path = require('path');

const rootDir = __dirname;
const publicDir = path.join(rootDir, 'public');

function copyFolderSync(from, to) {
    if (!fs.existsSync(to)) {
        fs.mkdirSync(to, { recursive: true });
    }
    const entries = fs.readdirSync(from, { withFileTypes: true });
    for (const entry of entries) {
        const srcPath = path.join(from, entry.name);
        const destPath = path.join(to, entry.name);
        if (entry.isDirectory()) {
            copyFolderSync(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

console.log('📦 Preparing static assets for Firebase Hosting...');

// 1. Create public directory
if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
}

// 2. Copy Frontend/ to public/Frontend/
copyFolderSync(path.join(rootDir, 'Frontend'), path.join(publicDir, 'Frontend'));

// 3. Copy HTML files to public root as well (for direct /dashboard.html resolution)
const frontendFiles = fs.readdirSync(path.join(rootDir, 'Frontend'));
for (const file of frontendFiles) {
    if (file.endsWith('.html')) {
        fs.copyFileSync(path.join(rootDir, 'Frontend', file), path.join(publicDir, file));
    }
}

// 4. Copy JS/ and style/
copyFolderSync(path.join(rootDir, 'JS'), path.join(publicDir, 'JS'));
copyFolderSync(path.join(rootDir, 'style'), path.join(publicDir, 'style'));

// 5. Ensure favicon exists in public root
if (fs.existsSync(path.join(rootDir, 'style', 'PUP LOGO.png'))) {
    fs.copyFileSync(path.join(rootDir, 'style', 'PUP LOGO.png'), path.join(publicDir, 'favicon.ico'));
}

console.log('✅ Public directory assembled successfully at ./public');
