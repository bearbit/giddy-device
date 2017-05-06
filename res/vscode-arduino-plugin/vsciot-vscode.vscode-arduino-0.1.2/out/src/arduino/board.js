"use strict";
/*--------------------------------------------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 *-------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const deviceContext_1 = require("../deviceContext");
function parseBoardDescriptor(boardDescriptor, plat) {
    const boardLineRegex = /([^\.]+)\.(\S+)=(.+)/;
    const result = new Map();
    const lines = boardDescriptor.split(/[\r|\r\n|\n]/);
    const menuMap = new Map();
    lines.forEach((line) => {
        // Ignore comments.
        if (line.startsWith("#")) {
            return;
        }
        const match = boardLineRegex.exec(line);
        if (match && match.length > 3) {
            if (line.startsWith("menu.")) {
                menuMap.set(match[2], match[3]);
                return;
            }
            let boardObject = result.get(match[1]);
            if (!boardObject) {
                boardObject = new Board(match[1], plat, new Map(), menuMap);
                result.set(boardObject.board, boardObject);
            }
            if (match[2] === "name") {
                boardObject.name = match[3].trim();
            }
            else {
                boardObject.addParameter(match[2], match[3]);
            }
        }
    });
    return result;
}
exports.parseBoardDescriptor = parseBoardDescriptor;
const MENU_REGEX = /menu\.([^\.]+)\.([^\.]+)(\.?(\S+)?)/;
class Board {
    constructor(_board, _platform, _parameters, _menuMap) {
        this._menuMap = _menuMap;
        this.platform = _platform;
        this.board = _board;
        this._configItems = [];
    }
    addParameter(key, value) {
        const match = key.match(MENU_REGEX);
        if (match) {
            const existingItem = this._configItems.find((item) => item.id === match[1]);
            if (existingItem) {
                if (!existingItem.selectedOption) {
                    existingItem.selectedOption = match[2];
                }
                const existingOption = existingItem.options.find((opt) => opt.id === match[2]);
                if (!existingOption) {
                    existingItem.options.push({ id: match[2], displayName: value });
                }
            }
            else {
                this._configItems.push({
                    displayName: this._menuMap.get(match[1]),
                    id: match[1],
                    selectedOption: match[2],
                    options: [{ id: match[2], displayName: value }],
                });
            }
        }
    }
    getBuildConfig() {
        const config = this.customConfig;
        const res = `${this.getPackageName()}:${this.platform.architecture}:${this.board}${config ? ":" + config : ""}`;
        return res;
    }
    /**
     * @returns {string} Return board key in format packageName:arch:boardName
     */
    get key() {
        return `${this.getPackageName()}:${this.platform.architecture}:${this.board}`;
    }
    get customConfig() {
        let res;
        if (this._configItems && this._configItems.length > 0) {
            res = this._configItems.map((configItem) => `${configItem.id}=${configItem.selectedOption}`).join(",");
        }
        return res;
    }
    get configItems() {
        return this._configItems;
    }
    loadConfig(configString) {
        const configSections = configString.split(",");
        const keyValueRegex = /(\S+)=(\S+)/;
        configSections.forEach((configSection) => {
            const match = configSection.match(keyValueRegex);
            if (match && match.length >= 2) {
                this.updateConfig(match[1], match[2]);
            }
        });
    }
    updateConfig(configId, optionId) {
        const targetConfig = this._configItems.find((config) => config.id === configId);
        if (!targetConfig) {
            return false;
        }
        targetConfig.selectedOption = optionId;
        const dc = deviceContext_1.DeviceContext.getIntance();
        dc.configuration = this.customConfig;
        return true;
    }
    getPackageName() {
        return this.platform.packageName ? this.platform.packageName : this.platform.package.name;
    }
}
exports.Board = Board;

//# sourceMappingURL=board.js.map
