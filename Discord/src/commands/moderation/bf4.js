var config = require("config")
const fetch = require("node-fetch");


module.exports = class bf4 {
    constructor() {
        this.name = 'bf4',
            this.alias = ['bf4players'],
            this.usage = `${process.env.DISCORD_COMMAND_PREFIX || config.commandPrefix}${this.name}`
    }

    async run(bot, message, args) {
        const url = 'https://bfstats.tech/api/bf4?timespan=daily'
        return fetch(url)
            .then(response => response.json())
            .then(json => {
                const players = json.current
                message.channel.send("Current Players amount in BF4: " + players);
            })
            .catch(err => console.error(err))
    }
}