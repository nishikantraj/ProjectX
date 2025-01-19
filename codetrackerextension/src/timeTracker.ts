import * as vscode from 'vscode';
import { ApiClient } from './apiClient';

interface TimeEntry {
    language: string;
    startTime: number;
    endTime: number;
}

export class TimeTracker {
    private sessionKey: string | null = null;
    private currentEntry: TimeEntry | null = null;
    private apiClient: ApiClient;
    private outputChannel: vscode.OutputChannel;
    private syncInterval: NodeJS.Timeout | null = null;
    private retryQueue: TimeEntry[] = [];
    private heartbeatInterval: number;
    private lastHeartbeat: number = 0;

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

    handleFileSave(document: vscode.TextDocument) {
        this.forceSyncCurrentEntry();
    }

    handleFileChange(document: vscode.TextDocument) {
        if (!this.sessionKey) {
            this.outputChannel.appendLine("Session key not set. Ignoring file change.");
            return;
        }

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
        if (!this.sessionKey) return;

        this.outputChannel.appendLine(`Syncing entry: ${JSON.stringify(entry)}`);
        try {
            await this.apiClient.sendTimeEntry({
                sessionKey: this.sessionKey,
                language: entry.language,
                duration: entry.endTime - entry.startTime,
            });
            this.outputChannel.appendLine("Sync successful.");
        } catch (error) {
            this.outputChannel.appendLine(`Failed to sync: ${error}`);
            this.retryQueue.push(entry);
        }
    }

    private async processRetryQueue() {
        if (this.retryQueue.length === 0) return;

        const entry = this.retryQueue[0];
        try {
            await this.syncEntry(entry);
            this.retryQueue.shift();
        } catch (error) {
            this.outputChannel.appendLine(`Retry failed: ${error}`);
        }
    }
}