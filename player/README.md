Player App
A desktop application built with Electron for displaying transparent PNG overlays triggered by global hotkeys.

Table of Contents
Introduction

Getting Started

Security Features

Global Hotkeys

Auto-Updates

Code Signing & Notarization

Release Checklist

Introduction
The Player App is designed to display dynamic, full-screen overlays on a user's desktop based on commands from a web-based admin dashboard. It uses a hardened Electron architecture for security and reliability, operating primarily in the background.

Getting Started
Development
Clone the repository.

Install dependencies:

Bash

npm install
Run the application in development mode:

Bash

npm start
This will start the main process and open the developer tools.

Building
To create distributable packages for macOS, Windows, and Linux:

Bash

npm run make
This command will use Electron Forge to generate platform-specific installers (.dmg, .exe, .deb, .rpm) in the out/ directory.

Publishing
To build and publish the application to GitHub Releases (as configured in forge.config.js):

Bash

npm run publish
Security Features
This application is built with a strong focus on security, adhering to Electron's recommended best practices.

Context Isolation: The main process's privileged APIs are isolated from the renderer's content. A dedicated preload.js script acts as a secure bridge, exposing only a minimal, whitelisted API via contextBridge.

Process Sandboxing: All renderer processes are sandboxed, limiting their access to system resources and mitigating the risk of a compromised renderer escalating to a full system compromise.

Strict Content Security Policy (CSP): The index.html and other renderer pages enforce a strict CSP that only allows resources from self, preventing the injection of unauthorized scripts or styles.

IPC Validation: All Inter-Process Communication (IPC) messages are validated against a predefined schema to prevent unexpected data or command injection.

Node.js Integration Disabled: Node.js integration is disabled for all renderer processes, a critical step in preventing remote code execution (RCE) attacks.

Global Hotkeys
Global hotkeys allow the app to be controlled even when it is not in focus. They are managed by the globalShortcut module and are registered when the app starts and unregistered when it quits.

The following hotkeys are enabled:

Display Overlay: Ctrl/Cmd + Alt/Option + Shift + [0-9]

Hides the current overlay and shows the one corresponding to the number key. Pressing the same hotkey again hides the overlay.

Hide All Overlays: Ctrl/Cmd + Alt/Option + Shift + H

Open Overlay Menu: Ctrl/Cmd + Alt/Option + Shift + O

Displays a small, semi-transparent window listing available overlays.

Auto-Updates
The application uses Electron's built-in autoUpdater module to handle seamless updates on macOS and Windows.

macOS & Windows: The app checks for updates on startup. If a new version is available, it is downloaded in the background. The user is then prompted to restart the application to install the update.

Linux: Updates on Linux are handled through the native package manager (e.g., apt or yum). The autoUpdater module does not have built-in support for Linux.

The update feed is configured to point to a static hosting service, which is populated by the npm run publish command.

Update Feed URLs:

macOS: https://static-updates.example.com/mac/

Windows: https://static-updates.example.com/win/

Code Signing & Notarization
Code signing and notarization are crucial for the integrity and trust of the application.

macOS Notarization: All macOS builds are signed with a Developer ID and notarized by Apple. This is a requirement for the app to be trusted by Gatekeeper and is also a prerequisite for the auto-updater to work on macOS. See scripts/notarize-macos.md for setup instructions.

Windows Code Signing: All Windows builds are signed with a code signing certificate. This helps to prevent SmartScreen warnings and is necessary for the auto-updater. See scripts/codesign-windows.md for setup instructions.

Release Checklist
Update version: Increment the version number in package.json.

Commit Changes: Commit all code changes to your repository.

Set Environment Variables: Ensure all required environment variables for code signing and notarization are set (e.g., APPLE_ID, WINDOWS_SIGNING_CERT_FILE).

Publish Release: Run npm run publish. This will build and upload the artifacts to the configured GitHub repository.

Verify Artifacts: Confirm that the new release has been created on GitHub and that the .dmg, .zip, and .exe files are correctly uploaded.

Test Updates: Test the auto-update flow with an older installed version of the app to ensure it successfully detects, downloads, and installs the new release.




----------



# Player Application Specifications

This document outlines the requirements for the Electron-based Player application. The app's primary function is to display full-screen, transparent PNG overlays based on global hotkeys configured in the web admin dashboard.

## 1. First-Time Setup & Pairing

-   **Initial Launch**: On first launch, the app should check for a locally stored `player_id`. If not found, it must enter "Pairing Mode".
-   **Pairing Mode**:
    -   The app should display a unique, easy-to-type **6-character alphanumeric pairing code** on the screen.
    -   This code should be sent to the backend API to register this player instance. The backend returns a unique `player_id`.
    -   The app should then persistently store this `player_id` locally (e.g., in `localStorage` or a config file).
    -   The web admin dashboard will have a field to enter this pairing code to associate the player with a name and begin managing its overlays.

## 2. Core Functionality

-   **Window Properties**: The Electron window should be full-screen, transparent, click-through (`setIgnoreMouseEvents(true)`), and always on top.
-   **Fetching Overlays**:
    -   On startup, the app should use its stored `player_id` to fetch its assigned overlay data from the backend API (`GET /api/players/{playerId}/overlays`).
    -   The API will provide a list of overlays, including metadata and a short-lived signed URL for each PNG asset.
-   **Caching**:
    -   The app **must** download and cache the PNG assets locally.
    -   The overlay metadata (hotkey assignments, file paths) should be stored in a local JSON file.
    -   This ensures the player can function offline without internet access.
    -   The app should periodically poll the backend API (e.g., every 5 minutes) to check for updates to the overlay list and re-cache if necessary.

## 3. Global Hotkeys

Global hotkeys must work whether the application is in focus or not. The `globalShortcut` module in Electron should be used.

-   **Display Overlay**: `Ctrl/Cmd + Alt/Option + Shift + [0-9]`
    -   Pressing one of these combinations should instantly display the corresponding overlay full-screen.
    -   If another overlay is already visible, it should be hidden and replaced by the new one.
    -   Pressing the same hotkey again should hide the currently visible overlay.

-   **Hide Current Overlay**: `Ctrl/Cmd + Alt/Option + Shift + H`
    -   This should hide any currently visible overlay.

-   **Open Overlay Menu**: `Ctrl/Cmd + Alt/Option + Shift + O`
    -   This should display a simple, non-click-through menu (e.g., a small, semi-transparent window).
    -   The menu should list all available overlays for this player.
    -   The currently active overlay should be highlighted.
    -   Selecting an overlay from this menu (if it's interactive) should show it. Deselecting it should hide it. This hotkey should also close the menu.

## 4. Uptime Reporting

-   The player should send a "ping" to the backend every minute to report that it is online.
-   This is a simple `POST` request to a dedicated endpoint (e.g., `POST /api/players/{playerId}/ping`).
-   The web dashboard will use the timestamp of the last ping to display the player's status (e.g., a green dot for "Online" if the last ping was within the last 2 minutes).
