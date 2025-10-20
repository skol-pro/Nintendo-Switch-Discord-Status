const iconGen = require("icon-gen");

const options = {
    ico: {
        name: "icon",
        sizes: [16, 24, 32, 48, 64, 128, 256],
    },
    icns: {
        name: "icon",
        sizes: [16, 32, 64, 128, 256, 512, 1024],
    },
};

iconGen("./icon.png", "./", options)
    .then((results) => {
        console.log("✅ Icons generated successfully!");
        console.log("Created:");
        results.forEach((file) => console.log("  -", file));
    })
    .catch((err) => {
        console.error("❌ Error generating icons:", err);
    });
