# CodeTrackerExtension

CodeTrackerExtension is a VS Code extension that tracks your coding activity and logs it for analysis. This extension allows you to set a unique session key to sync your coding activity.

## Features
- Tracks coding activity by file type (language).
- Logs time spent editing files.
- Syncs data with a backend or mock server (for testing).
- Configuration persistence for session keys.

## Prerequisites
1. **Node.js**: Ensure you have Node.js (v14 or later) installed. [Download Node.js](https://nodejs.org/)
2. **VS Code**: Install Visual Studio Code. [Download VS Code](https://code.visualstudio.com/)

## Steps to Run the Extension Locally

### 1. Clone the Repository
Clone the repository to your local machine:
```bash
git clone <repository-url>
```
### 2. Navigate to the project directory
```bash
cd codetrackerextension
```
### 3. Install Dependencies
```bash
npm install
```
### 4. Compile the Extension
```bash
npm run compile
```
1. Press F5 or go to the Run and Debug view (Ctrl+Shift+D) and click Start Debugging.
2. A new VS Code window (Extension Development Host) will open with the extension loaded.

### 5. Test the Extension
1. Open the command palette (Ctrl+Shift+P) and run the command **Code Tracker**.
2. Enter your session key when prompted.(For testing purpose put any dummy string. Ex: test12)
3. Edit or save files in the editor to see activity being logged in the Output Channel(2nd left of Terminal) named CodeTrackerExtension.

### 6. View Output Logs
In the 1st VSCode window, open Debug console to view the logs.