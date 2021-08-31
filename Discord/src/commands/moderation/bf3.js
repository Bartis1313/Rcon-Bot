var config = require("config")
const fetch = require("node-fetch");


module.exports = class bf3 {
    constructor() {
        this.name = 'bf3',
            this.alias = ['bf3players'],
            this.usage = `${process.env.DISCORD_COMMAND_PREFIX || config.commandPrefix}${this.name}`
    }

    async run(bot, message, args) {
        const url = 'https://bfstats.tech/api/bf3?timespan=daily'
        return fetch(url)
            .then(response => response.json())
            .then(json => {
                const players = json.current
                message.channel.send("Current Players amount in BF3: " + players);
            })
            .catch(err => console.error(err))
    }
}