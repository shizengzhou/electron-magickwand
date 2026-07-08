# electron-magickwand

[简体中文](./README.md) | English

A fork of [magickwand.js](https://github.com/mmomtchev/magickwand.js) adapted for Electron native modules via AI.

## Usage

### Method 1: Git clone + npm link

```shell
git clone --recursive https://github.com/shizengzhou/electron-magickwand

cd electron-magickwand

npm install --build-from-source --enable-conan --regenerate
```

Then use via `npm link` in your Electron project:

```shell
# In electron-magickwand directory
npm link

# In your Electron project
npm link electron-magickwand
npm install --save-dev @electron/rebuild

# Rebuild for Electron ABI
./node_modules/.bin/electron-rebuild -w electron-magickwand
```

### Method 2: Direct install

```shell
npm install electron-magickwand --build-from-source --enable-conan --regenerate

npm install --save-dev @electron/rebuild

./node_modules/.bin/electron-rebuild -w electron-magickwand
```
