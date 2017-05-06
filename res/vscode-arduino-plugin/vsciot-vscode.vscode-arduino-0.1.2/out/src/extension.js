"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
/*--------------------------------------------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 *-------------------------------------------------------------------------------------------*/
const path = require("path");
const Uuid = require("uuid/v4");
const vscode = require("vscode");
const arduino_1 = require("./arduino/arduino");
const arduinoContentProvider_1 = require("./arduino/arduinoContentProvider");
const arduinoSettings_1 = require("./arduino/arduinoSettings");
const boardManager_1 = require("./arduino/boardManager");
const exampleManager_1 = require("./arduino/exampleManager");
const libraryManager_1 = require("./arduino/libraryManager");
const constants_1 = require("./common/constants");
const deviceContext_1 = require("./deviceContext");
const completionProvider_1 = require("./langService/completionProvider");
const Logger = require("./logger/logger");
const serialMonitor_1 = require("./serialmonitor/serialMonitor");
const usbDetector_1 = require("./serialmonitor/usbDetector");
let usbDetector = null;
const status = {};
function activate(context) {
    return __awaiter(this, void 0, void 0, function* () {
        Logger.configure(context);
        const activeGuid = Uuid().replace(/\-/g, "");
        Logger.traceUserData("start-activate-extension", { correlationId: activeGuid });
        // Show a warning message if the working file is not under the workspace folder.
        // People should know the extension might not work appropriately, they should look for the doc to get started.
        const openEditor = vscode.window.activeTextEditor;
        if (openEditor && openEditor.document.fileName.endsWith(".ino")) {
            const workingFile = path.normalize(openEditor.document.fileName);
            const workspaceFolder = (vscode.workspace && vscode.workspace.rootPath) || "";
            if (!workspaceFolder || workingFile.indexOf(path.normalize(workspaceFolder)) < 0) {
                vscode.window.showWarningMessage(`The working file "${workingFile}" is not under the workspace folder, ` +
                    "the arduino extension might not work appropriately.");
            }
        }
        const arduinoSettings = new arduinoSettings_1.ArduinoSettings();
        yield arduinoSettings.initialize();
        const arduinoApp = new arduino_1.ArduinoApp(arduinoSettings);
        yield arduinoApp.initialize();
        // TODO: After use the device.json config, should remove the dependency on the ArduinoApp object.
        const deviceContext = deviceContext_1.DeviceContext.getIntance();
        deviceContext.arduinoApp = arduinoApp;
        deviceContext.extensionPath = context.extensionPath;
        yield deviceContext.loadContext();
        context.subscriptions.push(deviceContext);
        // Arduino board manager & library manager
        const boardManager = new boardManager_1.BoardManager(arduinoSettings, arduinoApp);
        arduinoApp.boardManager = boardManager;
        yield boardManager.loadPackages();
        const libraryManager = new libraryManager_1.LibraryManager(arduinoSettings, arduinoApp);
        arduinoApp.libraryManager = libraryManager;
        const exampleManager = new exampleManager_1.ExampleManager(arduinoSettings, arduinoApp);
        arduinoApp.exampleManager = exampleManager;
        const arduinoManagerProvider = new arduinoContentProvider_1.ArduinoContentProvider(arduinoSettings, arduinoApp, context.extensionPath);
        context.subscriptions.push(vscode.workspace.registerTextDocumentContentProvider(constants_1.ARDUINO_MANAGER_PROTOCOL, arduinoManagerProvider));
        const registerCommand = (command, commandBody, getUserData) => {
            return vscode.commands.registerCommand(command, (...args) => __awaiter(this, void 0, void 0, function* () {
                const guid = Uuid().replace(/\-/g, "");
                Logger.traceUserData(`start-command-` + command, { correlationId: guid });
                const timer1 = new Logger.Timer();
                let telemetryResult;
                try {
                    let result = commandBody(...args);
                    if (result) {
                        result = yield Promise.resolve(result);
                    }
                    if (result && result.telemetry) {
                        telemetryResult = result;
                    }
                    else if (getUserData) {
                        telemetryResult = getUserData();
                    }
                }
                catch (error) {
                    Logger.traceError("executeCommandError", error, { correlationId: guid, command });
                }
                Logger.traceUserData(`end-command-` + command, Object.assign({}, telemetryResult, { correlationId: guid, duration: timer1.end() }));
            }));
        };
        context.subscriptions.push(registerCommand("arduino.showBoardManager", () => {
            return vscode.commands.executeCommand("vscode.previewHtml", constants_1.BOARD_MANAGER_URI, vscode.ViewColumn.Two, "Arduino Boards Manager");
        }));
        context.subscriptions.push(registerCommand("arduino.showLibraryManager", () => {
            return vscode.commands.executeCommand("vscode.previewHtml", constants_1.LIBRARY_MANAGER_URI, vscode.ViewColumn.Two, "Arduino Libraries Manager");
        }));
        context.subscriptions.push(registerCommand("arduino.showBoardConfig", () => {
            return vscode.commands.executeCommand("vscode.previewHtml", constants_1.BOARD_CONFIG_URI, vscode.ViewColumn.Two, "Arduino Board Configuration");
        }));
        context.subscriptions.push(registerCommand("arduino.showExamples", () => {
            return vscode.commands.executeCommand("vscode.previewHtml", constants_1.EXAMPLES_URI, vscode.ViewColumn.Two, "Arduino Examples");
        }));
        // change board type
        context.subscriptions.push(registerCommand("arduino.changeBoardType", () => __awaiter(this, void 0, void 0, function* () {
            yield boardManager.changeBoardType();
            arduinoManagerProvider.update(constants_1.LIBRARY_MANAGER_URI);
            arduinoManagerProvider.update(constants_1.EXAMPLES_URI);
        }), () => {
            return { board: boardManager.currentBoard.name };
        }));
        context.subscriptions.push(registerCommand("arduino.initialize", () => __awaiter(this, void 0, void 0, function* () { return yield deviceContext.initialize(); })));
        context.subscriptions.push(registerCommand("arduino.verify", () => __awaiter(this, void 0, void 0, function* () {
            if (!status.compile) {
                status.compile = "verify";
                yield arduinoApp.verify();
                delete status.compile;
            }
        }), () => {
            return { board: boardManager.currentBoard.name };
        }));
        context.subscriptions.push(registerCommand("arduino.upload", () => __awaiter(this, void 0, void 0, function* () {
            if (!status.compile) {
                status.compile = "upload";
                yield arduinoApp.upload();
                delete status.compile;
            }
        }), () => {
            return { board: boardManager.currentBoard.name };
        }));
        context.subscriptions.push(registerCommand("arduino.addLibPath", (path) => arduinoApp.addLibPath(path)));
        // serial monitor commands
        const serialMonitor = serialMonitor_1.SerialMonitor.getIntance();
        context.subscriptions.push(serialMonitor);
        context.subscriptions.push(registerCommand("arduino.selectSerialPort", () => serialMonitor.selectSerialPort(null, null)));
        context.subscriptions.push(registerCommand("arduino.openSerialMonitor", () => serialMonitor.openSerialMonitor()));
        context.subscriptions.push(registerCommand("arduino.changeBaudRate", () => serialMonitor.changeBaudRate()));
        context.subscriptions.push(registerCommand("arduino.sendMessageToSerialPort", () => serialMonitor.sendMessageToSerialPort()));
        context.subscriptions.push(registerCommand("arduino.closeSerialMonitor", (port) => serialMonitor.closeSerialMonitor(port)));
        const completionProvider = new completionProvider_1.CompletionProvider(arduinoApp);
        context.subscriptions.push(vscode.languages.registerCompletionItemProvider(constants_1.ARDUINO_MODE, completionProvider, "<", '"', "."));
        usbDetector = new usbDetector_1.UsbDetector(arduinoApp, boardManager, context.extensionPath);
        usbDetector.startListening();
        const updateStatusBar = () => {
            const activeEditor = vscode.window.activeTextEditor;
            if (!activeEditor || (activeEditor.document.languageId !== "cpp"
                && activeEditor.document.languageId !== "c"
                && !activeEditor.document.fileName.endsWith("arduino.json"))) {
                boardManager.updateStatusBar(false);
            }
            else {
                boardManager.updateStatusBar(true);
            }
        };
        vscode.window.onDidChangeActiveTextEditor((e) => {
            updateStatusBar();
        });
        updateStatusBar();
        Logger.traceUserData("end-activate-extension", { correlationId: activeGuid });
    });
}
exports.activate = activate;
function deactivate() {
    return __awaiter(this, void 0, void 0, function* () {
        const monitor = serialMonitor_1.SerialMonitor.getIntance();
        yield monitor.closeSerialMonitor(null, false);
        if (usbDetector) {
            usbDetector.stopListening();
        }
        Logger.traceUserData("deactivate-extension");
    });
}
exports.deactivate = deactivate;

//# sourceMappingURL=extension.js.map
