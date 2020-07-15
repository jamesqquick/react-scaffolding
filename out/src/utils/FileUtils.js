'use strict';
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.rootForDir = exports.dirQuickPickItems = exports.currentEditorPathOption = exports.rootOptions = exports.workspaceRoots = exports.openFile = exports.createFileOrFolder = exports.currentEditorPath = exports.buildQuickPickItem = exports.directories = exports.subdirOptionsForRoot = exports.convenienceOptions = exports.directoriesSync = exports.configIgnoredGlobs = exports.gitignoreGlobs = exports.flatten = exports.walkupGitignores = exports.invertGlob = exports.isFolderDescriptor = void 0;
const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
const mkdirp = require("mkdirp");
const lodash_1 = require("lodash");
const gitignoreToGlob = require("gitignore-to-glob");
const glob_1 = require("glob");
const vscode_1 = require("vscode");
function isFolderDescriptor(filepath) {
    return filepath.charAt(filepath.length - 1) === path.sep;
}
exports.isFolderDescriptor = isFolderDescriptor;
function invertGlob(pattern) {
    return pattern.replace(/^!/, '');
}
exports.invertGlob = invertGlob;
function walkupGitignores(dir, found = []) {
    const gitignore = path.join(dir, '.gitignore');
    if (fs.existsSync(gitignore))
        found.push(gitignore);
    const parentDir = path.resolve(dir, '..');
    const reachedSystemRoot = dir === parentDir;
    if (!reachedSystemRoot) {
        return walkupGitignores(parentDir, found);
    }
    else {
        return found;
    }
}
exports.walkupGitignores = walkupGitignores;
function flatten(memo, item) {
    return memo.concat(item);
}
exports.flatten = flatten;
function gitignoreGlobs(root) {
    const gitignoreFiles = walkupGitignores(root);
    return gitignoreFiles.map((g) => gitignoreToGlob(g)).reduce(flatten, []);
}
exports.gitignoreGlobs = gitignoreGlobs;
function configIgnoredGlobs(root) {
    const configFilesExclude = Object.assign([], vscode.workspace.getConfiguration('reactScaffolding').get('exclude'), vscode.workspace.getConfiguration('files.exclude', vscode.Uri.file(root)));
    const configIgnored = Object.keys(configFilesExclude).filter((key) => configFilesExclude[key] === true);
    return gitignoreToGlob(configIgnored.join('\n'), { string: true });
}
exports.configIgnoredGlobs = configIgnoredGlobs;
function directoriesSync(root) {
    const ignore = gitignoreGlobs(root)
        .concat(configIgnoredGlobs(root))
        .map(invertGlob);
    const results = glob_1.sync('**', { cwd: root, ignore })
        .map((f) => {
        return {
            relative: path.join(path.sep, f),
            absolute: path.join(root, f),
        };
    })
        .filter((f) => fs.statSync(f.absolute).isDirectory())
        .map((f) => f);
    return results;
}
exports.directoriesSync = directoriesSync;
function convenienceOptions(roots) {
    const config = vscode.workspace
        .getConfiguration('reactScaffolding')
        .get('convenienceOptions');
    const optionsByName = {
        current: [
            buildQuickPickItem(currentEditorPathOption(roots), '- current file'),
        ],
        root: rootOptions(roots).map((o) => buildQuickPickItem(o, '- workspace root')),
    };
    const options = config
        .map((c) => optionsByName[c])
        .reduce(flatten);
    return lodash_1.compact(options);
}
exports.convenienceOptions = convenienceOptions;
function subdirOptionsForRoot(root) {
    return __awaiter(this, void 0, void 0, function* () {
        const dirs = yield directories(root.rootPath);
        return dirs.map((dir) => {
            const displayText = root.multi
                ? path.join(path.sep, root.baseName, dir.relative)
                : dir.relative;
            return {
                displayText,
                fsLocation: dir,
            };
        });
    });
}
exports.subdirOptionsForRoot = subdirOptionsForRoot;
function directories(root) {
    return new Promise((resolve, reject) => {
        const findDirectories = () => {
            try {
                resolve(directoriesSync(root));
            }
            catch (error) {
                reject(error);
            }
        };
        const delayToAllowVSCodeToRender = 1;
        setTimeout(findDirectories, delayToAllowVSCodeToRender);
    });
}
exports.directories = directories;
function buildQuickPickItem(option, description = null) {
    if (!option)
        return;
    return {
        label: option.displayText,
        description,
        option,
    };
}
exports.buildQuickPickItem = buildQuickPickItem;
function currentEditorPath() {
    const activeEditor = vscode.window.activeTextEditor;
    if (!activeEditor)
        return;
    return path.dirname(activeEditor.document.fileName);
}
exports.currentEditorPath = currentEditorPath;
function createFileOrFolder(absolutePath, data) {
    let directoryToFile = path.dirname(absolutePath);
    if (!fs.existsSync(absolutePath)) {
        if (isFolderDescriptor(absolutePath)) {
            mkdirp.sync(absolutePath);
        }
        else {
            mkdirp.sync(directoryToFile);
            fs.appendFileSync(absolutePath, data);
        }
    }
}
exports.createFileOrFolder = createFileOrFolder;
function openFile(absolutePath) {
    return __awaiter(this, void 0, void 0, function* () {
        if (isFolderDescriptor(absolutePath)) {
            const showInformationMessages = vscode.workspace
                .getConfiguration('reactScaffolding')
                .get('showInformationMessages', true);
            if (showInformationMessages) {
                vscode.window.showInformationMessage(`Folder created: ${absolutePath}`);
            }
        }
        else {
            const textDocument = yield vscode.workspace.openTextDocument(absolutePath);
            if (textDocument) {
                vscode.window.showTextDocument(textDocument, vscode_1.ViewColumn.Active);
            }
        }
    });
}
exports.openFile = openFile;
function workspaceRoots() {
    if (vscode.workspace.workspaceFolders) {
        const multi = vscode.workspace.workspaceFolders.length > 1;
        return vscode.workspace.workspaceFolders.map((folder) => {
            return {
                rootPath: folder.uri.fsPath,
                baseName: path.basename(folder.uri.fsPath),
                multi,
            };
        });
    }
    else if (vscode.workspace.rootPath) {
        return [
            {
                rootPath: vscode.workspace.rootPath,
                baseName: path.basename(vscode.workspace.rootPath),
                multi: false,
            },
        ];
    }
    else {
        return [];
    }
}
exports.workspaceRoots = workspaceRoots;
function rootOptions(roots) {
    return roots.map((root) => {
        return {
            displayText: root.multi
                ? path.join(path.sep, root.baseName)
                : path.sep,
            fsLocation: {
                relative: path.sep,
                absolute: root.rootPath,
            },
        };
    });
}
exports.rootOptions = rootOptions;
function currentEditorPathOption(roots) {
    const currentFilePath = currentEditorPath();
    const currentFileRoot = currentFilePath &&
        roots.find((r) => currentFilePath.indexOf(r.rootPath) === 0);
    if (!currentFileRoot)
        return;
    const rootMatcher = new RegExp(`^${currentFileRoot.rootPath}`);
    let relativeCurrentFilePath = currentFilePath.replace(rootMatcher, '');
    relativeCurrentFilePath =
        relativeCurrentFilePath === '' ? path.sep : relativeCurrentFilePath;
    const displayText = currentFileRoot.multi
        ? path.join(path.sep, currentFileRoot.baseName, relativeCurrentFilePath)
        : relativeCurrentFilePath;
    return {
        displayText,
        fsLocation: {
            relative: relativeCurrentFilePath,
            absolute: currentFilePath,
        },
    };
}
exports.currentEditorPathOption = currentEditorPathOption;
function dirQuickPickItems(roots) {
    return __awaiter(this, void 0, void 0, function* () {
        const dirOptions = yield Promise.all(roots.map((r) => __awaiter(this, void 0, void 0, function* () { return yield subdirOptionsForRoot(r); })));
        let quickPickItems = dirOptions
            .reduce(flatten)
            .map((o) => buildQuickPickItem(o));
        quickPickItems.unshift(...convenienceOptions(roots));
        return quickPickItems;
    });
}
exports.dirQuickPickItems = dirQuickPickItems;
function rootForDir(roots, dir) {
    return roots.find((r) => lodash_1.startsWith(dir.fsLocation.absolute, r.rootPath));
}
exports.rootForDir = rootForDir;
exports.default = {
    invertGlob,
    isFolderDescriptor,
    flatten,
    gitignoreGlobs,
    configIgnoredGlobs,
    directoriesSync,
    convenienceOptions,
    subdirOptionsForRoot,
    directories,
    buildQuickPickItem,
    currentEditorPath,
    createFileOrFolder,
    openFile,
    workspaceRoots,
    rootOptions,
    currentEditorPathOption,
    dirQuickPickItems,
    rootForDir,
};
//# sourceMappingURL=FileUtils.js.map