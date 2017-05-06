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
const os = require("os");
const path = require("path");
const vscode = require("vscode");
const WinReg = require("winreg");
const util = require("../common/util");
const platform_1 = require("../common/platform");
const vscodeSettings_1 = require("./vscodeSettings");
class ArduinoSettings {
    constructor() {
    }
    initialize() {
        return __awaiter(this, void 0, void 0, function* () {
            const platform = os.platform();
            if (platform === "win32") {
                yield this.updateWindowsPath(this.arduinoPath);
            }
            else if (platform === "linux") {
                this._packagePath = path.join(process.env.HOME, ".arduino15");
                this._sketchbookPath = this.preferences.get("sketchbook.path") || path.join(process.env.HOME, "Arduino");
            }
            else if (platform === "darwin") {
                this._packagePath = path.join(process.env.HOME, "Library/Arduino15");
                this._sketchbookPath = this.preferences.get("sketchbook.path") || path.join(process.env.HOME, "Documents/Arduino");
            }
        });
    }
    get arduinoPath() {
        if (this._arduinoPath) {
            return this._arduinoPath;
        }
        else {
            // Query arduino path sequentially from the following places such as "vscode user settings", "system environment variables",
            // "usual software installation directory for each os".
            // 1. Search vscode user settings first.
            const configValue = vscodeSettings_1.VscodeSettings.getIntance().arduinoPath;
            if (!configValue || !configValue.trim()) {
                // 2 & 3. Resolve arduino path from system environment varialbes and usual software installation directory.
                this._arduinoPath = platform_1.resolveArduinoPath();
            }
            else {
                this._arduinoPath = configValue;
            }
            if (!this._arduinoPath) {
                vscode.window.showErrorMessage(`Cannot find the arduino installation path. Please specify the "arduino.path" in the User Settings.` +
                    " Requires a restart after change.");
                vscode.commands.executeCommand("workbench.action.openGlobalSettings");
            }
            else if (!platform_1.validateArduinoPath(this._arduinoPath)) {
                vscode.window.showErrorMessage(`Cannot find arduino executable program under directory "${this._arduinoPath}". ` +
                    `Please set the correct "arduino.path" in the User Settings. Requires a restart after change.`);
                vscode.commands.executeCommand("workbench.action.openGlobalSettings");
            }
            return this._arduinoPath;
        }
    }
    get defaultExamplePath() {
        if (os.platform() === "darwin") {
            return path.join(this.arduinoPath, "Arduino.app/Contents/Java/examples");
        }
        else {
            return path.join(this.arduinoPath, "examples");
        }
    }
    get packagePath() {
        return this._packagePath;
    }
    get defaultPackagePath() {
        if (os.platform() === "darwin") {
            return path.join(this.arduinoPath, "Arduino.app/Contents/Java/hardware");
        }
        else {
            return path.join(this.arduinoPath, "hardware");
        }
    }
    get defaultLibPath() {
        if (os.platform() === "darwin") {
            return path.join(this.arduinoPath, "Arduino.app/Contents/Java/libraries");
        }
        else {
            return path.join(this.arduinoPath, "libraries");
        }
    }
    get commandPath() {
        const platform = os.platform();
        if (platform === "darwin") {
            return path.join(this.arduinoPath, path.normalize("Arduino.app/Contents/MacOS/Arduino"));
        }
        else if (platform === "linux") {
            return path.join(this.arduinoPath, "arduino");
        }
        else if (platform === "win32") {
            return path.join(this.arduinoPath, "arduino_debug.exe");
        }
    }
    get sketchbookPath() {
        return this._sketchbookPath;
    }
    get preferencePath() {
        return path.join(this.packagePath, "preferences.txt");
    }
    get preferences() {
        if (!this._preferences) {
            this.loadPreferences();
        }
        return this._preferences;
    }
    loadPreferences() {
        this._preferences = util.parseConfigFile(this.preferencePath);
    }
    /**
     * For Windows platform, there are two situations here:
     *  - User change the location of the default *Documents* folder.
     *  - Use the windows store Arduino app.
     */
    updateWindowsPath(arduinoPath) {
        let docFolder = path.join(process.env.USERPROFILE, "Documents");
        return new Promise((resolve, reject) => {
            try {
                const regKey = new WinReg({
                    hive: WinReg.HKCU,
                    key: "\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\User Shell Folders",
                });
                regKey.valueExists("Personal", (e, exists) => {
                    if (!e && exists) {
                        regKey.get("Personal", (err, result) => {
                            if (!err && result) {
                                docFolder = result.value;
                            }
                            resolve(docFolder);
                        });
                    }
                    else {
                        resolve(docFolder);
                    }
                });
            }
            catch (ex) {
                resolve(docFolder);
            }
        }).then((folder) => {
            // For some case, docFolder parsed from win32 registry looks like "%USERPROFILE%\Documents,
            // Should replace the environment variables with actual value.
            folder = folder.replace(/%([^%]+)%/g, (match, p1) => {
                return process.env[p1];
            });
            if (util.fileExistsSync(path.join(arduinoPath, "AppxManifest.xml"))) {
                this._packagePath = path.join(folder, "ArduinoData");
            }
            else {
                this._packagePath = path.join(process.env.LOCALAPPDATA, "Arduino15");
            }
            this._sketchbookPath = this.preferences.get("sketchbook.path") || path.join(folder, "Arduino");
            return true;
        });
    }
}
exports.ArduinoSettings = ArduinoSettings;

//# sourceMappingURL=arduinoSettings.js.map
