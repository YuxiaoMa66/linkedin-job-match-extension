const fs = require('fs');
const path = require('path');

const projectRoot = path.join(__dirname);
const publicDir = path.join(projectRoot, 'public');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function copyFile(src, dest) {
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log(`Copied: ${path.basename(src)} -> ${dest}`);
  } else {
    console.error(`Missing source file: ${src}`);
  }
}

function copyDir(src, dest) {
  ensureDir(dest);
  if (fs.existsSync(src)) {
    fs.readdirSync(src).forEach(file => {
      const srcFile = path.join(src, file);
      const destFile = path.join(dest, file);
      if (fs.lstatSync(srcFile).isDirectory()) {
        copyDir(srcFile, destFile);
      } else {
        copyFile(srcFile, destFile);
      }
    });
  }
}

// 1. Create public directory structures
ensureDir(path.join(publicDir, 'assets/icons'));
ensureDir(path.join(publicDir, 'data'));
ensureDir(path.join(publicDir, 'lib'));

// 2. Move existing files to public (if they are not already there)
copyFile(path.join(projectRoot, 'manifest.json'), path.join(publicDir, 'manifest.json'));
copyFile(path.join(projectRoot, 'data', 'ind_sponsors.json'), path.join(publicDir, 'data', 'ind_sponsors.json'));
copyDir(path.join(projectRoot, 'assets', 'icons'), path.join(publicDir, 'assets', 'icons'));

// 3. Copy dependencies to public/lib
const pdfjsSrc = path.join(projectRoot, 'node_modules', 'pdfjs-dist', 'build');
copyFile(path.join(pdfjsSrc, 'pdf.min.mjs'), path.join(publicDir, 'lib', 'pdf.min.mjs'));
copyFile(path.join(pdfjsSrc, 'pdf.worker.min.mjs'), path.join(publicDir, 'lib', 'pdf.worker.min.mjs'));
copyFile(path.join(pdfjsSrc, 'pdf.min.mjs'), path.join(publicDir, 'lib', 'pdf.mjs'));
copyFile(path.join(pdfjsSrc, 'pdf.worker.min.mjs'), path.join(publicDir, 'lib', 'pdf.worker.mjs'));

const mammothSrc = path.join(projectRoot, 'node_modules', 'mammoth');
copyFile(path.join(mammothSrc, 'mammoth.browser.min.js'), path.join(publicDir, 'lib', 'mammoth.browser.min.js'));

console.log('Public setup complete.');
