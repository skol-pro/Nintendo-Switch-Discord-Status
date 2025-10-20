# Nintendo Switch Discord Status
A moderately okay solution to display what you're playing on Nintendo Switch using Rich Presence on Discord.

## Introduction
"Nintendo Switch Discord Status" is a somewhat competent fork of ['NS-RPC' (Nintendo Nintendo Switch Discord Status)](https://github.com/Da532/NS-RPC), an Electron app for Windows, Linux, and macOS that allows Switch users to display
the game they're currently playing as their Discord status with Rich Presence.


![Nintendo Switch Discord Status Screenshot](https://i.imgur.com/PFOYhIX.png)

### With Nintendo Switch Discord Status you can...
* Show off to non-Switch owners that you are a Nintendo Switch owner across all of Discord.
* **Search and select from thousands of Nintendo Switch games** with real-time IGDB integration.
* Get automatic updates with the latest game releases - no more waiting for manual updates!
* Set a custom status message to let everyone know exactly what you're doing in-game.
* Type in custom game names for games not yet in the database.

### What's New in v2.0
This version introduces **live game search with real-time access to the entire Nintendo Switch library**! Instead of a static list of ~300 games, you now have:

* Real-time game search across the entire Nintendo Switch library
* Game cover art display in the dropdown
* Modern redesigned interface with improved UX
* Smart filtering that automatically excludes DLCs
* Sorted results by release date (newest first)
* Recent games loaded on startup

**Technical Improvements:**
* New IGDB API integration with wildcard search
* Improved error handling and .env file loading
* Enhanced build system with electron-builder
* Icon generation tooling for all platforms
* Optimized package structure

**Note**: The old limitation of Discord's 300 art assets no longer affects game selection. You can search for any Nintendo Switch game! The app uses the generic Nintendo Switch icon for Discord Rich Presence, while game covers are shown in the app itself.

## Prerequisites
* [Discord App](https://discordapp.com) installed on your machine
* Internet connection (required for game search)

## Installation
Download the latest release for your platform from [GitHub Releases](https://github.com/skol-pro/Nintendo-Switch-Discord-Status/releases):

* **macOS**: Download the appropriate `.dmg` file for your Mac (Intel or Apple Silicon)
* **Windows**: Download the `.exe` installer
* **Linux**: Download the `.AppImage` file

**Note for macOS/Windows users**: You may encounter SmartScreen (Windows) or Gatekeeper (macOS) warnings. You'll need to allow the application through these security features to use it.

## Building From Source
Building from source is straightforward if you have the tools.

Required packages: [Node.js](https://nodejs.org/) (v14 or higher recommended).

1. Once Node.js is installed, git clone or download and extract the source files to your chosen directory.
2. Open a terminal window in that directory.
3. Install dependencies: `npm install`
4. Create a `.env` file with your IGDB API credentials (see `.env.example` for format)
5. Generate icons (optional): `npm run generate-icons`
6. Build the Svelte components: `npm run svelte-build`
7. Run the application: `npm start`

### Building Distributables
Build installers for all platforms:
```bash
npm run build:all        # All platforms
npm run build:mac        # macOS only (DMG)
npm run build:win        # Windows only (EXE)
npm run build:linux      # Linux only (AppImage)
```

For development builds (faster, unsigned):
```bash
npm run build:mac-unsigned
```

## Features & Usage
1. **Search for Games**: Start typing in the game selector to search the IGDB database
2. **Select a Game**: Choose from search results or browse recent releases
3. **Set Status**: Add a custom message like "Exploring Hyrule" or "Online with friends"
4. **Submit**: Click submit to update your Discord Rich Presence
5. **Go Idle**: Click "Idle" to show you're away from the game

## Need Help?
Open an issue on this page and I'll get back to you as soon as possible!  
