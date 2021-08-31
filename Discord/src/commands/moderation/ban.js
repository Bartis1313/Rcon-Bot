var config = require("config")
const fetch = require("node-fetch");
const Discord = require('discord.js');
import Helpers from '../../helpers/helpers'

module.exports = class ban {
    constructor() {
        this.name = 'ban',
            this.alias = ['bankiller'],
            this.usage = `${process.env.DISCORD_COMMAND_PREFIX || config.commandPrefix}${this.name}`
        this.messagesToDelete = [];
    }

    async run(bot, message, args) {
        if (!(message.member.roles.cache.has(process.env.DISCORD_RCON_ROLEID || config.rconRoleId))) {
            message.reply("You don't have permission to use this command.")
            return
        }
        await message.delete()

        let server = await Helpers.selectServer(message)
        if (!server) {
            message.reply("Unknown error");
            message.delete({ timeout: 5000 });
            clearMessages();
            return;
        }

        let parameters = await this.getParameters(message, server)
            .then(parameters => {
                this.clearMessages();
                return parameters;
            })
            .catch(err => {
                console.log(err);
                this.clearMessages();
                return null;
            })

        if (!parameters) {
            return
        }

        return fetch(`${server}/admin/ban`, {
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

    clearMessages() {
        for (const message of this.messagesToDelete) {
            message.delete();
        }
    }

    getParameters(message) {
        return new Promise(async (resolve, reject) => {

            let banType;
            let banId;
            let timeout;
            let banReason;

            askbanType: while (true) {
                banType = await Helpers.askbanType(message);
                if (!banType) {
                    if (await Helpers.askTryAgain(message)) {
                        continue askbanType;
                    }

                    return reject(Error("Couldn't get the ban Type"))
                }
                break;
            }

            askPlayerName: while (true) {
                banId = await Helpers.askPlayerName(message);
                if (!banId) {
                    if (await Helpers.askTryAgain(message)) {
                        continue askPlayerName;
                    }

                    return reject(Error("Couldn't get the banId"))
                }
                break;
            }


            const embed = new Discord.MessageEmbed()
                .setTimestamp()
                .setColor("00FF00")
                .setAuthor('Given Properties', message.author.avatarURL());

            embed.addField('Given playername', `**${banId}**`, false);

            const msg = await message.channel.send(embed);

            asktimeout: while (true) {
                timeout = await Helpers.asktimeout(message);
                if (!timeout) {
                    if (await Helpers.askTryAgain(message)) {
                        continue asktimeout;
                    }
                    return reject(Error("Couldn't get the ban type"))
                }
                break;
            }
            msg.delete();

            // valid arg -> perm OR rounds -> there space needs to be added for valid call
            switch (timeout) {
                case "perm":
                    break;
                case "seconds":
                    asktimeout: while (true) {
                        timeout += " " + await Helpers.asktimeout(message);
                        if (!timeout) {
                            if (await Helpers.askTryAgain(message)) {
                                continue asktimeout;
                            }
                            return reject(Error("Couldn't get ban duration in seconds"))
                        }
                        break;
                    }
                    break;
                case "rounds":
                    asktimeout: while (true) {
                        timeout += " " + await Helpers.asktimeout(message);
                        if (!timeout) {
                            if (await Helpers.askTryAgain(message)) {
                                continue asktimeout;
                            }
                            return reject(Error("Couldn't get ban duration in rounds"))
                        }
                        break;
                    }
                    break;
            }

            askReason: while (true) {
                banReason = await Helpers.askReason(message);
                if (!banReason) {
                    if (await Helpers.askTryAgain(message)) {
                        continue askReason;
                    }

                    return reject(Error("Couldn't get the reason"))
                }

                break;
            }

            msg.delete();
            const confirmEmbed = new Discord.MessageEmbed()
                .setTimestamp()
                .setColor("00FF00")
                .setAuthor('Are you sure you want to ban the player?', message.author.avatarURL());

            confirmEmbed.addField('Given banType', `**${banType}**`, false);
            confirmEmbed.addField('Given playername', `**${banId}**`, false);
            confirmEmbed.addField('Given timeout', `**${timeout}**`, false);
            confirmEmbed.addField('Given reason', `**${banReason}**`, false);


            if (await Helpers.confirm(message, confirmEmbed)) {
                return resolve({
                    banType: banType,
                    banId: banId,
                    timeout: timeout,
                    banReason: banReason,
                });
            }
            else {
                return reject(Error("Ban interrupted!"))
            }
        })
    }

    buildEmbed(message, parameters, response) {
        const embed = new Discord.MessageEmbed()
            .setTimestamp()
            .setColor(response.status === "OK" ? "00FF00" : "FF0000")
            .setThumbnail('https://img.pngio.com/ban-banhammer-censor-censorship-hammer-ip-block-moderator-icon-banhammer-png-512_512.png')
            .setFooter('Author: Bartis', 'https://img.pngio.com/ban-banhammer-censor-censorship-hammer-ip-block-moderator-icon-banhammer-png-512_512.png')
            .setAuthor('Ban', message.author.avatarURL())
            .addField('Issuer', message.author.username, true)
            .addField('Target', `**${response?.data?.banId}**`, true)
            .addField('Type', response?.data?.banType, true)
        switch (response?.data?.banTimeoutType) {
            case "perm":
                embed.addField('Duration', '**Permanent**', true)
                break
            case "rounds":
                embed.addField('Duration', `**${response?.data?.banTimeout}** rounds`, true)
                break
            case "seconds":
                embed.addField('Duration', `**${response?.data?.banTimeout}** seconds`, true)
                break
            default:
                embed.addField('Duration', `unknown`, true)
                break
        }
        embed.addField('Reason', response?.data?.banReason, true)
        embed.addField('Server', response?.server, false)

        return embed
    }
}