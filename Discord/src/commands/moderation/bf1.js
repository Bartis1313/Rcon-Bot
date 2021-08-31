var config = require("config")
const fetch = require("node-fetch");


module.exports = class bf1 {
    constructor() {
        this.name = 'bf1',
            this.alias = ['bf1players'],
            this.usage = `${process.env.DISCORD_COMMAND_PREFIX || config.commandPrefix}${this.name}`
    }

    async run(bot, message, args) {
        const url = 'https://bfstats.tech/api/bf1?timespan=daily'
        return fetch(url)
            .then(response => response.json())
            .then(json => {
                const players = json.current
                message.channel.send("Current Players amount in BF1: " + players);
            })
            .catch(err => console.error(err))
    }
}