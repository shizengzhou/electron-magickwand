# electron-magickwand

A native module for Electron, adapted from [magickwand.js](https://github.com/mmomtchev/magickwand.js) using AI.

## Usage

### Method 1

```shell
git clone --recursive https://github.com/shizengzhou/electron-magickwand

cd electron-magickwand

npm install --build-from-source --enable-conan --regenerate
```

Then use it in your Electron project via `link`, install `@electron/rebuild` in the Electron project, and rebuild the module:

```shell
npm install --save-dev @electron/rebuild

./node_modules/.bin/electron-rebuild -w electron-magickwand
```

### Method 2

```shell
npm install electron-magickwand --build-from-source --enable-conan --regenerate
```

```shell
npm install --save-dev @electron/rebuild

./node_modules/.bin/electron-rebuild -w electron-magickwand
```
