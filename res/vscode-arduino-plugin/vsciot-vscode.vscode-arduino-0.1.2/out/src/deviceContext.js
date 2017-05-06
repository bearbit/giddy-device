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
const vscode = require("vscode");
const constants = require("./common/constants");
const util = require("./common/util");
const Logger = require("./logger/logger");
const constants_1 = require("./common/constants");
class DeviceContext {
    /**
     * @constructor
     */
    constructor() {
        if (vscode.workspace && vscode.workspace.rootPath) {
            this._watcher = vscode.workspace.createFileSystemWatcher(path.join(vscode.workspace.rootPath, constants_1.ARDUINO_CONFIG_FILE));
            this._watcher.onDidCreate(() => this.loadContext());
            this._watcher.onDidChange(() => this.loadContext());
            this._watcher.onDidDelete(() => this.loadContext());
        }
    }
    static getIntance() {
        return DeviceContext._deviceContext;
    }
    dispose() {
        if (this._watcher) {
            this._watcher.dispose();
        }
    }
    get arduinoApp() {
        return this._arduinoApp;
    }
    set arduinoApp(value) {
        this._arduinoApp = value;
    }
    get extensionPath() {
        return this._extensionPath;
    }
    set extensionPath(value) {
        this._extensionPath = value;
    }
    /**
     * TODO: Current we use the Arduino default settings. For future release, this dependency might be removed
     * and the setting only depends on device.json.
     * @method
     */
    loadContext() {
        return vscode.workspace.findFiles(constants_1.ARDUINO_CONFIG_FILE, null, 1)
            .then((files) => {
            let deviceConfigJson = {};
            if (files && files.length > 0) {
                const configFile = files[0];
                deviceConfigJson = util.tryParseJSON(fs.readFileSync(configFile.fsPath, "utf8"));
                if (deviceConfigJson) {
                    this._port = deviceConfigJson.port || this._port;
                    this._board = deviceConfigJson.board || this._board;
                    this._sketch = deviceConfigJson.sketch || this._sketch;
                    this._configuration = deviceConfigJson.configuration || this._configuration;
                }
                else {
                    Logger.notifyUserError("arduinoFileError", new Error(constants.messages.ARDUINO_FILE_ERROR));
                }
            }
            return this;
        });
    }
    saveContext() {
        const deviceConfigFile = path.join(vscode.workspace.rootPath, constants_1.ARDUINO_CONFIG_FILE);
        let deviceConfigJson = {};
        if (util.fileExistsSync(deviceConfigFile)) {
            deviceConfigJson = util.tryParseJSON(fs.readFileSync(deviceConfigFile, "utf8"));
        }
        if (!deviceConfigJson) {
            Logger.notifyUserError("arduinoFileError", new Error(constants.messages.ARDUINO_FILE_ERROR));
            return;
        }
        deviceConfigJson.sketch = this.sketch;
        deviceConfigJson.port = this.port;
        deviceConfigJson.board = this.board;
        deviceConfigJson.configuration = this.configuration;
        util.mkdirRecursivelySync(path.dirname(deviceConfigFile));
        fs.writeFileSync(deviceConfigFile, JSON.stringify(deviceConfigJson, null, 4));
    }
    get port() {
        return this._port;
    }
    set port(value) {
        this._port = value;
        this.saveContext();
    }
    get board() {
        return this._board;
    }
    set board(value) {
        this._board = value;
        this.saveContext();
    }
    get sketch() {
        return this._sketch;
    }
    set sketch(value) {
        this._sketch = value;
        this.saveContext();
    }
    get configuration() {
        return this._configuration;
    }
    set configuration(value) {
        this._configuration = value;
        this.saveContext();
    }
    initialize() {
        return __awaiter(this, void 0, void 0, function* () {
            if (util.fileExistsSync(path.join(vscode.workspace.rootPath, constants_1.ARDUINO_CONFIG_FILE))) {
                vscode.window.showInformationMessage("Arduino.json is already generated.");
                return;
            }
            else {
                yield this.resolveMainSketch();
                if (this.sketch) {
                    yield vscode.commands.executeCommand("arduino.changeBoardType");
                    vscode.window.showInformationMessage("The workspace is initialized with the Arduino extension support.");
                }
                else {
                    vscode.window.showInformationMessage("No *.ino sketch file was found or selected, so skip initialize command.");
                }
            }
        });
    }
    resolveMainSketch() {
        return __awaiter(this, void 0, void 0, function* () {
            return yield vscode.workspace.findFiles("**/*.ino", null)
                .then((fileUris) => __awaiter(this, void 0, void 0, function* () {
                if (fileUris.length === 0) {
                    let newSketchFileName = yield vscode.window.showInputBox({
                        value: "app.ino",
                        prompt: "No .ino file was found on workspace, initialize sketch first",
                        placeHolder: "Input the sketch file name",
                        validateInput: (value) => {
                            if (value && /^\w+\.((ino)|(cpp)|c)$/.test(value.trim())) {
                                return null;
                            }
                            else {
                                return "Invalid sketch file name. Should be *.ino/*.cpp/*.c";
                            }
                        },
                    });
                    newSketchFileName = (newSketchFileName && newSketchFileName.trim()) || "";
                    if (newSketchFileName) {
                        const snippets = fs.readFileSync(path.join(this.extensionPath, "snippets", "sample.ino"));
                        fs.writeFileSync(path.join(vscode.workspace.rootPath, newSketchFileName), snippets);
                        this.sketch = newSketchFileName;
                        // Open the new sketch file.
                        const textDocument = yield vscode.workspace.openTextDocument(path.join(vscode.workspace.rootPath, newSketchFileName));
                        vscode.window.showTextDocument(textDocument, vscode.ViewColumn.One, true);
                    }
                    else {
                        this._sketch = undefined;
                    }
                }
                else if (fileUris.length === 1) {
                    this.sketch = path.relative(vscode.workspace.rootPath, fileUris[0].fsPath);
                }
                else if (fileUris.length > 1) {
                    const chosen = yield vscode.window.showQuickPick(fileUris.map((fileUri) => {
                        return {
                            label: path.relative(vscode.workspace.rootPath, fileUri.fsPath),
                            description: fileUri.fsPath,
                        };
                    }), { placeHolder: "Select the main sketch file" });
                    if (chosen && chosen.label) {
                        this.sketch = chosen.label;
                    }
                }
            }));
        });
    }
}
DeviceContext._deviceContext = new DeviceContext();
exports.DeviceContext = DeviceContext;

//# sourceMappingURL=deviceContext.js.map
