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
const vscode = require("vscode");
class VscodeSettings {
    static getIntance() {
        if (!VscodeSettings._instance) {
            VscodeSettings._instance = new VscodeSettings();
        }
        return VscodeSettings._instance;
    }
    constructor() {
    }
    get arduinoPath() {
        const workspaceConfig = vscode.workspace.getConfiguration();
        return workspaceConfig.get("arduino.path");
    }
    get additionalUrls() {
        const workspaceConfig = vscode.workspace.getConfiguration();
        return workspaceConfig.get("arduino.additionalUrls");
    }
    updateAdditionalUrls(value) {
        return __awaiter(this, void 0, void 0, function* () {
            const workspaceConfig = vscode.workspace.getConfiguration();
            yield workspaceConfig.update("arduino.additionalUrls", value, true);
        });
    }
    get autoUpdateIndexFiles() {
        const workspaceConfig = vscode.workspace.getConfiguration();
        return workspaceConfig.get("arduino.autoUpdateIndexFiles");
    }
    get logLevel() {
        const workspaceConfig = vscode.workspace.getConfiguration();
        return workspaceConfig.get("arduino.logLevel") || "info";
    }
}
exports.VscodeSettings = VscodeSettings;

//# sourceMappingURL=vscodeSettings.js.map
