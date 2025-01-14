const Discord = require('discord.js');
import { Helpers } from '../../helpers/helpers'
import { createConnection } from 'mysql'

module.exports = class unban {
    constructor() {
        this.name = 'unban';
        this.alias = ['ub'];
        this.usage = `${process.env.DISCORD_COMMAND_PREFIX}${this.name}`;
    }

    // code for NO adkats db relation to server
    async run(bot, message, args) {
        if (!(message.member.roles.cache.has(process.env.DISCORD_RCON_ROLEID))) {
            message.reply("You don't have permission to use this command.")
            return
        }
        await message.delete()

        let server = await Helpers.selectServer(message)
        if (!server) {
            message.reply("Unknown error");
            message.delete({ timeout: 5000 });
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

        return fetch(`${server} /admin/unban`, {
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
                return message.channel.send({ embed: this.buildEmbed(message, parameters, json) })
            })
            .catch(error => {
                console.log(error)
                return false
            })
    }

    getParameters(message) {
        return new Promise(async (resolve, reject) => {
            let banType;
            let banId;

            askbanType: while (true) {
                banType = await Helpers.askbanType(message);
                if (!banType) {
                    if (await Helpers.askTryAgain(message)) {
                        continue askbanType;
                    }

                    return reject(console.error("Couldn't get the ban Type"))
                }
                break;
            }

            askPlayerName: while (true) {
                banId = await Helpers.askPlayerName(message);
                if (!banId) {
                    if (await Helpers.askTryAgain(message)) {
                        continue askPlayerName;
                    }

                    return reject(console.error("Couldn't get the banId"))
                }
                break;
            }


            const embed = new Discord.MessageEmbed()
                .setTimestamp()
                .setColor("00FF00")
                .setAuthor('Given Properties', message.author.avatarURL());

            embed.addField('Given playername', `** ${banId}** `, false);

            const msg = await message.channel.send(embed);

            msg.delete();
            const confirmEmbed = new Discord.MessageEmbed()
                .setTimestamp()
                .setColor("00FF00")
                .setAuthor('Are you sure you want to unban the player?', message.author.avatarURL());

            confirmEmbed.addField('Given banType', `** ${banType}** `, false);
            confirmEmbed.addField('Given playername', `** ${banId}** `, false);


            if (await Helpers.confirm(message, confirmEmbed)) {
                return resolve({
                    banType: banType,
                    banId: banId,
                });
            }
            else {
                return reject(console.error("Unban interrupted!"))
            }
        })
    }

    buildEmbed(message, parameters, response) {
        const embed = new Discord.MessageEmbed()
            .setColor(response.status === "OK" ? "00FF00" : "FF0000")
            .setTimestamp()
            .setThumbnail('https://i.ytimg.com/vi/6HZRpRhS0-8/maxresdefault.jpg')
            .setFooter('Author: Bartis', 'https://i.ytimg.com/vi/6HZRpRhS0-8/maxresdefault.jpg')
            .setAuthor('Unban', message.author.avatarURL())
            .addField('Issuer', message.author.username, true)
        if (response.status === "OK") {
            embed.addField('Target', `** ${response.data.banId}** `, true)
            embed.addField('Type', response.data.banType, true)
        }
        else {
            embed.addField('Reason for Fail', `** ${response.error}** `, true)
            embed.setDescription("It could be the fact nikcname is case-sensitive or wrong banId, try again")
        }
        embed.addField('Server', response?.server, false)

        return embed
    }
}