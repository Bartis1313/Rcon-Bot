const fetch = require("node-fetch");
const Discord = require('discord.js');
import { Helpers } from '../../helpers/helpers'
import PlayerMatching from '../../helpers/playerMatching'

module.exports = class psay {
    constructor() {
        this.name = 'psay';
        this.alias = ['sayplayer'];
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

        message.delete();

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

        return fetch(`${server}/admin/psay`, {
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

    getParameters(message, server) {
        return new Promise(async (resolve, reject) => {
            const response = await Helpers.getPlayers(server)
            if (!response.data.players) return reject(console.error("No players in the server."))
            const playerNames = response.data.players.map((player) => player.name);

            let what;
            let playerName;

            askPlayerName: while (true) {
                playerName = await Helpers.askPlayerName(message);
                if (!playerName) {
                    if (await Helpers.askTryAgain(message)) {
                        continue askPlayerName;
                    }

                    return reject(console.error("Couldn't get the playerName"))
                }

                // Do matching
                const matchedPlayer = PlayerMatching.getBestPlayerMatch(playerName, playerNames);
                if (!matchedPlayer) {
                    if (await Helpers.askTryAgain(message, 'No matches')) {
                        continue askPlayerName;
                    }

                    return reject(console.error("Couldn't match the player to any player in the server."))
                }

                switch (matchedPlayer.type) {
                    case "good":
                        playerName = matchedPlayer.playerName;
                        break askPlayerName;
                    case "far":
                        const embed = new Discord.MessageEmbed()
                            .setTimestamp()
                            .setColor("00FF00")
                            .setAuthor('Confirm', message.author.avatarURL())
                            .setDescription(`Did you mean ${matchedPlayer.playerName}?`);
                        if (await Helpers.confirm(message, embed)) {
                            playerName = matchedPlayer.playerName;
                            break askPlayerName;
                        }
                        if (await Helpers.askTryAgain(message)) {
                            continue askPlayerName;
                        }
                        break;
                    case "multi":
                        let selectedPlayer = await Helpers.selectPlayerName(message, matchedPlayer.playerNames);
                        if (selectedPlayer) {
                            playerName = selectedPlayer;
                            break askPlayerName;
                        }
                        if (await Helpers.askTryAgain(message, 'Didn\'t match')) {
                            continue askPlayerName;
                        }
                        break;
                }

                playerName = matchedPlayer

                break;
            }

            askMessage: while(true) {
                what = await Helpers.askMessage(message);
                if(!what) {
                    if(await Helpers.askTryAgain(message)) {
                        continue askMessage;
                    }
                    return reject(console.error("Couldn't get the message"))
                }
                break;
            }

            const embed = new Discord.MessageEmbed()
                .setTimestamp()
                .setColor("00FF00")
                .setAuthor('Given Properties', message.author.avatarURL());

            embed.addField('Given playername', `**${playerName}**`, false);
            embed.addField('Given content', `**${what}**`, false);

            const msg = await message.channel.send(embed);

            msg.delete();
            const confirmEmbed = new Discord.MessageEmbed()
                .setTimestamp()
                .setColor("00FF00")
                .setAuthor('Are you sure you want say the contant to player?', message.author.avatarURL());

            confirmEmbed.addField('Given playername', `**${playerName}**`, false);

            if (await Helpers.confirm(message, confirmEmbed)) {
                return resolve({
                    what: what,
                    playerName: playerName,
                });
            }
            else {
                return reject(console.error("Psay interrupted!"))
            }
        })
    }


    buildEmbed(message, parameters, response) {
        const embed = new Discord.MessageEmbed()
            .setTimestamp()
            .setColor(response.status === "OK" ? "00FF00" : "FF0000")
            .setThumbnail('https://cdn.discordapp.com/attachments/608427147039866888/688075162608074872/skull2-9b2d7622.png')
            .setFooter('Author: Bartis', 'https://cdn.discordapp.com/attachments/608427147039866888/688075162608074872/skull2-9b2d7622.png')
            .setAuthor('Player Say', message.author.avatarURL())
            .addField('Issuer', message.author.username, true)
            .addField('Target', `**${parameters.playerName}**`, true)
            .addField('Content', `**${parameters.what}**`, true)
            .addField('Status', response.status, true)
        if (response.status === "FAILED") {
            embed.addField('Reason for failing', response.error, true)
        }
        embed.addField('Server', response.server, false)

        return embed
    }
}
