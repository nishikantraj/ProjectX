import * as vscode from 'vscode';
import { TimeTracker } from './timeTracker';
import { ApiClient } from './apiClient';

const HEARTBEAT_INTERVAL = 2 * 60 * 1000; // 2 minutes
const outputChannel = vscode.window.createOutputChannel("CodeTrackerExtension");

export function activate(context: vscode.ExtensionContext) {
    outputChannel.appendLine("Extension activated.");
    const apiClient = new ApiClient();
    const timeTracker = new TimeTracker(apiClient, outputChannel, HEARTBEAT_INTERVAL);

    // Load existing session key or prompt user
    const config = vscode.workspace.getConfiguration("codingTimeTracker");
    const sessionKey = config.get<string>("sessionKey");

    if (sessionKey) {
        timeTracker.setSessionKey(sessionKey);
        outputChannel.appendLine(`Session key loaded: ${sessionKey}`);
    } else {
        vscode.window.showInputBox({
            prompt: 'Enter session key:',
            placeHolder: 'Session key'
        }).then(async (result) => {
            if (result) {
                await config.update("sessionKey", result, vscode.ConfigurationTarget.Global);
                timeTracker.setSessionKey(result);
                outputChannel.appendLine(`Session key set: ${result}`);
            } else {
                outputChannel.appendLine("No session key entered. Tracking will not start.");
            }
        });
    }

    // Register session key input command
    const disposableCommand = vscode.commands.registerCommand('codingTimeTracker.inputSessionKey', async () => {
        const result = await vscode.window.showInputBox({
            prompt: 'Enter session key:',
            placeHolder: 'Session key'
        });

        if (result) {
            await config.update("sessionKey", result, vscode.ConfigurationTarget.Global);
            timeTracker.setSessionKey(result);
            outputChannel.appendLine(`Session key updated: ${result}`);
        }
    });

    // Register save and change handlers
    const disposableSave = vscode.workspace.onDidSaveTextDocument((document) => {
        timeTracker.handleFileSave(document);
    });

    const disposableChange = vscode.workspace.onDidChangeTextDocument((e) => {
        timeTracker.handleFileChange(e.document);
    });

    context.subscriptions.push(
        disposableCommand,
        disposableSave,
        disposableChange
    );
}

export function deactivate() {
    outputChannel.appendLine("Extension deactivated.");
}
