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
