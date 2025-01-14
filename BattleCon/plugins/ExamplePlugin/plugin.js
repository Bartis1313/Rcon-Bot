module.exports = class ExamplePlugin extends BasePlugin {
    static dependencies = ["axios", "lodash"]; // use any module we want, here not used, but possible :)

    constructor(bc) {
        super(bc, "ExamplePlugin");

        this.onEvent("player.onJoin", ([name, uid]) => {
            console.log(`[${this.pluginName}] Player joined: ${name} (UID: ${uid})`);

            const axios = require("axios");
            // and then we use some api...
        });

        this.onEvent("player.onChat", ([name, text]) => {
            console.log(`[${this.pluginName}] ${name} said: ${text}`);
        });

        // We can load this as well
        this.onEvent("player.onChat", ([name, text]) => {
            console.log(`[${this.pluginName}] [Secondary] ${name} mentioned: "${text}"`);
        });
    }
};