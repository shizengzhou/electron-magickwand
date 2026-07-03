const path = require('path');
const os = require('os');

// node-gyp outputs to build/Release/ by default (build/Debug/ for debug builds)
const buildType = process.env.NODE_ENV === 'development' ? 'Debug' : 'Release';
let binding_path = path.resolve(__dirname, '..', 'build', buildType, 'magickwand.node');

// If not found in platform-specific path, try Release
try {
  require.resolve(binding_path);
} catch {
  binding_path = path.resolve(__dirname, '..', 'build', 'Release', 'magickwand.node');
}

// Set up platform-specific environment for fontconfig
switch (os.platform()) {
  case 'linux':
    // On Linux, this is (almost) always there - or otherwise you don't have fonts anyway
    process.env['FONTCONFIG_FILE'] = '/etc/fonts/fonts.conf';
    process.env['FONTCONFIG_PATH'] = '/etc/fonts';
    break;
  case 'darwin':
    // On macOS, this requires fontconfig from Homebrew - or otherwise font aliases wont work
    process.env['FONTCONFIG_FILE'] = '/usr/local/etc/fonts/fonts.conf';
    process.env['FONTCONFIG_PATH'] = '/usr/local/etc/fonts';
    break;
}

// MAGICK_HOME: point to the ImageMagick config directory
process.env['MAGICK_HOME'] = path.resolve(__dirname, '..', 'deps', 'ImageMagick', 'config');

const dll = require(binding_path);

// Proper implementation of the iterator protocol is very hard in C++
// This is something that is best done in JS

// List of the iterable classes
const iterables = [
  dll.std.coderInfoArray
];

// A generic iterator
const iterator = function () {
  if (!this) throw new Error('Invalid invocation');

  let idx = 0;
  const size = this.size();
  const iterable = this;

  const next = () => {
    if (idx < size) {
      return {
        done: false,
        value: iterable.get(idx++),
        next
      };
    }

    return {
      done: true,
      value: null,
      next
    };
  };

  return {
    next
  };
};

// Install the iterators
for (const i of iterables) {
  i.prototype[Symbol.iterator] = iterator;
}

module.exports = dll;
