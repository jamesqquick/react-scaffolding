'use strict';
import * as vscode from 'vscode';
import * as path from 'path';
import fileUtils from './utils/FileUtils';
import { componentSnippet } from './utils/Snippets';

export async function command(context: vscode.ExtensionContext) {
    const roots = fileUtils.workspaceRoots();
    if (roots.length > 0) {
        const choices = await fileUtils.dirQuickPickItems(roots);
        const dirSelection = await vscode.window.showQuickPick(choices, {
            placeHolder:
                'First, select an existing path to create relative to ' +
                '(larger projects may take a moment to load)',
        });
        if (!dirSelection) return;
        const dir = dirSelection.option;

        try {
            const componentName = await vscode.window.showInputBox({
                prompt: 'Component Name',
                placeHolder: 'TestComponent',
            });
            if (!componentName) return;

            const componentPath = path.join(
                dir.fsLocation.absolute,
                componentName + '.js'
            );

            const snippet = componentSnippet(componentName);
            fileUtils.createFileOrFolder(componentPath, snippet);
            await fileUtils.openFile(componentPath);
        } catch (e) {
            console.error(e);
            return;
        }
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
