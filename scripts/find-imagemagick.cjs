/**
 * Finds ImageMagick and delegate library paths for node-gyp.
 * Scans preconf/ (CMake build) + Conan cache delegate libs.
 *
 * Usage:
 *   node scripts/find-imagemagick.cjs libdir     → library directories (space-separated for <!@)
 *   node scripts/find-imagemagick.cjs libraries  → IM + delegate lib names (space-separated for <!@)
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PRECONF = path.join(ROOT, 'preconf');
const CONAN_HOME = process.env.CONAN_HOME || path.join(process.env.USERPROFILE || 'C:\\Users', '.conan2');

// MSVC-built static libs: normally .lib, but Meson-built packages output .a (still valid MSVC format)
function isLibFile(name) {
  return name.endsWith('.lib') || name.endsWith('.a');
}

// Find all .lib/.a files and their directories in a tree
function findAllLibDirs(baseDir, maxDepth) {
  const dirs = new Set();
  if (!fs.existsSync(baseDir)) return dirs;

  function walk(dir, depth) {
    if (maxDepth && depth > maxDepth) return;
    let items;
    try { items = fs.readdirSync(dir); } catch { return; }
    for (const item of items) {
      if (item.startsWith('.')) continue;
      const p = path.join(dir, item);
      try {
        const st = fs.statSync(p);
        if (st.isDirectory() && item !== 'CMakeFiles') {
          walk(p, depth + 1);
        } else if (st.isFile() && isLibFile(item)) {
          dirs.add(dir);
        }
      } catch { /* skip */ }
    }
  }

  walk(baseDir, 0);
  return dirs;
}

// Find IM core name → filename mapping
function findCoreLibs(dirs) {
  const libs = {};
  for (const d of dirs) {
    try {
      for (const f of fs.readdirSync(d)) {
        if (f.includes('Magick++') && isLibFile(f)) libs.magickpp = f;
        if (f.includes('MagickCore') && isLibFile(f)) libs.magickcore = f;
        if (f.includes('MagickWand') && isLibFile(f)) libs.magickwand = f;
      }
    } catch { /* skip */ }
  }
  return libs;
}

// Find ALL .lib names across all dirs
function findAllLibNames(allDirs) {
  const names = new Set();
  for (const d of allDirs) {
    try {
      for (const f of fs.readdirSync(d)) {
        if (isLibFile(f) && !f.endsWith('.exp'))
          names.add(f);
      }
    } catch { /* skip */ }
  }
  const core = [...names].filter(n => n.includes('Magick'));
  const delegates = [...names].filter(n => !n.includes('Magick'));
  return [...core, ...delegates];
}

// Scan Conan cache for delegate .lib files.
// Conan v2 stores built binaries in: ~/.conan2/p/b/<hash>/p/lib/*.lib
// (the top-level p/ dir holds recipes, p/b/ holds built packages)
function findConanDelegateDirs() {
  const dirs = new Set();

  // Try built packages at p/b/ first (main location for .lib files)
  const conanBuildDir = path.join(CONAN_HOME, 'p', 'b');
  if (fs.existsSync(conanBuildDir)) {
    try {
      for (const item of fs.readdirSync(conanBuildDir)) {
        const libDir = path.join(conanBuildDir, item, 'p', 'lib');
        try {
          if (fs.statSync(libDir).isDirectory()) {
            const files = fs.readdirSync(libDir);
            if (files.some(f => isLibFile(f))) dirs.add(libDir);
          }
        } catch { /* skip */ }
      }
    } catch { /* skip */ }
  }

  // Also check top-level p/ (some packages unpack there)
  const conanPkg = path.join(CONAN_HOME, 'p');
  try {
    for (const item of fs.readdirSync(conanPkg)) {
      if (item === 'b' || item.startsWith('cache')) continue;
      const libDir = path.join(conanPkg, item, 'p', 'lib');
      try {
        if (fs.statSync(libDir).isDirectory()) {
          const files = fs.readdirSync(libDir);
          if (files.some(f => isLibFile(f))) dirs.add(libDir);
        }
      } catch { /* skip */ }
    }
  } catch { /* skip */ }

  return dirs;
}

// 1. IM core libs from preconf
const preconfDirs = findAllLibDirs(PRECONF, 4);
const coreLibs = findCoreLibs(preconfDirs);

// 2. Conan delegate libs
const conanDirs = findConanDelegateDirs();

// Merge all directories
const allDirs = new Set([...preconfDirs, ...conanDirs]);

const mode = process.argv[2] || 'libdir';

if (!coreLibs.magickpp || !coreLibs.magickcore) {
  if (mode === 'libdir') process.stdout.write('');
  else process.stdout.write('Magick++-7.Q16HDRI.lib MagickWand-7.Q16HDRI.lib MagickCore-7.Q16HDRI.lib');
  process.exit(0);
}

switch (mode) {
  case 'libdir': {
    process.stdout.write([...allDirs].map(d => d.replace(/\\/g, '/')).join(' '));
    break;
  }
  case 'libraries': {
    const libNames = findAllLibNames(allDirs);
    process.stdout.write(libNames.join(' '));
    break;
  }
}
