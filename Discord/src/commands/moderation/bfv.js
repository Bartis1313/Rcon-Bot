var config = require("config")
const fetch = require("node-fetch");


module.exports = class bfv {
    constructor() {
        this.name = 'bfv',
            this.alias = ['bfvplayers'],
            this.usage = `${process.env.DISCORD_COMMAND_PREFIX || config.commandPrefix}${this.name}`
    }

    async run(bot, message, args) {
        const url = 'https://bfstats.tech/api/bfv?timespan=daily'
        return fetch(url)
            .then(response => response.json())
            .then(json => {
                const players = json.current
                message.channel.send("Current Players amount in BFV: " + players);
            })
            .catch(err => console.error(err))
    }
}