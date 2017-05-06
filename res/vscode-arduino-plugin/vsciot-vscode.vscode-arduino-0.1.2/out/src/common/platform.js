"use strict";
/*--------------------------------------------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 *-------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const childProcess = require("child_process");
const os = require("os");
const path = require("path");
const util_1 = require("./util");
function resolveArduinoPath() {
    let result;
    const plat = os.platform();
    try {
        // Resolve arduino path from system environment variables.
        if (plat === "win32") {
            let pathString = childProcess.execSync("where arduino", { encoding: "utf8" });
            pathString = path.resolve(pathString).trim();
            if (util_1.fileExistsSync(pathString)) {
                result = path.dirname(path.resolve(pathString));
            }
        }
        else if (plat === "linux") {
            let pathString = childProcess.execSync("readlink -f $(which arduino)", { encoding: "utf8" });
            pathString = path.resolve(pathString).trim();
            if (util_1.fileExistsSync(pathString)) {
                result = path.dirname(path.resolve(pathString));
            }
        }
    }
    catch (ex) {
        // Ignore the errors.
    }
    // Resolve arduino path from the usual software installation directory for each os.
    // For example, "C:\Program Files" for Windows, "/Applications" for Mac.
    if (!result) {
        if (plat === "darwin") {
            const defaultCommonPaths = [path.join(process.env.HOME, "Applications"), "/Applications"];
            for (const scanPath of defaultCommonPaths) {
                if (util_1.directoryExistsSync(path.join(scanPath, "Arduino.app"))) {
                    result = scanPath;
                    break;
                }
            }
        }
        else if (plat === "linux") {
            // TODO
        }
        else if (plat === "win32") {
            const defaultCommonPaths = [process.env.ProgramFiles, process.env["ProgramFiles(x86)"]];
            for (const scanPath of defaultCommonPaths) {
                if (scanPath && util_1.directoryExistsSync(path.join(scanPath, "Arduino"))) {
                    result = path.join(scanPath, "Arduino");
                    break;
                }
            }
        }
    }
    return result || "";
}
exports.resolveArduinoPath = resolveArduinoPath;
function detectApp(appName) {
    let result;
    const plat = os.platform();
    try {
        if (plat === "win32") {
            result = childProcess.execSync(`where ${appName}`, { encoding: "utf8" });
        }
        else if (plat === "linux" || plat === "darwin") {
            result = childProcess.execSync(`which ${appName}`, { encoding: "utf8" });
        }
    }
    catch (ex) {
        // Ignore the errors.
    }
    return result;
}
exports.detectApp = detectApp;
function validateArduinoPath(arduinoPath) {
    const platform = os.platform();
    let arduinoExe = "";
    if (platform === "darwin") {
        arduinoExe = path.join(arduinoPath, "Arduino.app/Contents/MacOS/Arduino");
    }
    else if (platform === "linux") {
        arduinoExe = path.join(arduinoPath, "arduino");
    }
    else if (platform === "win32") {
        arduinoExe = path.join(arduinoPath, "arduino_debug.exe");
    }
    return util_1.fileExistsSync(arduinoExe);
}
exports.validateArduinoPath = validateArduinoPath;

//# sourceMappingURL=platform.js.map
