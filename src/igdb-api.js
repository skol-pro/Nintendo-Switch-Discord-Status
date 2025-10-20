/**
 * IGDB API Module
 * Handles all interactions with the IGDB API for game data
 */

const https = require("https");

class IGDBAPI {
    constructor(auth) {
        this.auth = auth;
        this.baseUrl = "api.igdb.com";
        this.apiVersion = "v4";
        this.NINTENDO_SWITCH_PLATFORM_ID = 130;
    }

    /**
     * Make a request to IGDB API
     */
    async makeRequest(endpoint, body) {
        const token = await this.auth.getAccessToken();

        return new Promise((resolve, reject) => {
            const options = {
                hostname: this.baseUrl,
                path: `/${this.apiVersion}/${endpoint}`,
                method: "POST",
                headers: {
                    "Client-ID": this.auth.clientId,
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "text/plain",
                    "Content-Length": Buffer.byteLength(body),
                },
            };

            const req = https.request(options, (res) => {
                let data = "";

                res.on("data", (chunk) => {
                    data += chunk;
                });

                res.on("end", () => {
                    try {
                        const response = JSON.parse(data);

                        if (res.statusCode === 200) {
                            resolve(response);
                        } else {
                            reject(
                                new Error(
                                    `IGDB API error: ${
                                        res.statusCode
                                    } - ${JSON.stringify(response)}`
                                )
                            );
                        }
                    } catch (error) {
                        reject(
                            new Error(
                                `Failed to parse IGDB response: ${error.message}`
                            )
                        );
                    }
                });
            });

            req.on("error", (error) => {
                reject(new Error(`IGDB request failed: ${error.message}`));
            });

            req.write(body);
            req.end();
        });
    }

    /**
     * Search for Nintendo Switch games
     * @param {string} searchTerm - The game name to search for
     * @param {number} limit - Maximum number of results (default: 20)
     */
    async searchGames(searchTerm, limit = 20) {
        if (!searchTerm || searchTerm.trim().length === 0) {
            return [];
        }

        // APICalypse query
        // Note: Using name contains instead of search for better results
        // We filter by: Nintendo Switch platform, exclude games with parent (DLCs/expansions)
        const query = `
            fields name,cover.image_id,first_release_date,parent_game;
            where platforms = (${this.NINTENDO_SWITCH_PLATFORM_ID}) 
                & name ~ *"${searchTerm.replace(/"/g, '\\"')}"*;
            sort first_release_date desc;
            limit ${limit};
        `.trim();

        console.log("[IGDB API] Query:", query);

        try {
            const games = await this.makeRequest("games", query);

            console.log(
                "[IGDB API] Raw result:",
                JSON.stringify(games).substring(0, 200)
            );

            // Filter out DLCs/expansions (games with parent_game) and transform results
            return games
                .filter((game) => !game.parent_game)
                .map((game) => ({
                    id: game.id,
                    name: game.name,
                    cover_url: game.cover?.image_id
                        ? `https://images.igdb.com/igdb/image/upload/t_cover_big/${game.cover.image_id}.jpg`
                        : null,
                    release_date: game.first_release_date || null,
                }));
        } catch (error) {
            console.error("[IGDB API] Search failed:", error.message);
            throw error;
        }
    }

    /**
     * Get popular/recent Nintendo Switch games (for initial load)
     */
    async getPopularGames(limit = 50) {
        const query = `
            fields name,cover.image_id,first_release_date;
            where platforms = (${this.NINTENDO_SWITCH_PLATFORM_ID}) 
                & parent_game = null
                & first_release_date != null;
            sort first_release_date desc;
            limit ${limit};
        `.trim();

        try {
            const games = await this.makeRequest("games", query);

            return games.map((game) => ({
                id: game.id,
                name: game.name,
                cover_url: game.cover?.image_id
                    ? `https://images.igdb.com/igdb/image/upload/t_cover_big/${game.cover.image_id}.jpg`
                    : null,
                release_date: game.first_release_date || null,
            }));
        } catch (error) {
            console.error(
                "[IGDB API] Failed to get popular games:",
                error.message
            );
            throw error;
        }
    }

    /**
     * Get game details by ID
     */
    async getGameById(gameId) {
        const query = `
            fields name,cover.image_id,first_release_date,summary;
            where id = ${gameId};
        `.trim();

        try {
            const games = await this.makeRequest("games", query);

            if (games.length === 0) {
                return null;
            }

            const game = games[0];
            return {
                id: game.id,
                name: game.name,
                cover_url: game.cover?.image_id
                    ? `https://images.igdb.com/igdb/image/upload/t_cover_big/${game.cover.image_id}.jpg`
                    : null,
                release_date: game.first_release_date || null,
                summary: game.summary || null,
            };
        } catch (error) {
            console.error(
                "[IGDB API] Failed to get game details:",
                error.message
            );
            throw error;
        }
    }
}

module.exports = IGDBAPI;
