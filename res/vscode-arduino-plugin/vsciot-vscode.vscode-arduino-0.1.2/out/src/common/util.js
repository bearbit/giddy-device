"use strict";
/*--------------------------------------------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 *-------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const childProcess = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");
const properties = require("properties");
/**
 * This function will return the VSCode C/C++ extesnion compatible platform literals.
 * @function getCppConfigPlatform
 */
function getCppConfigPlatform() {
    const plat = os.platform();
    if (plat === "linux") {
        return "Linux";
    }
    else if (plat === "darwin") {
        return "Mac";
    }
    else if (plat === "win32") {
        return "Win32";
    }
}
exports.getCppConfigPlatform = getCppConfigPlatform;
/**
 * This function will detect the file existing in the sync mode.
 * @function fileExistsSync
 * @argument {string} filePath
 */
function fileExistsSync(filePath) {
    try {
        return fs.statSync(filePath).isFile();
    }
    catch (e) {
        return false;
    }
}
exports.fileExistsSync = fileExistsSync;
/**
 * This function will detect the directoy existing in the sync mode.
 * @function directoryExistsSync
 * @argument {string} dirPath
 */
function directoryExistsSync(dirPath) {
    try {
        return fs.statSync(dirPath).isDirectory();
    }
    catch (e) {
        return false;
    }
}
exports.directoryExistsSync = directoryExistsSync;
/**
 * This function will implement the same function as the fs.readdirSync,
 * besides it could filter out folders only when the second argument is true.
 * @function readdirSync
 * @argument {string} dirPath
 * @argument {boolean} folderOnly
 */
function readdirSync(dirPath, folderOnly = false) {
    const dirs = fs.readdirSync(dirPath);
    if (folderOnly) {
        return dirs.filter((subdir) => {
            return directoryExistsSync(path.join(dirPath, subdir));
        });
    }
    else {
        return dirs;
    }
}
exports.readdirSync = readdirSync;
/**
 * Recursively create directories. Equals to "mkdir -p"
 * @function mkdirRecursivelySync
 * @argument {string} dirPath
 */
function mkdirRecursivelySync(dirPath) {
    if (directoryExistsSync(dirPath)) {
        return;
    }
    const dirname = path.dirname(dirPath);
    if (path.normalize(dirname) === path.normalize(dirPath)) {
        fs.mkdirSync(dirPath);
    }
    else if (directoryExistsSync(dirname)) {
        fs.mkdirSync(dirPath);
    }
    else {
        mkdirRecursivelySync(dirname);
        fs.mkdirSync(dirPath);
    }
}
exports.mkdirRecursivelySync = mkdirRecursivelySync;
/**
 * Recursively delete files. Equals to "rm -rf"
 * @function rmdirRecursivelySync
 * @argument {string} rootPath
 */
function rmdirRecursivelySync(rootPath) {
    if (fs.existsSync(rootPath)) {
        fs.readdirSync(rootPath).forEach((file) => {
            const curPath = path.join(rootPath, file);
            if (fs.lstatSync(curPath).isDirectory()) {
                rmdirRecursivelySync(curPath);
            }
            else {
                fs.unlinkSync(curPath);
            }
        });
        fs.rmdirSync(rootPath);
    }
}
exports.rmdirRecursivelySync = rmdirRecursivelySync;
function copyFileSync(src, dest, overwrite = true) {
    if (!fileExistsSync(src) || (!overwrite && fileExistsSync(dest))) {
        return;
    }
    const BUF_LENGTH = 64 * 1024;
    const buf = new Buffer(BUF_LENGTH);
    let lastBytes = BUF_LENGTH;
    let pos = 0;
    let srcFd = null;
    let destFd = null;
    try {
        srcFd = fs.openSync(src, "r");
    }
    catch (error) {
    }
    try {
        destFd = fs.openSync(dest, "w");
    }
    catch (error) {
    }
    try {
        while (lastBytes === BUF_LENGTH) {
            lastBytes = fs.readSync(srcFd, buf, 0, BUF_LENGTH, pos);
            fs.writeSync(destFd, buf, 0, lastBytes);
            pos += lastBytes;
        }
    }
    catch (error) {
    }
    if (srcFd) {
        fs.closeSync(srcFd);
    }
    if (destFd) {
        fs.closeSync(destFd);
    }
}
function copyFolderRecursivelySync(src, dest) {
    if (!directoryExistsSync(src)) {
        return;
    }
    if (!directoryExistsSync(dest)) {
        mkdirRecursivelySync(dest);
    }
    const items = fs.readdirSync(src);
    for (const item of items) {
        const fullPath = path.join(src, item);
        const targetPath = path.join(dest, item);
        if (directoryExistsSync(fullPath)) {
            copyFolderRecursivelySync(fullPath, targetPath);
        }
        else if (fileExistsSync(fullPath)) {
            copyFileSync(fullPath, targetPath);
        }
    }
}
/**
 * Copy files & directories recursively. Equals to "cp -r"
 * @argument {string} src
 * @argument {string} dest
 */
function cp(src, dest) {
    if (fileExistsSync(src)) {
        let targetFile = dest;
        if (directoryExistsSync(dest)) {
            targetFile = path.join(dest, path.basename(src));
        }
        if (path.relative(src, targetFile)) {
            // if the source and target file is the same, skip copying.
            return;
        }
        copyFileSync(src, targetFile);
    }
    else if (directoryExistsSync(src)) {
        copyFolderRecursivelySync(src, dest);
    }
    else {
        throw new Error(`No such file or directory: ${src}`);
    }
}
exports.cp = cp;
/**
 * Check if the specified file is an arduino file (*.ino, *.pde).
 * @argument {string} filePath
 */
function isArduinoFile(filePath) {
    return fileExistsSync(filePath) && (path.extname(filePath) === ".ino" || path.extname(filePath) === ".pde");
}
exports.isArduinoFile = isArduinoFile;
function spawn(command, outputChannel, args = [], options = {}) {
    return new Promise((resolve, reject) => {
        const stdout = "";
        const stderr = "";
        options.cwd = options.cwd || path.resolve(path.join(__dirname, ".."));
        const child = childProcess.spawn(command, args, options);
        if (outputChannel) {
            child.stdout.on("data", (data) => { outputChannel.append(data.toString()); });
            child.stderr.on("data", (data) => { outputChannel.append(data.toString()); });
        }
        child.on("error", (error) => reject({ error, stderr, stdout }));
        child.on("exit", (code) => {
            if (code === 0) {
                resolve({ code, stdout, stderr });
            }
            else {
                reject({ code, stdout, stderr });
            }
        });
    });
}
exports.spawn = spawn;
function tryParseJSON(jsonString) {
    try {
        const jsonObj = JSON.parse(jsonString);
        if (jsonObj && typeof jsonObj === "object") {
            return jsonObj;
        }
    }
    catch (ex) { }
    return false;
}
exports.tryParseJSON = tryParseJSON;
function isJunk(filename) {
    // tslint:disable-next-line
    const re = /^npm-debug\.log$|^\..*\.swp$|^\.DS_Store$|^\.AppleDouble$|^\.LSOverride$|^Icon\r$|^\._.*|^\.Spotlight-V100(?:$|\/)|\.Trashes|^__MACOSX$|~$|^Thumbs\.db$|^ehthumbs\.db$|^Desktop\.ini$/;
    return re.test(filename);
}
exports.isJunk = isJunk;
function filterJunk(files) {
    return files.filter((file) => !isJunk(file));
}
exports.filterJunk = filterJunk;
function parseProperties(propertiesFile) {
    return new Promise((resolve, reject) => {
        properties.parse(propertiesFile, { path: true }, (error, obj) => {
            if (error) {
                reject(error);
            }
            else {
                resolve(obj);
            }
        });
    });
}
exports.parseProperties = parseProperties;
function formatVersion(version) {
    if (!version) {
        return version;
    }
    const versions = String(version).split(".");
    if (versions.length < 2) {
        versions.push("0");
    }
    if (versions.length < 3) {
        versions.push("0");
    }
    return versions.join(".");
}
exports.formatVersion = formatVersion;
function union(a, b, compare) {
    const result = [].concat(a);
    b.forEach((item) => {
        const exist = result.find((element) => {
            return (compare ? compare(item, element) : Object.is(item, element));
        });
        if (!exist) {
            result.push(item);
        }
    });
    return result;
}
exports.union = union;
/**
 * This method pads the current string with another string (repeated, if needed)
 * so that the resulting string reaches the given length.
 * The padding is applied from the start (left) of the current string.
 * @argument {string} sourceString
 * @argument {string} targetLength
 * @argument {string} padString
 */
function padStart(sourceString, targetLength, padString) {
    if (!sourceString) {
        return sourceString;
    }
    if (!String.prototype.padStart) {
        // https://github.com/uxitten/polyfill/blob/master/string.polyfill.js
        padString = String(padString || " ");
        if (sourceString.length > targetLength) {
            return sourceString;
        }
        else {
            targetLength = targetLength - sourceString.length;
            if (targetLength > padString.length) {
                padString += padString.repeat(targetLength / padString.length); // append to original to ensure we are longer than needed
            }
            return padString.slice(0, targetLength) + sourceString;
        }
    }
    else {
        return sourceString.padStart(targetLength, padString);
    }
}
exports.padStart = padStart;
function parseConfigFile(fullFileName, filterComment = true) {
    const result = new Map();
    const lineRegex = /(\S+)=(\S+)/;
    if (fileExistsSync(fullFileName)) {
        const rawText = fs.readFileSync(fullFileName, "utf8");
        const lines = rawText.split("\n");
        lines.forEach((line) => {
            if (line) {
                if (filterComment) {
                    if (line.trim() && line.startsWith("#")) {
                        return;
                    }
                }
                const match = lineRegex.exec(line);
                if (match && match.length > 2) {
                    result.set(match[1], match[2]);
                }
            }
        });
    }
    return result;
}
exports.parseConfigFile = parseConfigFile;

//# sourceMappingURL=util.js.map
