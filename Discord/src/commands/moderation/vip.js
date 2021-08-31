var config = require("config")
const fetch = require("node-fetch");
const Discord = require('discord.js');
import Helpers from '../../helpers/helpers'

module.exports = class vip {
    constructor() {
        this.name = 'vip',
            this.alias = ['reservedslots'],
            this.usage = `${process.env.DISCORD_COMMAND_PREFIX || config.commandPrefix}${this.name} <soldierName>`
    }

    async run(bot, message, args) {
        if (!(message.member.roles.cache.has(process.env.DISCORD_RCON_ROLEID || config.rconRoleId))) {
            message.reply("You don't have permission to use this command.")
            return
        }
        await message.delete()

        let server = await Helpers.selectServer(message)
        this.serverUrl = server;
        if (!server) {
            message.reply("Unknown error");
            message.delete({ timeout: 5000 });
            clearMessages();
            return;
        }

        let parameters = await this.getParameters(message, server)
            .then(parameters => {
                return parameters;
            })
            .catch(err => {
                console.log(err);
                return null;
            })

        if (!parameters) {
            return
        }

        return fetch(`${server}/reservedSlots`, {
            method: "post",
            headers: {
                "Content-type": "application/json",
                "Accept": "application/json",
                "Accept-Charset": "utf-8"
            },
            body: JSON.stringify(parameters)
        })
            .then(response => response.json())
            .then(json => {
                console.log(json)
                return message.channel.send({ embed: this.buildEmbed(message, parameters, json) })
            })
            .catch(error => {
                console.log(error)
                return false
            })
    }

    getParameters(message, server) {
        return new Promise(async (resolve, reject) => {
            let soldierName;

            askPlayerName: while (true) {
                soldierName = await Helpers.askPlayerName(message);
                if (!soldierName) {
                    if (await Helpers.askTryAgain(message)) {
                        continue askPlayerName;
                    }

                    return reject(Error("Couldn't get the soldierName"))
                }
                break;
            }

            const confirmEmbed = new Discord.MessageEmbed()
                .setTimestamp()
                .setColor("00FF00")
                .setAuthor('Are you sure you want to add VIP for this player?', message.author.avatarURL());

            confirmEmbed.addField('Given playerName', `**${soldierName}**`, false);

            if (await Helpers.confirm(message, confirmEmbed)) {
                return resolve({
                    soldierName: soldierName
                });
            }
            else {
                return reject(Error("Vip interrupted!"))
            }
        })
    }

    buildEmbed(message, parameters, response) {
        const embed = new Discord.MessageEmbed()
            .setTimestamp()
            .setColor(response.status === "OK" ? "00FF00" : "FF0000")
            .setThumbnail('https://cdn.discordapp.com/attachments/608427147039866888/688012094972625024/fireworks.png')
            .setFooter('Author: Bartis', 'https://cdn.discordapp.com/attachments/608427147039866888/688012094972625024/fireworks.png')
            .setAuthor('Player Reserved Slot', message.author.avatarURL())
            .addField('Issuer', message.author.username, true)
            .addField('Target', `**${parameters.soldierName}**`, true)
            .addField('Status', response.status, true)
        if (response.status === "FAILED") {
            embed.addField('Reason for failing', response.error, true)
        }

        return embed
    }
}
