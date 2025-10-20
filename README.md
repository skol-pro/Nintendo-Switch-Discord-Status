# Nintendo Switch Discord Status
A moderately okay solution to display what you're playing on Nintendo Switch using Rich Presence on Discord.

## Introduction
**Nintendo Switch Discord Status** is a fork of [hobby-grade's version](https://github.com/hobby-grade/Nintendo-Switch-Discord-Status), which was itself a fork of ['NS-RPC'](https://github.com/Da532/NS-RPC) by Da532. This is an Electron app for Windows, Linux, and macOS that allows Switch users to display the game they're currently playing as their Discord status with Rich Presence.


![Nintendo Switch Discord Status Screenshot](https://i.imgur.com/PFOYhIX.png)

## Features
* Show off to non-Switch owners that you are a Nintendo Switch owner across all of Discord
* **Real-time game search** across the entire Nintendo Switch library
* **Game cover art display** in the dropdown selector
* **Always up-to-date** - automatically includes new game releases
* **Custom status messages** to let everyone know what you're doing in-game
* Type in custom game names for games not yet in the database

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

## Features & Usage
1. **Search for Games**: Start typing in the game selector to search the IGDB database
2. **Select a Game**: Choose from search results or browse recent releases
3. **Set Status**: Add a custom message like "Exploring Hyrule" or "Online with friends"
4. **Submit**: Click submit to update your Discord Rich Presence
5. **Go Idle**: Click "Idle" to show you're away from the game

## Need Help?
Open an issue on this page and I'll get back to you as soon as possible!  
