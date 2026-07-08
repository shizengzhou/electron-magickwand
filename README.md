# electron-magickwand

[English](./README.en.md) | 简体中文

通过 AI 将 [magickwand.js](https://github.com/mmomtchev/magickwand.js) 改成支持 electron 的原生模块

## 使用

### 第一种方式

```shell
git clone --recursive https://github.com/shizengzhou/electron-magickwand

cd electron-magickwand

npm install --build-from-source --enable-conan --regenerate
```
然后在 electron 项目中通过 `link` 使用，在 electron 项目中安装 `@electron/rebuild`，然后编译模块

```shell
npm install --save-dev @electron/rebuild

./node_modules/.bin/electron-rebuild -w electron-magickwand
```
### 第二种方式

```shell
npm install electron-magickwand --build-from-source --enable-conan --regenerate
```

```shell
npm install --save-dev @electron/rebuild

./node_modules/.bin/electron-rebuild -w electron-magickwand
```
