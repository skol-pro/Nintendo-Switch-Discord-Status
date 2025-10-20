/**
 * IGDB Authentication Module
 * Handles OAuth token generation and refresh for IGDB API
 */

const https = require("https");

class IGDBAuth {
    constructor(clientId, clientSecret) {
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        this.accessToken = null;
        this.tokenExpiry = null;
    }

    /**
     * Request a new access token from Twitch OAuth
     */
    async getAccessToken() {
        // Return cached token if still valid
        if (
            this.accessToken &&
            this.tokenExpiry &&
            Date.now() < this.tokenExpiry
        ) {
            return this.accessToken;
        }

        return new Promise((resolve, reject) => {
            const postData = `client_id=${this.clientId}&client_secret=${this.clientSecret}&grant_type=client_credentials`;

            const options = {
                hostname: "id.twitch.tv",
                path: "/oauth2/token",
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                    "Content-Length": Buffer.byteLength(postData),
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

                        if (response.access_token) {
                            this.accessToken = response.access_token;
                            // Set expiry slightly before actual expiry (5 minutes buffer)
                            this.tokenExpiry =
                                Date.now() + (response.expires_in - 300) * 1000;
                            console.log(
                                "[IGDB Auth] Access token obtained successfully"
                            );
                            resolve(this.accessToken);
                        } else {
                            reject(new Error("No access token in response"));
                        }
                    } catch (error) {
                        reject(
                            new Error(
                                `Failed to parse auth response: ${error.message}`
                            )
                        );
                    }
                });
            });

            req.on("error", (error) => {
                reject(new Error(`Auth request failed: ${error.message}`));
            });

            req.write(postData);
            req.end();
        });
    }

    /**
     * Check if current token is valid
     */
    isTokenValid() {
        return (
            this.accessToken &&
            this.tokenExpiry &&
            Date.now() < this.tokenExpiry
        );
    }
}

module.exports = IGDBAuth;
