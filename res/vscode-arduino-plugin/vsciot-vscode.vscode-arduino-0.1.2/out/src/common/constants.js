"use strict";
/*--------------------------------------------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 *-------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const vscode = require("vscode");
exports.ARDUINO_CONFIG_FILE = path.join(".vscode", "arduino.json");
exports.CPP_CONFIG_FILE = path.join(".vscode", "c_cpp_properties.json");
exports.ARDUINO_MODE = [
    { language: "cpp", scheme: "file" },
    { language: "arduino", scheme: "file" },
];
exports.ARDUINO_MANAGER_PROTOCOL = "arduino-manager";
exports.BOARD_MANAGER_URI = vscode.Uri.parse("arduino-manager://arduino/arduino-boardsmanager");
exports.LIBRARY_MANAGER_URI = vscode.Uri.parse("arduino-manager://arduino/arduino-librariesmanager");
exports.BOARD_CONFIG_URI = vscode.Uri.parse("arduino-manager://arduino/arduino-config");
exports.EXAMPLES_URI = vscode.Uri.parse("arduino-manager://arduino/arduino-examples");
exports.messages = {
    ARDUINO_FILE_ERROR: "The arduino.json file format is not correct.",
    NO_BOARD_SELECTED: "Please select the board type first.",
    INVALID_ARDUINO_PATH: "Cannot find the Arduino installation path. You can specify the path in the user settings.",
    FAILED_SEND_SERIALPORT: "Failed to send message to serial port.",
    SERIAL_PORT_NOT_STARTED: "Serial Monitor has not been started.",
    SEND_BEFORE_OPEN_SERIALPORT: "Please open a serial port first.",
};

//# sourceMappingURL=constants.js.map
