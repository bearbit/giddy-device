"use strict";
/*--------------------------------------------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 *-------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
exports.arduinoChannel = {
    channel: vscode.window.createOutputChannel("Arduino"),
    start(message) {
        this.channel.appendLine(`[Starting] ${message}`);
    },
    end(message) {
        this.channel.appendLine(`[Done] ${message}`);
    },
    error(message) {
        this.channel.appendLine(`[Error] ${message}`);
    },
    info(message) {
        this.channel.appendLine(message);
    },
    show() {
        this.channel.show();
    },
    hide() {
        this.channel.hide();
    },
};

//# sourceMappingURL=outputChannel.js.map
