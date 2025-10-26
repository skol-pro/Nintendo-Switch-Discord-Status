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
        path.join(process.resourcesPath, "app.asar.unpacked", ".env"),
        path.join(path.dirname(app.getPath("exe")), "..", ".env"),
        path.join(path.dirname(app.getPath("exe")), ".env"),
        path.join(app.getAppPath(), ".env"),
    ];
    envPath = locations.find((p) => fs.existsSync(p)) || locations[0];
} else {
    envPath = path.join(__dirname, ".env");
}

const envResult = require("dotenv").config({ path: envPath });
if (envResult.error) {
    console.warn("Warning: Could not load .env file:", envResult.error.message);
}

const { BrowserWindow, ipcMain, dialog, shell, Menu } = require("electron");
const https = require("https");
const rpc = require("discord-rich-presence")("647244885203877901");
const gameData = require("./games");
const IGDBAuth = require("./src/igdb-auth");
const IGDBAPI = require("./src/igdb-api");

// Initialize IGDB with error handling
console.log("=".repeat(50));
console.log("[STARTUP] Initializing IGDB...");
console.log("[ENV] TWITCH_CLIENT_ID present:", !!process.env.TWITCH_CLIENT_ID);
console.log(
    "[ENV] TWITCH_CLIENT_SECRET present:",
    !!process.env.TWITCH_CLIENT_SECRET
);

let igdbAuth;
let igdbAPI;
let igdbAvailable = false;

try {
    if (process.env.TWITCH_CLIENT_ID && process.env.TWITCH_CLIENT_SECRET) {
        console.log("[IGDB] Credentials found, initializing...");
        igdbAuth = new IGDBAuth(
            process.env.TWITCH_CLIENT_ID,
            process.env.TWITCH_CLIENT_SECRET
        );
        igdbAPI = new IGDBAPI(igdbAuth);
        igdbAvailable = true;
        console.log("[IGDB] ✅ Initialized successfully - IGDB search enabled");
    } else {
        console.warn(
            "[IGDB] ⚠️ Credentials not found in .env - using fallback mode"
        );
        console.warn("[IGDB] Search will use local games.json only");
    }
} catch (error) {
    console.error("[IGDB] ❌ Initialization failed:", error);
    console.warn("[IGDB] Using fallback mode with games.json");
}
console.log(
    "[IGDB] Mode:",
    igdbAvailable ? "ONLINE (IGDB)" : "OFFLINE (Local)"
);
console.log("=".repeat(50));

// For the love of god please let there be a better way of handling this
if (require("./installer-events").handleSquirrelEvent(app)) throw false;

let window;
let dropdownWindow = null;

// Compare semantic versions (returns true if v1 > v2)
function compareVersions(v1, v2) {
    const parts1 = v1.split(".").map(Number);
    const parts2 = v2.split(".").map(Number);

    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
        const num1 = parts1[i] || 0;
        const num2 = parts2[i] || 0;

        if (num1 > num2) return true;
        if (num1 < num2) return false;
    }

    return false; // Versions are equal
}

// Check for updates
function checkForUpdates() {
    const currentVersion = app.getVersion();

    https
        .get(
            {
                hostname: "api.github.com",
                path: "/repos/skol-pro/Nintendo-Switch-Discord-Status/releases/latest",
                headers: { "User-Agent": "Nintendo-Switch-Discord-Status" },
            },
            (res) => {
                let data = "";
                res.on("data", (chunk) => (data += chunk));
                res.on("end", () => {
                    try {
                        const release = JSON.parse(data);
                        const latestVersion = release.tag_name.replace("v", "");

                        // Compare versions properly (semver)
                        const isNewer = compareVersions(
                            latestVersion,
                            currentVersion
                        );

                        if (isNewer) {
                            dialog
                                .showMessageBox(window, {
                                    type: "info",
                                    title: "Update Available",
                                    message: `Version ${latestVersion} is available!`,
                                    detail: `You're currently on version ${currentVersion}.\n\nWould you like to download the update?`,
                                    buttons: ["Download", "Skip"],
                                    defaultId: 0,
                                    cancelId: 1,
                                })
                                .then((result) => {
                                    if (result.response === 0) {
                                        shell.openExternal(release.html_url);
                                    }
                                });
                        }
                    } catch (error) {
                        console.error("[Update Check] Failed:", error);
                    }
                });
            }
        )
        .on("error", (error) => {
            console.error("[Update Check] Network error:", error);
        });
}

// Used to create the window
function createWindow() {
    window = new BrowserWindow({
        width: 625,
        height: 345,
        resizable: false,
        maximizable: false,
        icon: __dirname + "/icon.png",
        show: false,
        frame: false,
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
        if (igdbAvailable) {
            const games = await igdbAPI.getPopularGames();
            console.log(`[IGDB] Loaded ${games.length} popular games`);
            return { success: true, games };
        } else {
            // Fallback: return games from games.json (no covers available)
            console.log("[IGDB] Using fallback games.json for popular games");
            const fallbackGames = gameData
                .filter((g) => g.name !== "Home" && g.name !== "Custom")
                .slice(0, 50)
                .map((g) => ({
                    name: g.name,
                    img: g.img,
                    cover_url: null, // No covers in fallback mode
                }));
            return { success: true, games: fallbackGames };
        }
    } catch (error) {
        console.error("[IGDB] Failed to get popular games:", error);
        // Fallback to games.json on error
        const fallbackGames = gameData
            .filter((g) => g.name !== "Home" && g.name !== "Custom")
            .slice(0, 50)
            .map((g) => ({
                name: g.name,
                img: g.img,
                cover_url: null,
            }));
        return { success: true, games: fallbackGames };
    }
});

ipcMain.handle("igdb-search", async (event, query) => {
    try {
        if (igdbAvailable) {
            const games = await igdbAPI.searchGames(query);
            console.log(
                `[IGDB] Search for "${query}" found ${games.length} games`
            );
            return { success: true, games };
        } else {
            // Fallback: search in local games.json
            console.log(`[IGDB] Using fallback search for: "${query}"`);
            const filtered = gameData
                .filter(
                    (game) =>
                        game.name !== "Home" &&
                        game.name !== "Custom" &&
                        game.name.toLowerCase().includes(query.toLowerCase())
                )
                .slice(0, 50)
                .map((g) => ({
                    name: g.name,
                    img: g.img,
                    cover_url: null,
                }));
            console.log(
                `[IGDB] Fallback search found ${filtered.length} matches`
            );
            return { success: true, games: filtered };
        }
    } catch (error) {
        console.error("[IGDB] Search failed:", error);
        // Fallback to local search
        const filtered = gameData
            .filter(
                (game) =>
                    game.name !== "Home" &&
                    game.name !== "Custom" &&
                    game.name.toLowerCase().includes(query.toLowerCase())
            )
            .slice(0, 50)
            .map((g) => ({
                name: g.name,
                img: g.img,
                cover_url: null,
            }));
        console.log(`[IGDB] Fallback search found ${filtered.length} matches`);
        return { success: true, games: filtered };
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

    // Handle blur event to close dropdown when it loses focus
    let blurTimeout;
    dropdownWindow.on("blur", () => {
        // Add a small delay to prevent immediate closing when clicking inside
        blurTimeout = setTimeout(() => {
            if (dropdownWindow && !dropdownWindow.isDestroyed()) {
                dropdownWindow.close();
            }
        }, 200);
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

ipcMain.on("close-window", () => {
    app.quit();
});

ipcMain.on("select-game", (event, game) => {
    window.webContents.send("game-selected", game);
    if (dropdownWindow) {
        dropdownWindow.close();
    }
});

ipcMain.on("search-games", async (event, query) => {
    let games;

    try {
        console.log("[Search] Searching for:", query);

        if (igdbAvailable) {
            try {
                console.log("[Search] Attempting IGDB search...");
                games = await igdbAPI.searchGames(query);
                console.log("[Search] IGDB found", games?.length || 0, "games");
            } catch (igdbError) {
                console.error(
                    "[Search] IGDB search failed:",
                    igdbError.message
                );
                console.log("[Search] Falling back to local search");
                games = null; // Force fallback
            }
        }

        // If IGDB not available or failed, use fallback
        if (!igdbAvailable || !games) {
            console.log("[Search] Using fallback search");
            games = gameData
                .filter(
                    (game) =>
                        game.name !== "Home" &&
                        game.name !== "Custom" &&
                        game.name.toLowerCase().includes(query.toLowerCase())
                )
                .slice(0, 50)
                .map((g) => ({
                    name: g.name,
                    img: g.img,
                    cover_url: null,
                }));
            console.log("[Search] Fallback found", games.length, "games");
        }

        if (games && games.length > 0) {
            console.log("[Search] First result:", games[0].name);
        }

        if (dropdownWindow) {
            dropdownWindow.webContents.send("search-results", {
                success: true,
                games: games || [],
            });
        }
    } catch (error) {
        console.error("[Search] Failed:", error);
        // Fallback to local search on error
        const fallbackGames = gameData
            .filter(
                (game) =>
                    game.name !== "Home" &&
                    game.name !== "Custom" &&
                    game.name.toLowerCase().includes(query.toLowerCase())
            )
            .slice(0, 50)
            .map((g) => ({
                name: g.name,
                img: g.img,
                cover_url: null,
            }));
        console.log(
            "[Search] Error fallback found",
            fallbackGames.length,
            "games"
        );

        if (dropdownWindow) {
            dropdownWindow.webContents.send("search-results", {
                success: true,
                games: fallbackGames,
            });
        }
    }
});

// Executes when game data is received
ipcMain.on("game", (e, gameName, status, customGameName, cover) => {
    name = gameName;
    desc = status;
    customName = customGameName;
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

    // Determine image key to use
    let imageKey = img;

    // For Custom games, always use the default switch icon
    if (name === "Custom") {
        imageKey = "switch";
    } else if (coverUrl && coverUrl.startsWith("http")) {
        imageKey = coverUrl;
    }

    rpc.updatePresence({
        details: name === "Custom" ? customName : name,
        state: desc || "Playing",
        largeImageKey: imageKey,
        largeImageText: name,
    });
}

// Events to listen for
app.on("ready", () => {
    Menu.setApplicationMenu(false);
    createWindow();
    // Check for updates 5 seconds after app launches
    setTimeout(() => {
        checkForUpdates();
    }, 5000);
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
    if (window === null) createWindow();
});
