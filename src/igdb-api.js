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
        this.NINTENDO_SWITCH_2_PLATFORM_ID = 471;
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

        // Try three search strategies:
        // 1. Search operator on Switch platforms (best for fuzzy matching)
        // 2. Name contains on Switch platforms (catches exact matches)
        // 3. All platforms (fallback for games not yet tagged with Switch platform)

        let query = `
            search "${searchTerm.replace(/"/g, '\\"')}";
            fields name,cover.image_id,first_release_date,parent_game,platforms;
            where platforms = (${this.NINTENDO_SWITCH_PLATFORM_ID}, ${
            this.NINTENDO_SWITCH_2_PLATFORM_ID
        });
            limit ${limit};
        `.trim();

        try {
            let games = await this.makeRequest("games", query);

            // If search operator returns no results, try name contains
            if (games.length === 0) {
                query = `
                    fields name,cover.image_id,first_release_date,parent_game,platforms;
                    where platforms = (${this.NINTENDO_SWITCH_PLATFORM_ID}, ${
                    this.NINTENDO_SWITCH_2_PLATFORM_ID
                })
                        & name ~ *"${searchTerm.replace(/"/g, '\\"')}"*;
                    limit ${limit};
                `.trim();

                games = await this.makeRequest("games", query);
            }

            // If still no results, search without platform filter
            if (games.length === 0) {
                query = `
                    search "${searchTerm.replace(/"/g, '\\"')}";
                    fields name,cover.image_id,first_release_date,parent_game,platforms;
                    limit ${limit};
                `.trim();

                games = await this.makeRequest("games", query);
            }

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
            where platforms = (${this.NINTENDO_SWITCH_PLATFORM_ID}, ${this.NINTENDO_SWITCH_2_PLATFORM_ID}) 
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
