interface TimeEntryData {
    sessionKey: string;
    language: string;
    duration: number;
}

export class TestApiClient {
    private logEntries: TimeEntryData[] = [];
    
    async sendTimeEntry(data: TimeEntryData): Promise<void> {
        this.logEntries.push(data);
        
        // Log the entry that would be sent to database
        console.log('=== New Time Entry ===');
        console.log('Timestamp:', new Date().toISOString());
        console.log('Session Key:', data.sessionKey);
        console.log('Language:', data.language);
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