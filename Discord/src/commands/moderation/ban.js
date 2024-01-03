const fetch = require("node-fetch");
const Discord = require('discord.js');
import { Helpers, ActionType } from '../../helpers/helpers'
import PlayerMatching from '../../helpers/playerMatching'

module.exports = class ban {
    constructor() {
        this.name = 'ban';
        this.alias = ['bankiller'];
        this.usage = `${process.env.DISCORD_COMMAND_PREFIX}${this.name}`;
    }

    async run(bot, message, args) {
        if (!(message.member.roles.cache.has(process.env.DISCORD_RCON_ROLEID))) {
            message.reply("You don't have permission to use this command.")
            return
        }

        let server = await Helpers.selectServer(message)
        if (!server) {
            message.delete({ timeout: 5000 });
            return;
        }

        message.delete()

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

        // await Helpers.sendDisconnectInfo(ActionType.BAN, server, parameters, 10000);

        // return fetch(`${server}/admin/ban`, {
        //     method: "post",
        //     headers: {
        //         "Content-type": "application/json",
        //         "Accept": "application/json",
        //         "Accept-Charset": "utf-8"
        //     },
        //     body: JSON.stringify(parameters)
        // })
        //     .then(response => response.json())
        //     .then(json => {
        //         return message.channel.send({ embed: this.buildEmbed(message, parameters, json) })
        //     })
        //     .catch(error => {
        //         console.log(error)
        //         return false
        //     })

        const paramsFixed = {
            what: parameters.banDuration
                ? `/${parameters.banTimeout} ${parameters.banDuration} ${parameters.playerName} ${parameters.banReason}`
                : `/${parameters.banTimeout} ${parameters.playerName} ${parameters.banReason}`
        };

        return fetch(`${server}/admin/sayall`, {
            method: "post",
            headers: {
                "Content-type": "application/json",
                "Accept": "application/json",
                "Accept-Charset": "utf-8"
            },
            body: JSON.stringify(paramsFixed)
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

    getParameters(message, server) {
        return new Promise(async (resolve, reject) => {

            // CODE FOR NON ADKATS
            //     let banType;
            //     let banId;
            //     let timeout;
            //     let banReason;

            //     askbanType: while (true) {
            //         banType = await Helpers.askbanType(message);
            //         if (!banType) {
            //             if (await Helpers.askTryAgain(message)) {
            //                 continue askbanType;
            //             }

            //             return reject(console.error("Couldn't get the ban Type"))
            //         }
            //         break;
            //     }

            //     askPlayerName: while (true) {
            //         banId = await Helpers.askPlayerName(message);
            //         if (!banId) {
            //             if (await Helpers.askTryAgain(message)) {
            //                 continue askPlayerName;
            //             }

            //             return reject(console.error("Couldn't get the banId"))
            //         }
            //         break;
            //     }


            //     const embed = new Discord.MessageEmbed()
            //         .setTimestamp()
            //         .setColor("00FF00")
            //         .setAuthor('Given Properties', message.author.avatarURL());

            //     embed.addField('Given playername', `**${banId}**`, false);

            //     const msg = await message.channel.send(embed);

            //     askTimeout: while (true) {
            //         timeout = await Helpers.askTimeout(message);
            //         if (!timeout) {
            //             if (await Helpers.askTryAgain(message)) {
            //                 continue askTimeout;
            //             }
            //             return reject(console.error("Couldn't get the ban type"))
            //         }
            //         break;
            //     }
            //     msg.delete();

            //     // valid arg -> perm OR rounds -> there space needs to be added for valid call
            //     switch (timeout) {
            //         case "perm":
            //             break;
            //         case "seconds":
            //             askTimeout: while (true) {
            //                 timeout += " " + await Helpers.askString("Timeout", "Specify amount of seconds for ban", message);
            //                 if (!timeout) {
            //                     if (await Helpers.askTryAgain(message)) {
            //                         continue askTimeout;
            //                     }
            //                     return reject(console.error("Couldn't get ban duration in seconds"))
            //                 }
            //                 break;
            //             }
            //             break;
            //         case "rounds":
            //             askTimeout: while (true) {
            //                 timeout += " " + await Helpers.askString("Timeout", "Specify amount of rounds for ban", message);
            //                 if (!timeout) {
            //                     if (await Helpers.askTryAgain(message)) {
            //                         continue askTimeout;
            //                     }
            //                     return reject(console.error("Couldn't get ban duration in rounds"))
            //                 }
            //                 break;
            //             }
            //             break;
            //     }

            //     askReason: while (true) {
            //         banReason = await Helpers.askReason(message);
            //         if (!banReason) {
            //             if (await Helpers.askTryAgain(message)) {
            //                 continue askReason;
            //             }

            //             return reject(console.error("Couldn't get the reason"))
            //         }

            //         break;
            //     }

            //     //msg.delete();
            //     const confirmEmbed = new Discord.MessageEmbed()
            //         .setTimestamp()
            //         .setColor("00FF00")
            //         .setAuthor('Are you sure you want to ban the player?', message.author.avatarURL());

            //     confirmEmbed.addField('Given banType', `**${banType}**`, false);
            //     confirmEmbed.addField('Given playername', `**${banId}**`, false);
            //     confirmEmbed.addField('Given timeout', `**${timeout}**`, false);
            //     confirmEmbed.addField('Given reason', `**${banReason}**`, false);


            //     if (await Helpers.confirm(message, confirmEmbed)) {
            //         return resolve({
            //             banType: banType,
            //             playerName: banId,
            //             timeout: timeout,
            //             reason: banReason,
            //         });
            //     }
            //     else {
            //         return reject(console.error("Ban interrupted!"))
            //     }

            let banTimeout = '';
            let playerName = '';
            let banDuration = '';
            let banReason = '';

            const response = await Helpers.getPlayers(server)
            if (!response.data.players) return reject(console.error("No players in the server."))
            const playerNames = response.data.players.map((player) => player.name);

            let informWarn = false;
            let informNotOnServer = false;

            askbanTimeout: while (true) {
                banTimeout = await Helpers.askTimeoutADKATS(message);
                if (!banTimeout) {
                    if (await Helpers.askTryAgain(message)) {
                        continue askbanTimeout;
                    }

                    return reject(console.error("Couldn't get the ban timeout"))
                }
                break;
            }

            askPlayerName: while (true) {
                playerName = await Helpers.askPlayerName(message);

                if (!playerName) {
                    if (await Helpers.askTryAgain(message, informWarn ? "Too many matches" : '')) {
                        continue askPlayerName;
                    }

                    const matchedPlayer = PlayerMatching.getBestPlayerMatch(playerName, playerNames);
                    if (!matchedPlayer) {
                        informNotOnServer = true;
                    }
                    else if (matchedPlayer.type === "multi") {
                        playerName = '';
                        informWarn = true;
                    }

                    return reject(console.error("Couldn't get the playerName"))
                }
                break;
            }

            if (banTimeout == 'ban') {
                askBanReason: while (true) {
                    banReason = await Helpers.askbanReason(message);
                    if (!banReason) {
                        if (await Helpers.askTryAgain(message)) {
                            continue askBanReason;
                        }

                        return reject(console.error("Couldn't get the ban reason"))
                    }
                    break;
                }
            }
            else if (banTimeout == 'tban') {

                askbanDuration: while (true) {

                    const isValidDuration = (input) => {
                        const validSuffixes = ['m', 'h', 'd', 'w', 'y'];

                        if (isNaN(input)) {
                            const suffix = input.charAt(input.length - 1);

                            if (validSuffixes.includes(suffix)) {
                                const num = input.substring(0, input.length - 1);

                                if (!isNaN(num)) {
                                    return true;
                                }
                            }

                            return false;
                        }
                        else {
                            return true;
                        }
                    }

                    banDuration = await Helpers.askString("Duration", "Specify duration\n**Valid suffixes are m, h, d, w, and y**", message);
                    if (!banDuration) {
                        if (await Helpers.askTryAgain(message)) {
                            continue askbanDuration;
                        }

                        return reject(console.error("Couldn't get the ban reason"))
                    }
                    else if (banDuration) { // if string passed
                        if (!isValidDuration(banDuration)) {
                            if (await Helpers.askTryAgain(message, "Wrong duration format!")) {
                                continue askbanDuration;
                            }

                            return reject(console.error("Couldn't get the ban reason"))
                        }
                    }
                    break;
                }

                askBanReason: while (true) {
                    banReason = await Helpers.askbanReason(message);
                    if (!banReason) {
                        if (await Helpers.askTryAgain(message)) {
                            continue askBanReason;
                        }

                        return reject(console.error("Couldn't get the ban reason"))
                    }
                    break;
                }
            }

            const desc = informNotOnServer ? "OFFLINE" : "ONLINE";

            const confirmEmbed = new Discord.MessageEmbed()
                .setTimestamp()
                .setColor("00FF00")
                .setAuthor('Are you sure you want to ban the player?', message.author.avatarURL())
                .setDescription(`Banning ${desc} player.`)

            confirmEmbed.addField('Given playerName', `**${playerName}**`, false);
            confirmEmbed.addField('Given timeout', `**${banTimeout}**`, false);
            if (banDuration) {
                confirmEmbed.addField('Given duration', `**${banDuration}**`, false);
            }
            confirmEmbed.addField('Given reason', `**${banReason}**`, false);

            if (await Helpers.confirm(message, confirmEmbed)) {
                return resolve({
                    playerName: playerName,
                    banTimeout: banTimeout,
                    banDuration: banDuration,
                    banReason: banReason += " Rcon-Bot",
                });
            }
            else {
                return reject(console.error("Ban interrupted!"))
            }
        })
    }

    buildEmbed(message, parameters, response) {
        // const embed = new Discord.MessageEmbed()
        //     .setTimestamp()
        //     .setColor(response.status === "OK" ? "00FF00" : "FF0000")
        //     .setThumbnail('https://img.pngio.com/ban-banhammer-censor-censorship-hammer-ip-block-moderator-icon-banhammer-png-512_512.png')
        //     .setFooter('Author: Bartis', 'https://img.pngio.com/ban-banhammer-censor-censorship-hammer-ip-block-moderator-icon-banhammer-png-512_512.png')
        //     .setAuthor('Ban', message.author.avatarURL())
        //     .addField('Issuer', message.author.username, true)
        //     .addField('Target', `**${response?.data?.banId}**`, true)
        //     .addField('Type', response?.data?.banType, true)
        // switch (response?.data?.banTimeoutType) {
        //     case "perm":
        //         embed.addField('Duration', '**Permanent**', true)
        //         break
        //     case "rounds":
        //         embed.addField('Duration', `**${response?.data?.banTimeout}** rounds`, true)
        //         break
        //     case "seconds":
        //         embed.addField('Duration', `**${response?.data?.banTimeout}** seconds`, true)
        //         break
        //     default:
        //         embed.addField('Duration', `unknown`, true)
        //         break
        // }

        const embed = new Discord.MessageEmbed()
            .setTimestamp()
            .setColor(response.status === "OK" ? "00FF00" : "FF0000")
            .setThumbnail('https://img.pngio.com/ban-banhammer-censor-censorship-hammer-ip-block-moderator-icon-banhammer-png-512_512.png')
            .setFooter('Author: Bartis', 'https://img.pngio.com/ban-banhammer-censor-censorship-hammer-ip-block-moderator-icon-banhammer-png-512_512.png')
            .setAuthor('Ban', message.author.avatarURL())
            .addField('Issuer', message.author.username, true)
            .addField('Target', `**${parameters.playerName}**`, true)
            .addField('Type', parameters.banTimeout, true);
        if (parameters.banDuration) {
            embed.addField('Duration', parameters.banDuration, true);
        }
        embed.addField('Reason', parameters.banReason, true);
        embed.addField('Server', response?.server, false);

        return embed;
    }
}