import * as vscode from 'vscode';
import { TimeTracker } from './timeTracker';
import { ApiClient } from './apiClient';

const HEARTBEAT_INTERVAL = 2 * 60 * 1000; // 2 minutes
const outputChannel = vscode.window.createOutputChannel("CodeTrackerExtension");

export function activate(context: vscode.ExtensionContext) {
    outputChannel.appendLine("Extension activated.");
    const apiClient = new ApiClient();
    const timeTracker = new TimeTracker(apiClient, outputChannel, HEARTBEAT_INTERVAL);

    // Register session key input command
    const disposableCommand = vscode.commands.registerCommand('codingTimeTracker.inputSessionKey', async () => {
        const result = await vscode.window.showInputBox({
            prompt: 'Enter session key:',
            placeHolder: 'Session key'
        });

        if (result) {
            await vscode.workspace.getConfiguration().update(
                'codingTimeTracker.sessionKey', 
                result, 
                vscode.ConfigurationTarget.Global
            );
            timeTracker.setSessionKey(result);
            outputChannel.appendLine(`Session key updated: ${result}`);
        }
    });

    // Register save handler
    const disposableSave = vscode.workspace.onDidSaveTextDocument((document) => {
        timeTracker.handleFileSave(document);
    });

    context.subscriptions.push(
        disposableCommand,
        disposableSave,
        vscode.workspace.onDidChangeTextDocument((e) => {
            timeTracker.handleFileChange(e.document);
        })
    );

    // Load existing session key
    const sessionKey = vscode.workspace.getConfiguration("codingTimeTracker").get<string>("sessionKey");
    if (sessionKey) {
        timeTracker.setSessionKey(sessionKey);
    }
}

export function deactivate() {
    outputChannel.appendLine("Extension deactivated.");
}