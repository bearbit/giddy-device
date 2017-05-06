"use strict";
/*--------------------------------------------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 *-------------------------------------------------------------------------------------------*/
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const path = require("path");
const url = require("url");
const vscode = require("vscode");
const util = require("../common/util");
const outputChannel_1 = require("../common/outputChannel");
const deviceContext_1 = require("../deviceContext");
const board_1 = require("./board");
const vscodeSettings_1 = require("./vscodeSettings");
class BoardManager {
    constructor(_settings, _arduinoApp) {
        this._settings = _settings;
        this._arduinoApp = _arduinoApp;
        this._boardStatusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 5);
        this._boardStatusBar.command = "arduino.changeBoardType";
        this._boardStatusBar.tooltip = "Change Board Type";
        this._configStatusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 4);
        this._configStatusBar.command = "arduino.showBoardConfig";
        this._configStatusBar.text = "Config";
        this._configStatusBar.tooltip = "Config Board";
    }
    loadPackages(update = false) {
        return __awaiter(this, void 0, void 0, function* () {
            this._packages = [];
            this._platforms = [];
            this._installedPlatforms = [];
            const addiontionalUrls = this.getAdditionalUrls();
            if (update) {
                yield this.setPreferenceUrls(addiontionalUrls);
                yield this._arduinoApp.initialize(true);
            }
            // Parse package index files.
            const indexFiles = ["package_index.json"].concat(addiontionalUrls);
            const rootPackgeFolder = this._settings.packagePath;
            for (const indexFile of indexFiles) {
                const indexFileName = this.getIndexFileName(indexFile);
                if (!indexFileName) {
                    continue;
                }
                if (!update && !util.fileExistsSync(path.join(rootPackgeFolder, indexFileName))) {
                    yield this.setPreferenceUrls(addiontionalUrls);
                    yield this._arduinoApp.initialize(true);
                }
                this.loadPackageContent(indexFileName);
            }
            // Load default platforms from arduino installation directory and user manually installed platforms.
            this.loadInstalledPlatforms();
            // Load all supported boards type.
            this.loadInstalledBoards();
            this.updateStatusBar();
            this._boardStatusBar.show();
        });
    }
    changeBoardType() {
        return __awaiter(this, void 0, void 0, function* () {
            const supportedBoardTypes = this.listBoards();
            if (supportedBoardTypes.length === 0) {
                vscode.window.showInformationMessage("No supported board is available.");
                return;
            }
            // TODO:? Add separator item between different platforms.
            const chosen = yield vscode.window.showQuickPick(supportedBoardTypes.map((entry) => {
                return {
                    label: entry.name,
                    description: entry.platform.name,
                    entry,
                };
            }).sort((a, b) => {
                if (a.description === b.description) {
                    return a.label === b.label ? 0 : (a.label > b.label ? 1 : -1);
                }
                else {
                    return a.description > b.description ? 1 : -1;
                }
            }), { placeHolder: "Select board type" });
            if (chosen && chosen.label) {
                this.doChangeBoardType(chosen.entry);
            }
        });
    }
    updatePackageIndex(indexUri) {
        return __awaiter(this, void 0, void 0, function* () {
            const indexFileName = this.getIndexFileName(indexUri);
            if (util.fileExistsSync(path.join(this._settings.packagePath, indexFileName))) {
                return false;
            }
            let allUrls = this.getAdditionalUrls();
            if (!(allUrls.indexOf(indexUri) >= 0)) {
                allUrls = allUrls.concat(indexUri);
                yield vscodeSettings_1.VscodeSettings.getIntance().updateAdditionalUrls(allUrls);
                yield this._arduinoApp.setPref("boardsmanager.additional.urls", this.getAdditionalUrls().join(","));
            }
            return true;
        });
    }
    doChangeBoardType(targetBoard) {
        const dc = deviceContext_1.DeviceContext.getIntance();
        dc.board = targetBoard.key;
        this._currentBoard = targetBoard;
        dc.configuration = this._currentBoard.customConfig;
        if (dc.configuration) {
            this._configStatusBar.show();
        }
        else {
            this._configStatusBar.hide();
        }
        this._boardStatusBar.text = targetBoard.name;
        this._arduinoApp.addLibPath(null);
    }
    get packages() {
        return this._packages;
    }
    get platforms() {
        return this._platforms;
    }
    get installedBoards() {
        return this._boards;
    }
    get currentBoard() {
        return this._currentBoard;
    }
    getInstalledPlatforms() {
        // Always using manually installed platforms to overwrite the same platform from arduino installation directory.
        const installedPlatforms = this.getDefaultPlatforms();
        const mergePlatform = (plat) => {
            const find = installedPlatforms.find((_plat) => {
                return _plat.packageName === plat.packageName && _plat.architecture === plat.architecture;
            });
            if (!find) {
                installedPlatforms.push(plat);
            }
            else {
                find.defaultPlatform = plat.defaultPlatform;
                find.version = plat.version;
                find.rootBoardPath = plat.rootBoardPath;
            }
        };
        const customPlatforms = this.getCustomPlatforms();
        const manuallyInstalled = this.getManuallyInstalledPlatforms();
        customPlatforms.forEach(mergePlatform);
        manuallyInstalled.forEach(mergePlatform);
        return installedPlatforms;
    }
    loadPackageContent(indexFile) {
        const indexFileName = this.getIndexFileName(indexFile);
        if (!util.fileExistsSync(path.join(this._settings.packagePath, indexFileName))) {
            return;
        }
        const packageContent = fs.readFileSync(path.join(this._settings.packagePath, indexFileName), "utf8");
        if (!packageContent) {
            return;
        }
        let rawModel = null;
        try {
            rawModel = JSON.parse(packageContent);
        }
        catch (ex) {
            outputChannel_1.arduinoChannel.error(`Invalid json file "${path.join(this._settings.packagePath, indexFileName)}".
            Suggest to remove it manually and allow boardmanager to re-download it.`);
            return;
        }
        this._packages.concat(rawModel.packages);
        rawModel.packages.forEach((pkg) => {
            pkg.platforms.forEach((plat) => {
                plat.package = pkg;
                const addedPlatform = this._platforms
                    .find((_plat) => _plat.architecture === plat.architecture && _plat.package.name === plat.package.name);
                if (addedPlatform) {
                    // union boards from all versions.
                    addedPlatform.boards = util.union(addedPlatform.boards, plat.boards, (a, b) => {
                        return a.name === b.name;
                    });
                    addedPlatform.versions.push(plat.version);
                }
                else {
                    plat.versions = [plat.version];
                    // Clear the version information since the plat will be used to contain all supported versions.
                    plat.version = "";
                    this._platforms.push(plat);
                }
            });
        });
    }
    updateInstalledPlatforms(pkgName, arch) {
        const archPath = path.join(this._settings.packagePath, "packages", pkgName, "hardware", arch);
        const allVersion = util.filterJunk(util.readdirSync(archPath, true));
        if (allVersion && allVersion.length) {
            const newPlatform = {
                packageName: pkgName,
                architecture: arch,
                version: allVersion[0],
                rootBoardPath: path.join(archPath, allVersion[0]),
                defaultPlatform: false,
            };
            const existingPlatform = this._platforms.find((_plat) => {
                return _plat.package.name === pkgName && _plat.architecture === arch;
            });
            if (existingPlatform) {
                existingPlatform.defaultPlatform = newPlatform.defaultPlatform;
                if (!existingPlatform.installedVersion) {
                    existingPlatform.installedVersion = newPlatform.version;
                    existingPlatform.rootBoardPath = newPlatform.rootBoardPath;
                    this._installedPlatforms.push(existingPlatform);
                }
                this.loadInstalledBoardsFromPlatform(existingPlatform);
            }
        }
    }
    updateStatusBar(show = true) {
        if (show) {
            this._boardStatusBar.show();
            const dc = deviceContext_1.DeviceContext.getIntance();
            const selectedBoard = this._boards.get(dc.board);
            if (selectedBoard) {
                this._currentBoard = selectedBoard;
                this._boardStatusBar.text = selectedBoard.name;
                if (dc.configuration) {
                    this._configStatusBar.show();
                    this._currentBoard.loadConfig(dc.configuration);
                }
                else {
                    this._configStatusBar.hide();
                }
            }
            else {
                this._boardStatusBar.text = "<Select Board Type>";
                this._configStatusBar.hide();
            }
        }
        else {
            this._boardStatusBar.hide();
            this._configStatusBar.hide();
        }
    }
    loadInstalledPlatforms() {
        const installed = this.getInstalledPlatforms();
        installed.forEach((platform) => {
            const existingPlatform = this._platforms.find((_plat) => {
                return _plat.package.name === platform.packageName && _plat.architecture === platform.architecture;
            });
            if (existingPlatform) {
                existingPlatform.defaultPlatform = platform.defaultPlatform;
                if (!existingPlatform.installedVersion) {
                    existingPlatform.installedVersion = platform.version;
                    existingPlatform.rootBoardPath = platform.rootBoardPath;
                    this._installedPlatforms.push(existingPlatform);
                }
            }
            else {
                platform.installedVersion = platform.version;
                this._installedPlatforms.push(platform);
            }
        });
    }
    // Default arduino package information from arduino installation directory.
    getDefaultPlatforms() {
        const defaultPlatforms = [];
        try {
            const packageBundled = fs.readFileSync(path.join(this._settings.defaultPackagePath, "package_index_bundled.json"), "utf8");
            if (!packageBundled) {
                return defaultPlatforms;
            }
            const bundledObject = JSON.parse(packageBundled);
            if (bundledObject && bundledObject.packages) {
                for (const pkg of bundledObject.packages) {
                    for (const platform of pkg.platforms) {
                        if (platform.version) {
                            defaultPlatforms.push({
                                packageName: pkg.name,
                                architecture: platform.architecture,
                                version: platform.version,
                                rootBoardPath: path.join(this._settings.defaultPackagePath, pkg.name, platform.architecture),
                                defaultPlatform: true,
                            });
                        }
                    }
                }
            }
        }
        catch (ex) {
        }
        return defaultPlatforms;
    }
    getCustomPlatforms() {
        const customPlatforms = [];
        const hardwareFolder = path.join(this._settings.sketchbookPath, "hardware");
        if (!util.directoryExistsSync(hardwareFolder)) {
            return customPlatforms;
        }
        const dirs = util.filterJunk(util.readdirSync(hardwareFolder, true)); // in Mac, filter .DS_Store file.
        if (!dirs || dirs.length < 1) {
            return customPlatforms;
        }
        for (const packageName of dirs) {
            const architectures = util.filterJunk(util.readdirSync(path.join(hardwareFolder, packageName), true));
            if (!architectures || architectures.length < 1) {
                continue;
            }
            architectures.forEach((architecture) => {
                const platformFolder = path.join(hardwareFolder, packageName, architecture);
                if (util.fileExistsSync(path.join(platformFolder, "boards.txt")) && util.fileExistsSync(path.join(platformFolder, "platform.txt"))) {
                    const configs = util.parseConfigFile(path.join(platformFolder, "platform.txt"));
                    customPlatforms.push({
                        packageName,
                        architecture,
                        version: configs.get("version"),
                        rootBoardPath: path.join(hardwareFolder, packageName, architecture),
                        defaultPlatform: false,
                    });
                }
            });
        }
        return customPlatforms;
    }
    // User manually installed packages.
    getManuallyInstalledPlatforms() {
        const manuallyInstalled = [];
        const rootPackagePath = path.join(path.join(this._settings.packagePath, "packages"));
        if (!util.directoryExistsSync(rootPackagePath)) {
            return manuallyInstalled;
        }
        const dirs = util.filterJunk(util.readdirSync(rootPackagePath, true)); // in Mac, filter .DS_Store file.
        for (const packageName of dirs) {
            const archPath = path.join(this._settings.packagePath, "packages", packageName, "hardware");
            if (!util.directoryExistsSync(archPath)) {
                continue;
            }
            const architectures = util.filterJunk(util.readdirSync(archPath, true));
            architectures.forEach((architecture) => {
                const allVersion = util.filterJunk(util.readdirSync(path.join(archPath, architecture), true));
                if (allVersion && allVersion.length) {
                    manuallyInstalled.push({
                        packageName,
                        architecture,
                        version: allVersion[0],
                        rootBoardPath: path.join(archPath, architecture, allVersion[0]),
                        defaultPlatform: false,
                    });
                }
            });
        }
        return manuallyInstalled;
    }
    loadInstalledBoards() {
        this._boards = new Map();
        this._installedPlatforms.forEach((plat) => {
            this.loadInstalledBoardsFromPlatform(plat);
        });
    }
    loadInstalledBoardsFromPlatform(plat) {
        const dir = plat.rootBoardPath;
        if (util.fileExistsSync(path.join(plat.rootBoardPath, "boards.txt"))) {
            const boardContent = fs.readFileSync(path.join(plat.rootBoardPath, "boards.txt"), "utf8");
            const res = board_1.parseBoardDescriptor(boardContent, plat);
            res.forEach((bd) => {
                this._boards.set(bd.key, bd);
            });
        }
    }
    listBoards() {
        const result = [];
        this._boards.forEach((b) => {
            result.push(b);
        });
        return result;
    }
    getIndexFileName(uriString) {
        if (!uriString) {
            return;
        }
        const normalizedUrl = url.parse(uriString);
        if (!normalizedUrl) {
            return;
        }
        return normalizedUrl.pathname.substr(normalizedUrl.pathname.lastIndexOf("/") + 1);
    }
    getAdditionalUrls() {
        function formatUrls(urls) {
            if (urls) {
                if (!Array.isArray(urls) && typeof urls === "string") {
                    return urls.split(",");
                }
                return urls;
            }
            return [];
        }
        // For better compatibility, merge urls both in user settings and arduino IDE preferences.
        const settingsUrls = formatUrls(vscodeSettings_1.VscodeSettings.getIntance().additionalUrls);
        let preferencesUrls = [];
        const preferences = this._settings.preferences;
        if (preferences && preferences.has("boardsmanager.additional.urls")) {
            preferencesUrls = formatUrls(preferences.get("boardsmanager.additional.urls"));
        }
        return util.union(settingsUrls, preferencesUrls);
    }
    setPreferenceUrls(addiontionalUrls) {
        return __awaiter(this, void 0, void 0, function* () {
            const settingsUrls = addiontionalUrls.join(",");
            if (this._settings.preferences.get("boardsmanager.additional.urls") !== settingsUrls) {
                yield this._arduinoApp.setPref("boardsmanager.additional.urls", settingsUrls);
            }
        });
    }
}
exports.BoardManager = BoardManager;

//# sourceMappingURL=boardManager.js.map
