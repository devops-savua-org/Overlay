# Overlay, Player, and Management System

This is a full-stack application for managing and displaying real-time graphical overlays for screens in venues. It consists of three main components:

1.  **Frontend**: A web admin dashboard for managing players and their associated overlays.
2.  **Backend**: A serverless API built with Cloudflare Workers, KV, and R2.
3.  **Player**: An Electron desktop app (specifications provided) that displays the overlays.

## Features

-   **Web Dashboard**: Google Authentication, player provisioning, PNG overlay uploads with hotkey assignment, and uptime monitoring.
-   **Serverless Backend**: Manages player and overlay data (KV), stores overlay assets (R2), and provides secure, signed URLs for asset access.
-   **Player App**: Displays overlays full-screen, supports global hotkeys, caches assets for offline use, and pings the backend for uptime status.

## How to Run

### Backend (Cloudflare Worker)

1.  **Install dependencies**:
    ```bash
    npm install
    ```
2.  **Configure `wrangler.toml`**:
    -   Create the necessary KV namespaces: `PLAYERS_KV` and `OVERLAYS_KV`.
    -   Create the R2 bucket: `OVERLAY_ASSETS`.
    -   Add the binding information to `wrangler.toml`.
3.  **Run locally for development**:
    ```bash
    npm run dev
    ```
4.  **Deploy to Cloudflare**:
    ```bash
    npm run deploy
    ```

### Frontend (Web Admin Dashboard)

1.  **Configure API endpoint**:
    -   In `frontend/src/api.js`, update the `API_HOST` to point to your deployed worker's URL.
2.  **Configure Google Auth**:
    -   In `frontend/index.html`, replace `YOUR_GOOGLE_CLIENT_ID` with your actual Google Cloud Client ID.
3.  **Run locally**:
    -   Open the `frontend/index.html` file in a modern web browser, or serve the `frontend` directory with a simple web server:
    ```bash
    python -m http.server --directory frontend 8000
    ```

### Player (Electron App)

-   See `player/README.md` for the implementation specifications. The player app needs to be built separately based on those guidelines.

## Where to Edit

-   Backend logic is in `worker/src/handlers.js`.
-   Frontend views and logic are in `frontend/src/views/Dashboard.js` and `frontend/src/main.js`.
-   API communication is handled in `frontend/src/api.js`.
-   Styles are in `frontend/styles.css`.
