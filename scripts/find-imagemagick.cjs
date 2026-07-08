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
const PREBUILT_LIB = path.join(ROOT, 'lib', 'binding', `${process.platform}-${process.arch}`, 'lib');
const CONAN_HOME = process.env.CONAN_HOME || path.join(process.env.USERPROFILE || 'C:\\Users', '.conan2');
const HADRON_HOME = process.env.LOCALAPPDATA
  ? path.join(process.env.LOCALAPPDATA, 'hadron')
  : path.join(process.env.USERPROFILE || 'C:\\Users', 'AppData', 'Local', 'hadron');

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
        if ((f.includes('Magick++') || f.includes('Magick___')) && isLibFile(f)) libs.magickpp = f;
        if (f.includes('MagickCore') && isLibFile(f)) libs.magickcore = f;
        if (f.includes('MagickWand') && isLibFile(f)) libs.magickwand = f;
      }
    } catch { /* skip */ }
  }
  return libs;
}

// Deduplicate libs with the same base name, keeping the highest version.
// e.g. Iex-3_3.lib + Iex-3_4.lib → keep only Iex-3_4.lib
function dedupLibNames(names) {
  const map = new Map(); // baseName → { name, version }
  for (const name of names) {
    const m = name.match(/^(.+?)(?:-(\d[\d_]*(?:\d|a|b|rc)\d*))?\.(?:lib|a)$/);
    if (!m) continue;
    const base = m[1].toLowerCase();
    const ver = (m[2] || '0').replace(/_/g, '.');
    const existing = map.get(base);
    if (!existing || compareVersions(ver, existing.ver) > 0) {
      map.set(base, { name, ver });
    }
  }
  return [...map.values()].map(v => v.name);
}

function compareVersions(a, b) {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const va = pa[i] || 0, vb = pb[i] || 0;
    if (va !== vb) return va - vb;
  }
  return 0;
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
  const deduped = dedupLibNames([...names]);
  const core = deduped.filter(n => n.includes('Magick'));
  const delegates = deduped.filter(n => !n.includes('Magick'));
  return [...core, ...delegates];
}

// Scan a cache directory for delegate .lib/.a files.
// Supports both ~/.conan2 (standard Conan) and %LOCALAPPDATA%/hadron (xpm/hadron)
function scanCacheDir(basePath) {
  const dirs = new Set();
  if (!fs.existsSync(basePath)) return dirs;

  // Try built packages at p/b/ first (main location for .lib files)
  const buildDir = path.join(basePath, 'p', 'b');
  if (fs.existsSync(buildDir)) {
    try {
      for (const item of fs.readdirSync(buildDir)) {
        const libDir = path.join(buildDir, item, 'p', 'lib');
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
  const pkgDir = path.join(basePath, 'p');
  try {
    for (const item of fs.readdirSync(pkgDir)) {
      if (item === 'b' || item.startsWith('cache')) continue;
      const libDir = path.join(pkgDir, item, 'p', 'lib');
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

function findConanDelegateDirs() {
  const dirs = scanCacheDir(CONAN_HOME);
  const hadronDirs = scanCacheDir(HADRON_HOME);
  return new Set([...dirs, ...hadronDirs]);
}

// 1. IM core libs from preconf + prebuilt + meson
const preconfDirs = findAllLibDirs(PRECONF, 4);
const prebuiltDirs = findAllLibDirs(PREBUILT_LIB, 2);
// Also find .a files from Meson's ninja build (build/native/deps/ImageMagick/)
const mesonDir = path.join(ROOT, 'build', 'native', 'deps', 'ImageMagick');
const allIMDirs = new Set([...preconfDirs, ...prebuiltDirs]);
if (fs.existsSync(mesonDir)) findAllLibDirs(mesonDir, 1).forEach(d => allIMDirs.add(d));
const coreLibs = findCoreLibs(allIMDirs);

// 2. Conan delegate libs
const conanDirs = findConanDelegateDirs();

// Merge all directories
const allDirs = new Set([...allIMDirs, ...conanDirs]);

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
