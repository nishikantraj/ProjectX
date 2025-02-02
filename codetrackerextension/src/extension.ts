import * as vscode from 'vscode';

// Constants
const HEARTBEAT_INTERVAL = 2 * 60 * 1000; // 2 minutes
const INACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5 minutes
const outputChannel = vscode.window.createOutputChannel("CodeTrackerExtension");

// ApiClient (For sending the time entry data)
interface TimeEntryData {
    sessionKey: string;
    language: string;
    duration: number;
    startTime: string;
    endTime: string;
}

class ApiClient {
    private logEntries: TimeEntryData[] = [];

    async sendTimeEntry(data: TimeEntryData): Promise<void> {
        this.logEntries.push(data);

        // Log the entry that would be sent to the database
        console.log('=== New Time Entry ===');
        console.log('Timestamp (Logged at):', new Date().toISOString());
        console.log('Session Key:', data.sessionKey);
        console.log('Language:', data.language);
        console.log('Start Time:', data.startTime);
        console.log('End Time:', data.endTime);
        console.log('Duration (ms):', data.duration);
        console.log('Duration (min):', (data.duration / 60000).toFixed(2));
        console.log('==================\n');

        // Simulate random API failures for testing retry mechanism
        if (Math.random() < 0.2) { // 20% chance of failure
            throw new Error('Simulated API failure');
        }

        return Promise.resolve();
    }

    // Helper method to get all logged entries
    getLoggedEntries(): TimeEntryData[] {
        return this.logEntries;
    }
}

// TimeTracker (For managing time tracking and syncing data)
interface TimeEntry {
    language: string;
    startTime: number;
    endTime: number;
}

class TimeTracker {
    private sessionKey: string | null = null;
    private currentEntry: TimeEntry | null = null;
    private apiClient: ApiClient;
    private outputChannel: vscode.OutputChannel;
    private syncInterval: NodeJS.Timeout | null = null;
    private retryQueue: TimeEntry[] = [];
    private heartbeatInterval: number;
    private lastHeartbeat: number = 0;
    private inactivityTimer: NodeJS.Timeout | null = null; // Timer for inactivity detection

    constructor(
        apiClient: ApiClient,
        outputChannel: vscode.OutputChannel,
        heartbeatInterval: number
    ) {
        this.apiClient = apiClient;
        this.outputChannel = outputChannel;
        this.heartbeatInterval = heartbeatInterval;
    }

    setSessionKey(key: string) {
        this.sessionKey = key;
        this.outputChannel.appendLine(`Session key set: ${key}`);
        this.setupSync();
    }

    private setupSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
        }

        this.syncInterval = setInterval(() => {
            this.processRetryQueue();
            this.syncCurrentEntry();
        }, this.heartbeatInterval);
    }

    // Reset the inactivity timer whenever there's activity
    private resetInactivityTimer() {
        if (this.inactivityTimer) {
            clearTimeout(this.inactivityTimer);
        }
        this.inactivityTimer = setTimeout(() => {
            this.handleInactivity();
        }, INACTIVITY_TIMEOUT);
    }

    // Handle inactivity (e.g., force sync the current entry)
    private handleInactivity() {
        this.outputChannel.appendLine("User inactive. Force syncing current entry.");
        this.forceSyncCurrentEntry();
    }

    handleFileSave(document: vscode.TextDocument) {
        this.resetInactivityTimer(); // Reset timer on file save
        this.forceSyncCurrentEntry();
    }

    handleFileChange(document: vscode.TextDocument) {
        if (!this.sessionKey) {
            this.outputChannel.appendLine("Session key not set. Ignoring file change.");
            return;
        }

        this.resetInactivityTimer(); // Reset timer on file change

        const now = Date.now();
        const language = document.languageId;

        if (now - this.lastHeartbeat >= this.heartbeatInterval) {
            this.lastHeartbeat = now;
            this.forceSyncCurrentEntry();
        }

        if (!this.currentEntry || this.currentEntry.language !== language) {
            if (this.currentEntry) {
                this.forceSyncCurrentEntry();
            }
            this.currentEntry = {
                language,
                startTime: now,
                endTime: now,
            };
            this.outputChannel.appendLine(`Started tracking: ${language}`);
        } else {
            this.currentEntry.endTime = now;
        }
    }

    private async forceSyncCurrentEntry() {
        if (this.currentEntry) {
            await this.syncEntry(this.currentEntry);
            this.currentEntry = null;
        }
    }

    private async syncCurrentEntry() {
        if (this.currentEntry) {
            const entry = { ...this.currentEntry };
            await this.syncEntry(entry);
        }
    }

    private async syncEntry(entry: TimeEntry) {
        if (!this.sessionKey){
            return;
        } 

        this.outputChannel.appendLine(`Syncing entry: ${JSON.stringify(entry)}`);
        try {
            await this.apiClient.sendTimeEntry({
                sessionKey: this.sessionKey,
                language: entry.language,
                duration: entry.endTime - entry.startTime,
                startTime: new Date(entry.startTime).toISOString(),
                endTime: new Date(entry.endTime).toISOString(), 
            });
            this.outputChannel.appendLine("Sync successful.");
        } catch (error) {
            this.outputChannel.appendLine(`Failed to sync: ${error}`);
            this.retryQueue.push(entry);
        }
    }

    private async processRetryQueue() {
        if (this.retryQueue.length === 0){    
            return;
        }

        const entry = this.retryQueue[0];
        try {
            await this.syncEntry(entry);
            this.retryQueue.shift();
        } catch (error) {
            this.outputChannel.appendLine(`Retry failed: ${error}`);
        }
    }
}

// Extension Activation
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

// Extension Deactivation
export function deactivate() {
    outputChannel.appendLine("Extension deactivated.");
}