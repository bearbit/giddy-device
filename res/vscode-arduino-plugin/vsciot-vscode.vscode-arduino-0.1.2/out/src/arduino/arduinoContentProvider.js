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
const path = require("path");
const Uuid = require("uuid/v4");
const vscode = require("vscode");
const Constants = require("../common/constants");
const JSONHelper = require("../common/cycle");
const Logger = require("../logger/logger");
const localWebServer_1 = require("./localWebServer");
const vscodeSettings_1 = require("./vscodeSettings");
class ArduinoContentProvider {
    constructor(_settings, _arduinoApp, _extensionPath) {
        this._settings = _settings;
        this._arduinoApp = _arduinoApp;
        this._extensionPath = _extensionPath;
        this._onDidChange = new vscode.EventEmitter();
        this.initialize();
    }
    initialize() {
        this._webserver = new localWebServer_1.default(this._extensionPath);
        // Arduino Boards Manager
        this.addHandlerWithLogger("show-boardmanager", "/boardmanager", (req, res) => this.getHtmlView(req, res));
        this.addHandlerWithLogger("show-packagemanager", "/api/boardpackages", (req, res) => __awaiter(this, void 0, void 0, function* () { return yield this.getBoardPackages(req, res); }));
        this.addHandlerWithLogger("install-board", "/api/installboard", (req, res) => __awaiter(this, void 0, void 0, function* () { return yield this.installPackage(req, res); }), true);
        this.addHandlerWithLogger("uninstall-board", "/api/uninstallboard", (req, res) => __awaiter(this, void 0, void 0, function* () { return yield this.uninstallPackage(req, res); }), true);
        this.addHandlerWithLogger("open-link", "/api/openlink", (req, res) => __awaiter(this, void 0, void 0, function* () { return yield this.openLink(req, res); }), true);
        this.addHandlerWithLogger("open-settings", "/api/opensettings", (req, res) => this.openSettings(req, res), true);
        // Arduino Libraries Manager
        this.addHandlerWithLogger("show-librarymanager", "/librarymanager", (req, res) => this.getHtmlView(req, res));
        this.addHandlerWithLogger("load-libraries", "/api/libraries", (req, res) => __awaiter(this, void 0, void 0, function* () { return yield this.getLibraries(req, res); }));
        this.addHandlerWithLogger("install-library", "/api/installlibrary", (req, res) => __awaiter(this, void 0, void 0, function* () { return yield this.installLibrary(req, res); }), true);
        this.addHandlerWithLogger("uninstall-library", "/api/uninstalllibrary", (req, res) => __awaiter(this, void 0, void 0, function* () { return yield this.uninstallLibrary(req, res); }), true);
        this.addHandlerWithLogger("add-libpath", "/api/addlibpath", (req, res) => __awaiter(this, void 0, void 0, function* () { return yield this.addLibPath(req, res); }), true);
        // Arduino Board Config
        this.addHandlerWithLogger("show-boardconfig", "/boardconfig", (req, res) => this.getHtmlView(req, res));
        this.addHandlerWithLogger("load-configitems", "/api/configitems", (req, res) => __awaiter(this, void 0, void 0, function* () { return yield this.getBoardConfig(req, res); }));
        this.addHandlerWithLogger("update-config", "/api/updateconfig", (req, res) => __awaiter(this, void 0, void 0, function* () { return yield this.updateConfig(req, res); }), true);
        // Arduino Examples TreeView
        this.addHandlerWithLogger("show-examplesview", "/examples", (req, res) => this.getHtmlView(req, res));
        this.addHandlerWithLogger("load-examples", "/api/examples", (req, res) => __awaiter(this, void 0, void 0, function* () { return yield this.getExamples(req, res); }));
        this.addHandlerWithLogger("open-example", "/api/openexample", (req, res) => this.openExample(req, res), true);
        this._webserver.start();
    }
    provideTextDocumentContent(uri) {
        let type = "";
        if (uri.toString() === Constants.BOARD_MANAGER_URI.toString()) {
            type = "boardmanager";
        }
        else if (uri.toString() === Constants.LIBRARY_MANAGER_URI.toString()) {
            type = "librarymanager";
        }
        else if (uri.toString() === Constants.BOARD_CONFIG_URI.toString()) {
            type = "boardConfig";
        }
        else if (uri.toString() === Constants.EXAMPLES_URI.toString()) {
            type = "examples";
        }
        const timeNow = new Date().getTime();
        return `
        <html>
        <head>
            <script type="text/javascript">
                window.onload = function(event) {
                    console.log('reloaded results window at time ${timeNow}ms');
                    var doc = document.documentElement;
                    var styles = window.getComputedStyle(doc);
                    var backgroundcolor = styles.getPropertyValue('--background-color');
                    var color = styles.getPropertyValue('--color');
                    var theme = document.body.className;
                    var url = "${this._webserver.getEndpointUri(type)}?" +
                            "theme=" + theme +
                            "&backgroundcolor=" + backgroundcolor +
                            "&color=" + color;
                    document.getElementById('frame').src = url;
                };
            </script>
        </head>
        <body style="margin: 0; padding: 0; height: 100%; overflow: hidden;">
            <iframe id="frame" width="100%" height="100%" frameborder="0" style="position:absolute; left: 0; right: 0; bottom: 0; top: 0px;"/>
        </body>
        </html>`;
    }
    get onDidChange() {
        return this._onDidChange.event;
    }
    update(uri) {
        this._onDidChange.fire(uri);
    }
    getHtmlView(req, res) {
        return res.sendFile(path.join(this._extensionPath, "./out/html/index.html"));
    }
    getBoardPackages(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const update = (vscodeSettings_1.VscodeSettings.getIntance().autoUpdateIndexFiles && req.query.update === "true");
            yield this._arduinoApp.boardManager.loadPackages(update);
            return res.json({
                platforms: JSONHelper.decycle(this._arduinoApp.boardManager.platforms, undefined),
            });
        });
    }
    installPackage(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!req.body.packageName || !req.body.arch) {
                return res.status(400).send("BAD Request! Missing { packageName, arch } parameters!");
            }
            else {
                try {
                    yield this._arduinoApp.installBoard(req.body.packageName, req.body.arch, req.body.version);
                    return res.json({
                        status: "OK",
                    });
                }
                catch (error) {
                    return res.status(500).send(`Install board failed with message "code:${error.code}, err:${error.stderr}"`);
                }
            }
        });
    }
    uninstallPackage(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!req.body.packagePath) {
                return res.status(400).send("BAD Request! Missing { packagePath } parameter!");
            }
            else {
                try {
                    yield this._arduinoApp.uninstallBoard(req.body.boardName, req.body.packagePath);
                    return res.json({
                        status: "OK",
                    });
                }
                catch (error) {
                    return res.status(500).send(`Uninstall board failed with message "${error}"`);
                }
            }
        });
    }
    openLink(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!req.body.link) {
                return res.status(400).send("BAD Request! Missing { link } parameter!");
            }
            else {
                try {
                    yield vscode.commands.executeCommand("vscode.open", vscode.Uri.parse(req.body.link));
                    return res.json({
                        status: "OK",
                    });
                }
                catch (error) {
                    return res.status(500).send(`Cannot open the link with error message "${error}"`);
                }
            }
        });
    }
    openSettings(req, res) {
        vscode.commands.executeCommand("workbench.action.openGlobalSettings");
        return res.json({
            status: "OK",
        });
    }
    getLibraries(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const update = (vscodeSettings_1.VscodeSettings.getIntance().autoUpdateIndexFiles && req.query.update === "true");
            yield this._arduinoApp.libraryManager.loadLibraries(update);
            return res.json({
                libraries: this._arduinoApp.libraryManager.libraries,
            });
        });
    }
    installLibrary(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!req.body.libraryName) {
                return res.status(400).send("BAD Request! Missing { libraryName } parameters!");
            }
            else {
                try {
                    yield this._arduinoApp.installLibrary(req.body.libraryName, req.body.version);
                    return res.json({
                        status: "OK",
                    });
                }
                catch (error) {
                    return res.status(500).send(`Install library failed with message "code:${error.code}, err:${error.stderr}"`);
                }
            }
        });
    }
    uninstallLibrary(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!req.body.libraryPath) {
                return res.status(400).send("BAD Request! Missing { libraryPath } parameters!");
            }
            else {
                try {
                    yield this._arduinoApp.uninstallLibrary(req.body.libraryName, req.body.libraryPath);
                    return res.json({
                        status: "OK",
                    });
                }
                catch (error) {
                    return res.status(500).send(`Uninstall library failed with message "code:${error.code}, err:${error.stderr}"`);
                }
            }
        });
    }
    addLibPath(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!req.body.libraryPath) {
                return res.status(400).send("BAD Request! Missing { libraryPath } parameters!");
            }
            else {
                try {
                    yield this._arduinoApp.addLibPath(req.body.libraryPath);
                    yield this._arduinoApp.includeLibrary(req.body.libraryPath);
                    return res.json({
                        status: "OK",
                    });
                }
                catch (error) {
                    return res.status(500).send(`Add library path failed with message "code:${error.code}, err:${error.stderr}"`);
                }
            }
        });
    }
    getBoardConfig(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            return res.json({
                configitems: this._arduinoApp.boardManager.currentBoard.configItems,
            });
        });
    }
    updateConfig(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!req.body.configId || !req.body.optionId) {
                return res.status(400).send("BAD Request! Missing parameters!");
            }
            else {
                try {
                    this._arduinoApp.boardManager.currentBoard.updateConfig(req.body.configId, req.body.optionId);
                    return res.json({
                        status: "OK",
                    });
                }
                catch (error) {
                    return res.status(500).send(`Update board config failed with message "code:${error.code}, err:${error.stderr}"`);
                }
            }
        });
    }
    getExamples(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const examples = yield this._arduinoApp.exampleManager.loadExamples();
            return res.json({
                examples,
            });
        });
    }
    openExample(req, res) {
        if (!req.body.examplePath) {
            return res.status(400).send("BAD Request! Missing { examplePath } parameter!");
        }
        else {
            try {
                this._arduinoApp.openExample(req.body.examplePath);
                return res.json({
                    status: "OK",
                });
            }
            catch (error) {
                return res.status(500).send(`Cannot open the example folder with error message "${error}"`);
            }
        }
    }
    addHandlerWithLogger(handlerName, url, handler, post = false) {
        return __awaiter(this, void 0, void 0, function* () {
            const wrappedHandler = (req, res) => __awaiter(this, void 0, void 0, function* () {
                const guid = Uuid().replace(/\-/g, "");
                let properties = {};
                if (post) {
                    properties = Object.assign({}, req.body);
                }
                Logger.traceUserData(`start-` + handlerName, Object.assign({ correlationId: guid }, properties));
                const timer1 = new Logger.Timer();
                try {
                    yield Promise.resolve(handler(req, res));
                }
                catch (error) {
                    Logger.traceError("expressHandlerError", error, Object.assign({ correlationId: guid, handlerName }, properties));
                }
                Logger.traceUserData(`end-` + handlerName, { correlationId: guid, duration: timer1.end() });
            });
            if (post) {
                this._webserver.addPostHandler(url, wrappedHandler);
            }
            else {
                this._webserver.addHandler(url, wrappedHandler);
            }
        });
    }
}
exports.ArduinoContentProvider = ArduinoContentProvider;

//# sourceMappingURL=arduinoContentProvider.js.map
