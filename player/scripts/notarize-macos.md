## Notarization and Code Signing for macOS

This document provides the necessary commands and environment variables for code signing and notarizing the Player App on macOS. This process is required for the application to run smoothly on macOS and for the built-in auto-updater to function.

**Prerequisites**
- An Apple Developer Account.
- A Developer ID Application certificate installed in your Keychain.
- A Team ID from your Apple Developer account.
- An app-specific password for your Apple ID.

**Environment Variables**
Set the following environment variables in your CI/CD pipeline or local shell before running the `make` or `publish` commands.

```bash
# Your Apple ID
export APPLE_ID="your_apple_id@example.com"
# The app-specific password you generated
export APPLE_ID_PASSWORD="your_app_specific_password"
# Your Apple Team ID
export APPLE_TEAM_ID="YOURTEAMID"
# The name of your signing identity in Keychain
export APPLE_SIGNING_IDENTITY="Developer ID Application: Your Name (YOURTEAMID)"
