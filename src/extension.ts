'use strict';
import * as vscode from 'vscode';
import * as path from 'path';
import * as Cache from 'vscode-cache';
import fileUtils from './utils/FileUtils';
import { componentSnippet } from './utils/Snippets';

export async function command(context: vscode.ExtensionContext) {
    const roots = fileUtils.workspaceRoots();

    if (roots.length > 0) {
        const cacheName = roots.map((r) => r.rootPath).join(';');
        const cache = new Cache(context, `workspace:${cacheName}`);

        const sortedRoots = fileUtils.sortRoots(
            roots,
            cache.get('recentRoots') || []
        );

        const dirSelection = await fileUtils.showQuickPick(
            fileUtils.dirQuickPickItems(sortedRoots, cache)
        );
        if (!dirSelection) return;
        const dir = dirSelection.option;

        const selectedRoot = fileUtils.rootForDir(roots, dir);
        fileUtils.cacheSelection(cache, dir, selectedRoot);

        const componentName = await fileUtils.showInputBox(
            'Component Name',
            'TestComponent'
        );
        if (!componentName) return;

        const componentPath = path.join(
            dir.fsLocation.absolute,
            componentName + '.js'
        );

        const snippet = componentSnippet(componentName);
        fileUtils.createFileOrFolder(componentPath, snippet);
        await fileUtils.openFile(componentPath);
    } else {
        await vscode.window.showErrorMessage(
            "It doesn't look like you have a folder opened in your workspace. " +
                'Try opening a folder first.'
        );
    }
}

export function activate(context: vscode.ExtensionContext) {
    let disposable = vscode.commands.registerCommand(
        'extension.createReactComponent',
        () => command(context)
    );

    context.subscriptions.push(disposable);
}

export function deactivate() {}
