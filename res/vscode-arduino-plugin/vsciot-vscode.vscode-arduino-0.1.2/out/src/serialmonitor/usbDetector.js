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
const os = require("os");
const path = require("path");
const vscode = require("vscode");
const util = require("../common/util");
const Logger = require("../logger/logger");
const serialMonitor_1 = require("./serialMonitor");
class UsbDetector {
    constructor(_arduinoApp, _boardManager, _extensionRoot) {
        this._arduinoApp = _arduinoApp;
        this._boardManager = _boardManager;
        this._extensionRoot = _extensionRoot;
        this._boardDescriptors = null;
    }
    startListening() {
        return __awaiter(this, void 0, void 0, function* () {
            if (os.platform() === "linux") {
                return;
            }
            this._usbDector = require("../../../vendor/node-usb-detection");
            if (!this._usbDector) {
                return;
            }
            this._usbDector.on("add", (device) => {
                if (device.vendorId && device.productId) {
                    const deviceDescriptor = this.getUsbDeviceDescriptor(util.padStart(device.vendorId.toString(16), 4, "0"), // vid and pid both are 2 bytes long.
                    util.padStart(device.productId.toString(16), 4, "0"), this._extensionRoot);
                    // Not supported device for discovery.
                    if (!deviceDescriptor) {
                        return;
                    }
                    const boardKey = `${deviceDescriptor.package}:${deviceDescriptor.architecture}:${deviceDescriptor.id}`;
                    Logger.traceUserData("detected a board", { board: boardKey });
                    let bd = this._boardManager.installedBoards.get(boardKey);
                    if (!bd) {
                        this._boardManager.updatePackageIndex(deviceDescriptor.indexFile).then((shouldLoadPackgeContent) => {
                            vscode.window.showInformationMessage(`Install board package for ${deviceDescriptor.name}`, "Yes", "No").then((ans) => {
                                if (ans === "Yes") {
                                    this._arduinoApp.installBoard(deviceDescriptor.package, deviceDescriptor.architecture)
                                        .then((res) => {
                                        if (shouldLoadPackgeContent) {
                                            this._boardManager.loadPackageContent(deviceDescriptor.indexFile);
                                        }
                                        this._boardManager.updateInstalledPlatforms(deviceDescriptor.package, deviceDescriptor.architecture);
                                        bd = this._boardManager.installedBoards.get(boardKey);
                                        this.switchBoard(bd, deviceDescriptor.vid, deviceDescriptor.pid);
                                        if (this._boardManager.currentBoard) {
                                            const readme = path.join(this._boardManager.currentBoard.platform.rootBoardPath, "README.md");
                                            if (util.fileExistsSync(readme)) {
                                                vscode.commands.executeCommand("markdown.showPreview", vscode.Uri.file(readme));
                                            }
                                            vscode.commands.executeCommand("arduino.showExamples");
                                        }
                                    });
                                }
                            });
                        });
                    }
                    else if (this._boardManager.currentBoard) {
                        const currBoard = this._boardManager.currentBoard;
                        if (currBoard.board !== deviceDescriptor.id
                            || currBoard.platform.architecture !== deviceDescriptor.architecture
                            || currBoard.platform.package.name !== deviceDescriptor.package) {
                            vscode.window.showInformationMessage(`Detected board ${deviceDescriptor.name}. Would you like to switch to this board type?`, "Yes", "No")
                                .then((ans) => {
                                if (ans === "Yes") {
                                    return this.switchBoard(bd, deviceDescriptor.vid, deviceDescriptor.pid);
                                }
                            });
                        }
                    }
                    else {
                        this.switchBoard(bd, deviceDescriptor.vid, deviceDescriptor.pid);
                    }
                }
            });
        });
    }
    stopListening() {
        if (this._usbDector) {
            this._usbDector.stopMonitoring();
        }
    }
    switchBoard(bd, vid, pid) {
        this._boardManager.doChangeBoardType(bd);
        const monitor = serialMonitor_1.SerialMonitor.getIntance();
        monitor.selectSerialPort(vid, pid);
    }
    getUsbDeviceDescriptor(vendorId, productId, extensionRoot) {
        if (!this._boardDescriptors) {
            this._boardDescriptors = [];
            const fileContent = fs.readFileSync(path.join(extensionRoot, "misc", "usbmapping.json"), "utf8");
            const boardIndexes = JSON.parse(fileContent);
            boardIndexes.forEach((boardIndex) => {
                boardIndex.boards.forEach((board) => board.indexFile = boardIndex.index_file);
                this._boardDescriptors = this._boardDescriptors.concat(boardIndex.boards);
            });
        }
        return this._boardDescriptors.find((obj) => {
            return obj.vid === vendorId && obj.pid === productId;
        });
    }
}
exports.UsbDetector = UsbDetector;

//# sourceMappingURL=usbDetector.js.map
