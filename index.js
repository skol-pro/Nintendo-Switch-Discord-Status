/* eslint-disable no-undef */
const path = require("path");
const fs = require("fs");
const { app } = require("electron");

// Load .env from the app's resource path (works in both dev and production)
let envPath;
if (app.isPackaged) {
    // Try multiple locations in the packaged app
    const locations = [
        path.join(process.resourcesPath, ".env"),
        path.join(path.dirname(app.getPath("exe")), "..", ".env"),
        path.join(app.getAppPath(), ".env"),
    ];
    envPath = locations.find((p) => fs.existsSync(p)) || locations[0];
    console.log("[ENV] Using .env from:", envPath);
} else {
    envPath = path.join(__dirname, ".env");
}

require("dotenv").config({ path: envPath });

const { BrowserWindow, ipcMain } = require("electron");
const rpc = require("discord-rich-presence")("647244885203877901");
const gameData = require("./games");
const IGDBAuth = require("./src/igdb-auth");
const IGDBAPI = require("./src/igdb-api");

// Initialize IGDB
const igdbAuth = new IGDBAuth(
    process.env.TWITCH_CLIENT_ID,
    process.env.TWITCH_CLIENT_SECRET
);
const igdbAPI = new IGDBAPI(igdbAuth);

// For the love of god please let there be a better way of handling this
if (require("./installer-events").handleSquirrelEvent(app)) throw false;

let window;
let dropdownWindow = null;

// Used to create the window
function createWindow() {
    window = new BrowserWindow({
        width: 615,
        height: 340,
        resizable: false,
        maximizable: false,
        icon: __dirname + "/icon.png",
        show: false,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
    });

    window.setMenu(null);
    window.loadFile("public/index.html");

    window.on("closed", () => {
        window = null;
        if (dropdownWindow) {
            dropdownWindow.close();
        }
    });

    window.on("ready-to-show", () => window.show());

    window.on("move", () => {
        if (dropdownWindow) {
            dropdownWindow.close();
        }
    });

    // Removed blur event handler that was causing dropdown to close immediately

    /* Uncomment this section to allow the dev panel to open automatically on unpackaged builds
    if(!app.isPackaged)
        window.openDevTools();
    */
    setIdle();
}

// Defines the vars that will contain game data
let name;
let customName;
let desc;
let img;
let coverUrl;
let idle;

// IPC Handlers for IGDB API
ipcMain.handle("igdb-popular", async () => {
    try {
        const games = await igdbAPI.getPopularGames();
        return { success: true, games };
    } catch (error) {
        console.error("[IGDB] Failed to get popular games:", error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle("igdb-search", async (event, query) => {
    try {
        const games = await igdbAPI.searchGames(query);
        return { success: true, games };
    } catch (error) {
        console.error("[IGDB] Search failed:", error);
        return { success: false, error: error.message };
    }
});

// IPC Handlers for dropdown window
ipcMain.on("open-dropdown", (event, { bounds, games, selectedGame }) => {
    if (dropdownWindow) {
        dropdownWindow.close();
    }

    const mainBounds = window.getBounds();

    dropdownWindow = new BrowserWindow({
        parent: window,
        width: bounds.width,
        height: 400,
        x: mainBounds.x + bounds.x,
        y: mainBounds.y + bounds.y,
        frame: false,
        transparent: true,
        resizable: false,
        movable: false,
        alwaysOnTop: true,
        skipTaskbar: true,
        show: false,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
    });

    dropdownWindow.loadFile("public/dropdown.html");

    dropdownWindow.once("ready-to-show", () => {
        dropdownWindow.webContents.send("init-dropdown", {
            games,
            selectedGame,
        });
        dropdownWindow.show();
        dropdownWindow.focus();
    });

    // Use a click outside handler instead of blur
    let blurTimeout;
    dropdownWindow.on("blur", () => {
        // Add a small delay to prevent immediate closing when clicking inside
        blurTimeout = setTimeout(() => {
            if (dropdownWindow && !dropdownWindow.isFocused()) {
                dropdownWindow.close();
            }
        }, 100);
    });

    dropdownWindow.on("focus", () => {
        if (blurTimeout) {
            clearTimeout(blurTimeout);
        }
    });

    dropdownWindow.on("closed", () => {
        if (blurTimeout) {
            clearTimeout(blurTimeout);
        }
        dropdownWindow = null;
    });
});

ipcMain.on("close-dropdown", () => {
    if (dropdownWindow) {
        dropdownWindow.close();
    }
});

ipcMain.on("resize-window", (event, { width, height }) => {
    if (window) {
        window.setSize(width, height);
    }
});

ipcMain.on("select-game", (event, game) => {
    window.webContents.send("game-selected", game);
    if (dropdownWindow) {
        dropdownWindow.close();
    }
});

ipcMain.on("search-games", async (event, query) => {
    try {
        console.log("[IGDB] Searching for:", query);
        const games = await igdbAPI.searchGames(query);
        console.log("[IGDB] Found", games?.length || 0, "games");
        if (games && games.length > 0) {
            console.log("[IGDB] First result:", games[0].name);
        }
        if (dropdownWindow) {
            dropdownWindow.webContents.send("search-results", {
                success: true,
                games: games || [],
            });
        }
    } catch (error) {
        console.error("[IGDB] Search failed:", error);
        if (dropdownWindow) {
            dropdownWindow.webContents.send("search-results", {
                success: false,
                error: error.message,
            });
        }
    }
});

// Executes when game data is received
ipcMain.on("game", (e, gameName, status, customName, cover) => {
    name = gameName;
    desc = status;
    customName = customName;
    coverUrl = cover;
    img = gameData.find((g) => g.name === gameName)?.img || "switch";
    setRPC();
});

// Executes when idle data is recieved
ipcMain.on("idle", (e, clicks) => {
    idle = clicks;
    setIdle();
});

ipcMain.handle("igdb-get-game", async (event, gameId) => {
    try {
        const game = await igdbAPI.getGameById(gameId);
        return { success: true, game };
    } catch (error) {
        console.error("[IGDB] Get game error:", error);
        return { success: false, error: error.message };
    }
});

// Sets the presence to idle
function setIdle() {
    if (idle === 16)
        return rpc.updatePresence({
            details: "Yoshi's Fucking Island",
            state: "ccomign This Sprign",
            largeImageKey: "yfi",
            largeImageText: "he's sitting there..",
        });
    rpc.updatePresence({
        details: "Home",
        state: "Idle",
        largeImageKey: "switch",
        largeImageText: "Home",
    });
}

// Finds the game image and sets the presence
function setRPC() {
    // Default fallback image
    img = "switch";

    // Find game in gameData for fallback image key
    for (i = 0; i < gameData.length; i++) {
        if (gameData[i].name === name) {
            img = gameData[i].img;
            break;
        }
    }

    // Log for debugging
    console.log("[RPC] Setting presence:", {
        game: name,
        coverUrl: coverUrl,
        fallbackImg: img,
    });

    // Try using direct HTTPS URL (some RPC implementations support this)
    // If it doesn't work, it will fall back to the asset key
    let imageKey = img;

    if (coverUrl && coverUrl.startsWith("http")) {
        // Try different formats that might work:
        // 1. Direct URL (some clients support this)
        // 2. mp: prefix (Discord Gateway API)
        // 3. external/ prefix (some implementations)
        imageKey = coverUrl; // Try direct URL first
        console.log("[RPC] Attempting external image:", imageKey);
    }

    rpc.updatePresence({
        details: name === "Custom" ? customName : name,
        state: desc || "Playing",
        largeImageKey: imageKey,
        largeImageText: name,
    });
}

// Events to listen for
app.on("ready", createWindow);

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
    if (window === null) createWindow();
});
