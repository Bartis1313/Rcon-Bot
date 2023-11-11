const fetch = require("node-fetch");
const Discord = require('discord.js');
import { Helpers } from '../../helpers/helpers'

module.exports = class serverFps {
    constructor() {
        this.name = 'fps';
        this.alias = ['serverfps'];
        this.usage = `${process.env.DISCORD_COMMAND_PREFIX}${this.name}`;
        this.messagesToDelete = [];
    }

    async run(bot, message, args) {
        if (!(message.member.roles.cache.has(process.env.DISCORD_RCON_ROLEID))) {
            message.reply("You don't have permission to use this command.")
            return
        }

        let server = await Helpers.selectServer(message)
        if (!server) {
            message.delete({ timeout: 5000 });
            this.clearMessages();
            return;
        }

        message.delete();

        return fetch(`${server}/serverfps`, {
            method: "post",
            headers: {
                "Content-type": "application/json",
                "Accept": "application/json",
                "Accept-Charset": "utf-8"
            },
        })
            .then(response => response.json())
            .then(json => {
                return message.channel.send({ embed: this.buildEmbed(message, json) })
            })
            .catch(error => {
                console.log(error)
                return false
            })
    }

    clearMessages() {
        for (const message of this.messagesToDelete) {
            message.delete();
        }
    }

    buildEmbed(message, response) {
        const embed = new Discord.MessageEmbed()
            .setTimestamp()
            .setColor(response.status === "OK" ? "00FF00" : "FF0000")
            .setThumbnail('https://upload.wikimedia.org/wikipedia/commons/thumb/5/53/Server-multiple.svg/1200px-Server-multiple.svg.png')
            .setFooter('Author: Bartis', 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/53/Server-multiple.svg/1200px-Server-multiple.svg.png')
            .setAuthor('Server Fps Check', message.author.avatarURL())
            .addField('Issuer', message.author.username, true)
            .addField('Status', response.status, true)
            .addField('Server Fps (tick): ', `${response.data}`, true)
        if (response.status === "FAILED") {
            embed.addField('Reason for failing', response.error, true)
        }

        return embed
    }
}

