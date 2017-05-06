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
const glob = require("glob");
const os = require("os");
const path = require("path");
const vscode = require("vscode");
const constants = require("../common/constants");
const util = require("../common/util");
const Logger = require("../logger/logger");
const deviceContext_1 = require("../deviceContext");
const vscodeSettings_1 = require("./vscodeSettings");
const outputChannel_1 = require("../common/outputChannel");
const serialMonitor_1 = require("../serialmonitor/serialMonitor");
/**
 * Represent an Arduino application based on the official Arduino IDE.
 */
class ArduinoApp {
    /**
     * @param {IArduinoSettings} ArduinoSetting object.
     */
    constructor(_settings) {
        this._settings = _settings;
    }

    /**
     * Need refresh Arduino IDE's setting when starting up.
     * @param {boolean} force - Whether force initialzie the arduino
     */
    initialize(force = false) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!util.fileExistsSync(this._settings.preferencePath)) {
                try {
                    // Use empty pref value to initialize preference.txt file
                    yield this.setPref("boardsmanager.additional.urls", "");
                    this._settings.loadPreferences(); // reload preferences.
                }
                catch (ex) {
                }
            }
            if (force || !util.fileExistsSync(path.join(this._settings.packagePath, "package_index.json"))) {
                try {
                    // Use the dummy package to initialize the Arduino IDE
                    yield this.installBoard("dummy", "", "", true);
                }
                catch (ex) {
                }
            }
        });
    }
    /**
     * Initialize the arduino library.
     * @param {boolean} force - Whether force refresh library index file
     */
    initializeLibrary(force = false) {
        return __awaiter(this, void 0, void 0, function* () {
            if (force || !util.fileExistsSync(path.join(this._settings.packagePath, "library_index.json"))) {
                try {
                    // Use the dummy library to initialize the Arduino IDE
                    yield this.installLibrary("dummy", "", true);
                }
                catch (ex) {
                }
            }
        });
    }
    /**
     * Set the Arduino preferences value.
     * @param {string} key - The preference key
     * @param {string} value - The preference value
     */
    setPref(key, value) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield util.spawn(this._settings.commandPath, null, ["--pref", `${key}=${value}`, "--save-prefs"]);
            }
            catch (ex) {
            }
        });
    }
    upload() {
        return __awaiter(this, void 0, void 0, function* () {
            const dc = deviceContext_1.DeviceContext.getIntance();
            const boardDescriptor = this.getBoardBuildString(dc);
            if (!boardDescriptor) {
                return;
            }
            if (!dc.sketch || !util.fileExistsSync(path.join(vscode.workspace.rootPath, dc.sketch))) {
                yield this.getMainSketch(dc);
            }
            if (!dc.port) {
                vscode.window.showErrorMessage("Please specify the upload serial port.");
                return;
            }
            outputChannel_1.arduinoChannel.show();
            outputChannel_1.arduinoChannel.start(`Upload sketch - ${dc.sketch}`);
            if (dc._sketchbookPath) {
                this.setCustomSketchbookPath(dc.sketchbookPath);
            }
            const serialMonitor = serialMonitor_1.SerialMonitor.getIntance();
            const needRestore = yield serialMonitor.closeSerialMonitor(dc.port);
            yield vscode.workspace.saveAll(false);
            const appPath = path.join(vscode.workspace.rootPath, dc.sketch);
            const args = ["--upload", "--board", boardDescriptor, "--port", dc.port, appPath];
            if (vscodeSettings_1.VscodeSettings.getIntance().logLevel === "verbose") {
                args.push("--verbose");
            }
            yield util.spawn(this._settings.commandPath, outputChannel_1.arduinoChannel.channel, args).then((result) => __awaiter(this, void 0, void 0, function* () {
                if (needRestore) {
                    yield serialMonitor.openSerialMonitor();
                }
                this.restorePreferences();
                outputChannel_1.arduinoChannel.end(`Uploaded the sketch: ${dc.sketch}${os.EOL}`);
            }), (reason) => {
                this.restorePreferences();
                outputChannel_1.arduinoChannel.error(`Exit with code=${reason.code}${os.EOL}`);
            });
        });
    }
    setCustomSketchbookPath(sketchbookPath) {
        outputChannel_1.arduinoChannel.info(`Picked up custom sketchboardPath - ${sketchbookPath}`);
        var copyPreferences = new Map(this._settings.preferences);
        copyPreferences.set("sketchbook.path", sketchbookPath);
        fs.writeFileSync(this._settings.preferencePath, this.preferencesToString(copyPreferences));
    }
    restorePreferences() {
        fs.writeFileSync(this._settings.preferencePath, this.preferencesToString(this._settings.preferences));
        outputChannel_1.arduinoChannel.info(`Restored sketchboardPath`);
    }
    preferencesToString(preferences) {
        var preferencesAsString = "";
        preferences.forEach(function(value, key, map) {
            preferencesAsString += key + "=" + value + "\r\n";
        });
        return preferencesAsString;
    }
    verify() {
        return __awaiter(this, void 0, void 0, function* () {
            const dc = deviceContext_1.DeviceContext.getIntance();
            const boardDescriptor = this.getBoardBuildString(dc);
            if (!boardDescriptor) {
                return;
            }
            if (!dc.sketch || !util.fileExistsSync(path.join(vscode.workspace.rootPath, dc.sketch))) {
                yield this.getMainSketch(dc);
            }
            yield vscode.workspace.saveAll(false);
            outputChannel_1.arduinoChannel.start(`Verify sketch - ${dc.sketch}`);
            if (dc._sketchbookPath) {
                this.setCustomSketchbookPath(dc.sketchbookPath);
            }
            const appPath = path.join(vscode.workspace.rootPath, dc.sketch);
            const args = ["--verify", "--board", boardDescriptor, appPath];
            if (vscodeSettings_1.VscodeSettings.getIntance().logLevel === "verbose") {
                args.push("--verbose");
            }
            outputChannel_1.arduinoChannel.show();
            yield util.spawn(this._settings.commandPath, outputChannel_1.arduinoChannel.channel, args).then((result) => {
                this.restorePreferences();
                outputChannel_1.arduinoChannel.end(`Finished verify sketch - ${dc.sketch}${os.EOL}`);
            }, (reason) => {
                this.restorePreferences();
                outputChannel_1.arduinoChannel.error(`Exit with code=${reason.code}${os.EOL}`);
            });
        });
    }
    // Add selected library path to the intellisense search path.
    addLibPath(libraryPath) {
        let libPaths;
        if (libraryPath) {
            libPaths = [libraryPath];
        }
        else {
            libPaths = this.getDefaultPackageLibPaths();
        }
        const configFilePath = path.join(vscode.workspace.rootPath, constants.CPP_CONFIG_FILE);
        let deviceContext = null;
        if (!util.fileExistsSync(configFilePath)) {
            util.mkdirRecursivelySync(path.dirname(configFilePath));
            deviceContext = {};
        }
        else {
            deviceContext = util.tryParseJSON(fs.readFileSync(configFilePath, "utf8"));
        }
        if (!deviceContext) {
            Logger.notifyAndThrowUserError("arduinoFileError", new Error(constants.messages.ARDUINO_FILE_ERROR));
        }
        deviceContext.configurations = deviceContext.configurations || [];
        let configSection = null;
        deviceContext.configurations.forEach((section) => {
            if (section.name === util.getCppConfigPlatform()) {
                configSection = section;
                configSection.browse = configSection.browse || {};
                configSection.browse.limitSymbolsToIncludedHeaders = false;
            }
        });
        if (!configSection) {
            configSection = {
                name: util.getCppConfigPlatform(),
                includePath: [],
                browse: { limitSymbolsToIncludedHeaders: false },
            };
            deviceContext.configurations.push(configSection);
        }
        libPaths.forEach((childLibPath) => {
            childLibPath = path.resolve(path.normalize(childLibPath));
            if (configSection.includePath && configSection.includePath.length) {
                for (const existingPath of configSection.includePath) {
                    if (childLibPath === path.resolve(path.normalize(existingPath))) {
                        return;
                    }
                }
            }
            else {
                configSection.includePath = [];
            }
            configSection.includePath.push(childLibPath);
        });
        fs.writeFileSync(configFilePath, JSON.stringify(deviceContext, null, 4));
    }
    // Include the *.h header files from selected library to the arduino sketch.
    includeLibrary(libraryPath) {
        return __awaiter(this, void 0, void 0, function* () {
            const dc = deviceContext_1.DeviceContext.getIntance();
            const appPath = path.join(vscode.workspace.rootPath, dc.sketch);
            if (util.fileExistsSync(appPath)) {
                const hFiles = glob.sync(`${libraryPath}/*.h`, {
                    nodir: true,
                    matchBase: true,
                });
                const hIncludes = hFiles.map((hFile) => {
                    return `#include <${path.basename(hFile)}>`;
                }).join(os.EOL);
                // Open the sketch and bring up it to current visible view.
                const textDocument = yield vscode.workspace.openTextDocument(appPath);
                yield vscode.window.showTextDocument(textDocument, vscode.ViewColumn.One, true);
                const activeEditor = vscode.window.visibleTextEditors.find((textEditor) => {
                    return path.resolve(textEditor.document.fileName) === path.resolve(appPath);
                });
                if (activeEditor) {
                    // Insert *.h at the beginning of the sketch code.
                    yield activeEditor.edit((editBuilder) => {
                        editBuilder.insert(new vscode.Position(0, 0), `${hIncludes}${os.EOL}${os.EOL}`);
                    });
                }
            }
        });
    }
    /**
     * Install arduino board package based on package name and platform hardware architecture.
     */
    installBoard(packageName, arch = "", version = "", showOutput = true) {
        return __awaiter(this, void 0, void 0, function* () {
            outputChannel_1.arduinoChannel.show();
            const updatingIndex = packageName === "dummy" && !arch && !version;
            if (updatingIndex) {
                outputChannel_1.arduinoChannel.start(`Update package index files...`);
            }
            else {
                outputChannel_1.arduinoChannel.start(`Install package - ${packageName}...`);
            }
            try {
                yield util.spawn(this._settings.commandPath, showOutput ? outputChannel_1.arduinoChannel.channel : null, ["--install-boards", `${packageName}${arch && ":" + arch}${version && ":" + version}`]);
                if (updatingIndex) {
                    outputChannel_1.arduinoChannel.end("Updated package index files.");
                }
                else {
                    outputChannel_1.arduinoChannel.end(`Installed board package - ${packageName}${os.EOL}`);
                }
            }
            catch (error) {
                // If a platform with the same version is already installed, nothing is installed and program exits with exit code 1
                if (error.code === 1) {
                    if (updatingIndex) {
                        outputChannel_1.arduinoChannel.end("Updated package index files.");
                    }
                    else {
                        outputChannel_1.arduinoChannel.end(`Installed board package - ${packageName}${os.EOL}`);
                    }
                }
                else {
                    outputChannel_1.arduinoChannel.error(`Exit with code=${error.code}${os.EOL}`);
                }
            }
        });
    }
    uninstallBoard(boardName, packagePath) {
        outputChannel_1.arduinoChannel.start(`Uninstall board package - ${boardName}...`);
        util.rmdirRecursivelySync(packagePath);
        outputChannel_1.arduinoChannel.end(`Uninstalled board package - ${boardName}${os.EOL}`);
    }
    installLibrary(libName, version = "", showOutput = true) {
        return __awaiter(this, void 0, void 0, function* () {
            outputChannel_1.arduinoChannel.show();
            const updatingIndex = (libName === "dummy" && !version);
            if (updatingIndex) {
                outputChannel_1.arduinoChannel.start("Update library index files...");
            }
            else {
                outputChannel_1.arduinoChannel.start(`Install library - ${libName}`);
            }
            try {
                yield util.spawn(this._settings.commandPath, showOutput ? outputChannel_1.arduinoChannel.channel : null, ["--install-library", `${libName}${version && ":" + version}`]);
                if (updatingIndex) {
                    outputChannel_1.arduinoChannel.end("Updated library index files.");
                }
                else {
                    outputChannel_1.arduinoChannel.end(`Installed library - ${libName}${os.EOL}`);
                }
            }
            catch (error) {
                // If a library with the same version is already installed, nothing is installed and program exits with exit code 1
                if (error.code === 1) {
                    if (updatingIndex) {
                        outputChannel_1.arduinoChannel.end("Updated library index files.");
                    }
                    else {
                        outputChannel_1.arduinoChannel.end(`Installed library - ${libName}${os.EOL}`);
                    }
                }
                else {
                    outputChannel_1.arduinoChannel.error(`Exit with code=${error.code}${os.EOL}`);
                }
            }
        });
    }
    uninstallLibrary(libName, libPath) {
        outputChannel_1.arduinoChannel.start(`Remove library - ${libName}`);
        util.rmdirRecursivelySync(libPath);
        outputChannel_1.arduinoChannel.end(`Removed library - ${libName}${os.EOL}`);
    }
    getDefaultPackageLibPaths() {
        const result = [];
        const boardDescriptor = this._boardManager.currentBoard;
        if (!boardDescriptor) {
            return result;
        }
        const toolsPath = boardDescriptor.platform.rootBoardPath;
        if (util.directoryExistsSync(path.join(toolsPath, "cores"))) {
            const coreLibs = fs.readdirSync(path.join(toolsPath, "cores"));
            if (coreLibs && coreLibs.length > 0) {
                coreLibs.forEach((coreLib) => {
                    result.push(path.normalize(path.join(toolsPath, "cores", coreLib)));
                });
            }
        }
        return result;
    }
    openExample(example) {
        function tmpName(name) {
            let counter = 0;
            let candidateName = name;
            while (true) {
                if (!util.fileExistsSync(candidateName) && !util.directoryExistsSync(candidateName)) {
                    return candidateName;
                }
                counter++;
                candidateName = `${name}_${counter}`;
            }
        }
        // Step 1: Copy the example project to a temporary directory.
        const sketchPath = path.join(this._settings.sketchbookPath, "generated_examples");
        if (!util.directoryExistsSync(sketchPath)) {
            util.mkdirRecursivelySync(sketchPath);
        }
        let destExample = "";
        if (util.directoryExistsSync(example)) {
            destExample = tmpName(path.join(sketchPath, path.basename(example)));
            util.cp(example, destExample);
        }
        else if (util.fileExistsSync(example)) {
            const exampleName = path.basename(example, path.extname(example));
            destExample = tmpName(path.join(sketchPath, exampleName));
            util.mkdirRecursivelySync(destExample);
            util.cp(example, path.join(destExample, path.basename(example)));
        }
        if (destExample) {
            // Step 2: Scaffold the example project to an arduino project.
            const items = fs.readdirSync(destExample);
            const sketchFile = items.find((item) => {
                return util.isArduinoFile(path.join(destExample, item));
            });
            if (sketchFile) {
                // Generate arduino.json
                const dc = deviceContext_1.DeviceContext.getIntance();
                const arduinoJson = {
                    sketch: sketchFile,
                    port: dc.port || "COM1",
                    board: dc.board,
                    configuration: dc.configuration,
                };
                const arduinoConfigFilePath = path.join(destExample, constants.ARDUINO_CONFIG_FILE);
                util.mkdirRecursivelySync(path.dirname(arduinoConfigFilePath));
                fs.writeFileSync(arduinoConfigFilePath, JSON.stringify(arduinoJson, null, 4));
                // Generate cpptools intellisense config
                const cppConfigFilePath = path.join(destExample, constants.CPP_CONFIG_FILE);
                const cppConfig = {
                    configurations: [{
                            name: util.getCppConfigPlatform(),
                            includePath: this.getDefaultPackageLibPaths(),
                            browse: {
                                limitSymbolsToIncludedHeaders: false,
                            },
                        }],
                };
                util.mkdirRecursivelySync(path.dirname(cppConfigFilePath));
                fs.writeFileSync(cppConfigFilePath, JSON.stringify(cppConfig, null, 4));
            }
            // Step 3: Open the arduino project at a new vscode window.
            vscode.commands.executeCommand("vscode.openFolder", vscode.Uri.file(destExample), true);
        }
        return destExample;
    }
    get customPreferences() {
        return this._customPreferences;
    }
    set customPreferences(value) {
        this._customPreferences = value;
    }
    get settings() {
        return this._settings;
    }
    get boardManager() {
        return this._boardManager;
    }
    set boardManager(value) {
        this._boardManager = value;
    }
    get libraryManager() {
        return this._libraryManager;
    }
    set libraryManager(value) {
        this._libraryManager = value;
    }
    get exampleManager() {
        return this._exampleManager;
    }
    set exampleManager(value) {
        this._exampleManager = value;
    }
    getBoardBuildString(deviceContext) {
        const selectedBoard = this.boardManager.currentBoard;
        if (!selectedBoard) {
            Logger.notifyUserError("getBoardBuildString", new Error(constants.messages.NO_BOARD_SELECTED));
            return;
        }
        const boardString = selectedBoard.getBuildConfig();
        return boardString;
    }
    getMainSketch(dc) {
        return __awaiter(this, void 0, void 0, function* () {
            yield dc.resolveMainSketch();
            if (!dc.sketch) {
                vscode.window.showErrorMessage("No sketch file was found. Please specify the sketch in the arduino.json file");
                throw new Error("No sketch file was found.");
            }
        });
    }
}
exports.ArduinoApp = ArduinoApp;

//# sourceMappingURL=arduino.js.map
