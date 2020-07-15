'use strict';
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as mkdirp from 'mkdirp';
import { compact, startsWith, sortBy } from 'lodash';
import * as gitignoreToGlob from 'gitignore-to-glob';
import { sync as globSync } from 'glob';
import { QuickPickItem, ViewColumn } from 'vscode';

export interface FSLocation {
    relative: string;
    absolute: string;
}

export interface WorkspaceRoot {
    rootPath: string;
    baseName: string;
    multi: boolean;
}

export interface DirectoryOption {
    displayText: string;
    fsLocation: FSLocation;
}
declare module 'vscode' {
    interface QuickPickItem {
        option?: DirectoryOption;
    }
}

export function isFolderDescriptor(filepath: string): boolean {
    return filepath.charAt(filepath.length - 1) === path.sep;
}

export function invertGlob(pattern: string): string {
    return pattern.replace(/^!/, '');
}

export function walkupGitignores(dir: string, found: string[] = []): string[] {
    const gitignore = path.join(dir, '.gitignore');
    if (fs.existsSync(gitignore)) found.push(gitignore);

    const parentDir = path.resolve(dir, '..');
    const reachedSystemRoot = dir === parentDir;

    if (!reachedSystemRoot) {
        return walkupGitignores(parentDir, found);
    } else {
        return found;
    }
}

export function flatten(memo: any[], item: any): any[] {
    return memo.concat(item);
}

export function gitignoreGlobs(root: string): string[] {
    const gitignoreFiles = walkupGitignores(root);
    return gitignoreFiles.map((g) => gitignoreToGlob(g)).reduce(flatten, []);
}

export function configIgnoredGlobs(root: string): string[] {
    const configFilesExclude = Object.assign(
        [],
        vscode.workspace.getConfiguration('reactScaffolding').get('exclude'),
        vscode.workspace.getConfiguration(
            'files.exclude',
            vscode.Uri.file(root)
        )
    );
    const configIgnored = Object.keys(configFilesExclude).filter(
        (key) => configFilesExclude[key] === true
    );

    return gitignoreToGlob(configIgnored.join('\n'), { string: true });
}

export function directoriesSync(root: string): FSLocation[] {
    const ignore = gitignoreGlobs(root)
        .concat(configIgnoredGlobs(root))
        .map(invertGlob);

    const results = globSync('**', { cwd: root, ignore })
        .map(
            (f): FSLocation => {
                return {
                    relative: path.join(path.sep, f),
                    absolute: path.join(root, f),
                };
            }
        )
        .filter((f) => fs.statSync(f.absolute).isDirectory())
        .map((f) => f);

    return results;
}

export function convenienceOptions(
    roots: WorkspaceRoot[]
): vscode.QuickPickItem[] {
    const config: string[] = vscode.workspace
        .getConfiguration('reactScaffolding')
        .get('convenienceOptions');

    const optionsByName = {
        current: [
            buildQuickPickItem(
                currentEditorPathOption(roots),
                '- current file'
            ),
        ],
        root: rootOptions(roots).map((o) =>
            buildQuickPickItem(o, '- workspace root')
        ),
    };

    const options = config
        .map<vscode.QuickPickItem[]>((c) => optionsByName[c])
        .reduce(flatten);

    return compact<vscode.QuickPickItem>(options);
}

export async function subdirOptionsForRoot(
    root: WorkspaceRoot
): Promise<DirectoryOption[]> {
    const dirs = await directories(root.rootPath);

    return dirs.map(
        (dir: FSLocation): DirectoryOption => {
            const displayText = root.multi
                ? path.join(path.sep, root.baseName, dir.relative)
                : dir.relative;

            return {
                displayText,
                fsLocation: dir,
            };
        }
    );
}

export function directories(root: string): Promise<FSLocation[]> {
    return new Promise((resolve, reject) => {
        const findDirectories = () => {
            try {
                resolve(directoriesSync(root));
            } catch (error) {
                reject(error);
            }
        };

        const delayToAllowVSCodeToRender = 1;
        setTimeout(findDirectories, delayToAllowVSCodeToRender);
    });
}

export function buildQuickPickItem(
    option: DirectoryOption,
    description: string = null
): vscode.QuickPickItem {
    if (!option) return;

    return {
        label: option.displayText,
        description,
        option,
    };
}

export function currentEditorPath(): string {
    const activeEditor = vscode.window.activeTextEditor;
    if (!activeEditor) return;

    return path.dirname(activeEditor.document.fileName);
}

export function createFileOrFolder(absolutePath: string, data: string): void {
    let directoryToFile = path.dirname(absolutePath);

    if (!fs.existsSync(absolutePath)) {
        if (isFolderDescriptor(absolutePath)) {
            mkdirp.sync(absolutePath);
        } else {
            mkdirp.sync(directoryToFile);
            fs.appendFileSync(absolutePath, data);
        }
    }
}

export async function openFile(absolutePath: string): Promise<void> {
    if (isFolderDescriptor(absolutePath)) {
        const showInformationMessages = vscode.workspace
            .getConfiguration('reactScaffolding')
            .get('showInformationMessages', true);

        if (showInformationMessages) {
            vscode.window.showInformationMessage(
                `Folder created: ${absolutePath}`
            );
        }
    } else {
        const textDocument = await vscode.workspace.openTextDocument(
            absolutePath
        );

        if (textDocument) {
            vscode.window.showTextDocument(textDocument, ViewColumn.Active);
        }
    }
}

export function workspaceRoots(): WorkspaceRoot[] {
    if (vscode.workspace.workspaceFolders) {
        const multi = vscode.workspace.workspaceFolders.length > 1;

        return vscode.workspace.workspaceFolders.map((folder) => {
            return {
                rootPath: folder.uri.fsPath,
                baseName: path.basename(folder.uri.fsPath),
                multi,
            };
        });
    } else if (vscode.workspace.rootPath) {
        return [
            {
                rootPath: vscode.workspace.rootPath,
                baseName: path.basename(vscode.workspace.rootPath),
                multi: false,
            },
        ];
    } else {
        return [];
    }
}

export function rootOptions(roots: WorkspaceRoot[]): DirectoryOption[] {
    return roots.map(
        (root): DirectoryOption => {
            return {
                displayText: root.multi
                    ? path.join(path.sep, root.baseName)
                    : path.sep,
                fsLocation: {
                    relative: path.sep,
                    absolute: root.rootPath,
                },
            };
        }
    );
}

export function currentEditorPathOption(
    roots: WorkspaceRoot[]
): DirectoryOption {
    const currentFilePath = currentEditorPath();
    const currentFileRoot =
        currentFilePath &&
        roots.find((r) => currentFilePath.indexOf(r.rootPath) === 0);

    if (!currentFileRoot) return;

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

export async function dirQuickPickItems(
    roots: WorkspaceRoot[]
): Promise<vscode.QuickPickItem[]> {
    const dirOptions = await Promise.all(
        roots.map(async (r) => await subdirOptionsForRoot(r))
    );
    let quickPickItems = dirOptions
        .reduce(flatten)
        .map((o) => buildQuickPickItem(o));

    quickPickItems.unshift(...convenienceOptions(roots));

    return quickPickItems;
}

export function rootForDir(
    roots: WorkspaceRoot[],
    dir: DirectoryOption
): WorkspaceRoot {
    return roots.find((r) => startsWith(dir.fsLocation.absolute, r.rootPath));
}

export default {
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
