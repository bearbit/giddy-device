"use strict";
/*--------------------------------------------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 *-------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const path = require("path");
const vscode = require("vscode");
const constants = require("../common/constants");
const util = require("../common/util");
class CompletionProvider {
    constructor(_arduinoApp) {
        this._arduinoApp = _arduinoApp;
        this._headerFiles = new Set();
        this._libPaths = new Set();
        if (vscode.workspace && vscode.workspace.rootPath) {
            this._cppConfigFile = path.join(vscode.workspace.rootPath, constants.CPP_CONFIG_FILE);
            this.updateLibList();
            this._watcher = vscode.workspace.createFileSystemWatcher(this._cppConfigFile);
            this._watcher.onDidCreate(() => this.updateLibList());
            this._watcher.onDidChange(() => this.updateLibList());
            this._watcher.onDidDelete(() => this.updateLibList());
        }
    }
    provideCompletionItems(document, position, token) {
        // Check if we are currently inside an include statement.
        const text = document.lineAt(position.line).text.substr(0, position.character);
        const match = text.match(/^\s*#\s*include\s*(<[^>]*|"[^"]*)$/);
        if (match) {
            const result = [];
            this._headerFiles.forEach((headerFile) => {
                result.push(new vscode.CompletionItem(headerFile, vscode.CompletionItemKind.File));
            });
            return result;
        }
    }
    updateLibList() {
        this._libPaths.clear();
        this._headerFiles.clear();
        this._arduinoApp.getDefaultPackageLibPaths().forEach((defaultPath) => {
            this._libPaths.add(defaultPath);
        });
        if (fs.existsSync(this._cppConfigFile)) {
            const deviceConfig = util.tryParseJSON(fs.readFileSync(this._cppConfigFile, "utf8"));
            if (deviceConfig) {
                if (deviceConfig.sketch) {
                    const appFolder = path.dirname(deviceConfig.sketch);
                    if (util.directoryExistsSync(appFolder)) {
                        this._libPaths.add(path.normalize(appFolder));
                    }
                }
                if (deviceConfig.configurations) {
                    const plat = util.getCppConfigPlatform();
                    deviceConfig.configurations.forEach((configSection) => {
                        if (configSection.name === plat && Array.isArray(configSection.includePath)) {
                            configSection.includePath.forEach((includePath) => {
                                this._libPaths.add(path.normalize(includePath));
                            });
                        }
                    });
                }
            }
        }
        this._libPaths.forEach((includePath) => {
            this.addLibFiles(includePath);
        });
    }
    addLibFiles(libPath) {
        if (!util.directoryExistsSync(libPath)) {
            return;
        }
        const subItems = fs.readdirSync(libPath);
        subItems.forEach((item) => {
            try {
                const state = fs.statSync(path.join(libPath, item));
                if (state.isFile() && item.endsWith(".h")) {
                    this._headerFiles.add(item);
                }
                else if (state.isDirectory()) {
                    this.addLibFiles(path.join(libPath, item));
                }
            }
            catch (ex) {
            }
        });
    }
}
exports.CompletionProvider = CompletionProvider;

//# sourceMappingURL=completionProvider.js.map
