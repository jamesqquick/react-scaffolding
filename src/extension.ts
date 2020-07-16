'use strict';
import * as vscode from 'vscode';
import * as path from 'path';
import fileUtils, { DirectoryOption } from './utils/FileUtils';
import {
    getBasicComponentSnippet,
    getComponentThatLoadsDataSnippet,
} from './utils/Snippets';
import SnippetConfiguration from './models/SnippetConfiguration';

const getDirectorySelection = async (): Promise<DirectoryOption> => {
    const roots = fileUtils.workspaceRoots();
    if (roots.length > 0) {
        const choices = await fileUtils.dirQuickPickItems(roots);
        const dirSelection = await vscode.window.showQuickPick(choices, {
            placeHolder:
                'First, select an existing path to create relative to ' +
                '(larger projects may take a moment to load)',
        });
        if (!dirSelection) return;
        return dirSelection.option;
    } else {
        await vscode.window.showErrorMessage(
            "It doesn't look like you have a folder opened in your workspace. " +
                'Try opening a folder first.'
        );
        return null;
    }
};

const scaffoldFile = async (
    context: vscode.ExtensionContext,
    config: SnippetConfiguration
) => {
    try {
        //get the directory where the file will be created
        const dir = await getDirectorySelection();
        if (!dir) return;

        const componentName = await vscode.window.showInputBox({
            prompt: 'Component Name',
            placeHolder: 'TestComponent',
        });
        if (!componentName) return;

        const componentPath = path.join(
            dir.fsLocation.absolute,
            componentName + '.js'
        );

        //get additional required inputs from user
        const userInputs = [];
        if (config.inputs && config.inputs.length > 0) {
            for (const input of config.inputs) {
                const userInput = await vscode.window.showInputBox({
                    prompt: input.prompt,
                    placeHolder: input.placeholder,
                });
                if (!userInput) return;
                userInputs.push(userInput);
            }
        }
        const snippet = config.generateSnippet(componentName, ...userInputs);
        fileUtils.createFileOrFolder(componentPath, snippet);
        await fileUtils.openFile(componentPath);
    } catch (e) {
        console.error(e);
        return;
    }
};

export function activate(context: vscode.ExtensionContext) {
    context.subscriptions.push(
        vscode.commands.registerCommand('extension.createReactComponent', () =>
            scaffoldFile(context, { generateSnippet: getBasicComponentSnippet })
        )
    );

    context.subscriptions.push(
        vscode.commands.registerCommand(
            'extension.createReactComponentThatLoadsData',
            () =>
                scaffoldFile(context, {
                    inputs: [
                        {
                            name: 'dataName',
                            placeholder: 'ex. todoItems',
                            prompt: "What's do you call the data? (plural)",
                        },
                    ],
                    generateSnippet: getComponentThatLoadsDataSnippet,
                })
        )
    );
}

export function deactivate() {}
