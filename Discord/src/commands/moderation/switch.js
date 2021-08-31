const config = require("config");
const fetch = require("node-fetch");
const Discord = require('discord.js');
import Helpers from '../../helpers/helpers'
import PlayerMatching from '../../helpers/playerMatching'

module.exports = class switcher {
    constructor() {
        this.name = 'switch';
        this.alias = ['switchnow'];
        this.usage = `${process.env.DISCORD_COMMAND_PREFIX || config.commandPrefix}${this.name}`;
        this.messagesToDelete = [];
        this.serverUrl;
        this.IdsArr = [];
        this.name;
    }

    async run(bot, message, args) {
        if (!(message.member.roles.cache.has(process.env.DISCORD_RCON_ROLEID || config.rconRoleId))) {
            message.reply("You don't have permission to use this command.")
            return
        }
        await message.delete()

        let server = await Helpers.selectServer(message)
        switcher.serverUrl = server;
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

        return fetch(`${server}/switchPlayer`, {
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
    getUrl() {
        return this.serverUrl;
    }

    clearMessages() {
        for (const message of this.messagesToDelete) {
            message.delete();
        }
    }

    getParameters(message, server) {
        return new Promise(async (resolve, reject) => {
            const response = await Helpers.getPlayers(server)
            if (!response.data.players) return reject(Error("No players in the server."))
            const playerNames = response.data.players.map((player) => player.name);

            let playerName;
            let teamId;
            let squadId;
            let force;

            askPlayerName: while (true) {
                playerName = await Helpers.askPlayerName(message);
                if (!playerName) {
                    if (await Helpers.askTryAgain(message)) {
                        continue askPlayerName;
                    }

                    return reject(Error("Couldn't get the playerName"))
                }

                // Do matching
                const matchedPlayer = PlayerMatching.getBestPlayerMatch(playerName, playerNames);
                if (!matchedPlayer) {
                    if (await Helpers.askTryAgain(message, 'No matches')) {
                        continue askPlayerName;
                    }

                    return reject(Error("Couldn't match the player to any player in the server."))
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





            async function getToarr() {
                let arr = []
                return fetch(`${switcher.serverUrl}/team_1`, {
                    method: "post",
                    headers: {
                        "Content-type": "application/json",
                        "Accept": "application/json",
                        "Accept-Charset": "utf-8"
                    },
                })
                    .then(response => response.json())
                    .then(json => {
                        const len = json.data.players.length;
                        for (var i = 0; i < len; i++) {
                            if (json.data.players[i].name === playerName)
                                arr.push(json.data.players[i].teamId, json.data.players[i].squadId, true)
                        }
                        return arr
                    })
                    .catch(error => {
                        console.log(error)
                        return false
                    })
            }

            async function getToarr_2() {
                let arr = []
                return fetch(`${switcher.serverUrl}/team_2`, {
                    method: "post",
                    headers: {
                        "Content-type": "application/json",
                        "Accept": "application/json",
                        "Accept-Charset": "utf-8"
                    },
                })
                    .then(response => response.json())
                    .then(json => {
                        const len = json.data.players.length;
                        for (var i = 0; i < len; i++) {
                            if (json.data.players[i].name === playerName)
                                arr.push(json.data.players[i].teamId, json.data.players[i].squadId, true)
                        }
                        return arr
                    })
                    .catch(error => {
                        console.log(error)
                        return false
                    })

            }
            // could be done better, and add random squadId number (as it is for client BF)
            let arrayIds_1 = await getToarr()
            let arrayIds_2 = await getToarr_2()
            if (arrayIds_1.length > 0) {
                teamId = arrayIds_1[0].toString()
                squadId = arrayIds_1[1].toString()
                force = arrayIds_1[2].toString()
            }
            if (arrayIds_2.length > 0) {
                teamId = arrayIds_2[0].toString()
                squadId = arrayIds_2[1].toString()
                force = arrayIds_2[2].toString()
            }

            switch (teamId) {
                case "1":
                    teamId = "2";
                    break;
                case "2":
                    teamId = "1";
                    break;
                default:
                    break;
            }
            console.log(teamId)



            const embed = new Discord.MessageEmbed()
                .setTimestamp()
                .setColor("00FF00")
                .setAuthor('Given Properties', message.author.avatarURL());

            embed.addField('Given playername', `**${playerName}**`, false);

            const msg = await message.channel.send(embed);

            msg.delete();
            const confirmEmbed = new Discord.MessageEmbed()
                .setTimestamp()
                .setColor("00FF00")
                .setAuthor('Are you sure you want to switch the player?', message.author.avatarURL());

            confirmEmbed.addField('Given playername', `**${playerName}**`, false);

            if (await Helpers.confirm(message, confirmEmbed)) {
                return resolve({
                    playerName: playerName,
                    teamId: teamId,
                    squadId: squadId,
                    force: force
                });
            }
            else {
                return reject(Error("Switch interrupted!"))
            }
        })
    }

    buildEmbed(message, parameters, response) {
        const embed = new Discord.MessageEmbed()
            .setTimestamp()
            .setColor(response.status === "OK" ? "00FF00" : "FF0000")
            .setThumbnail('https://e7.pngegg.com/pngimages/655/703/png-clipart-computer-icons-arrow-switch-volume-icon-miscellaneous-angle-thumbnail.png')
            .setFooter('Author: Bartis', 'https://e7.pngegg.com/pngimages/655/703/png-clipart-computer-icons-arrow-switch-volume-icon-miscellaneous-angle-thumbnail.png')
            .setAuthor('Player Switch', message.author.avatarURL())
            .addField('Issuer', message.author.username, true)
            .addField('Target', `**${parameters.playerName}**`, true)
            .addField('Status', response.status, true)
        if (response.status === "FAILED") {
            embed.addField('Reason for failing', response.error, true)
        }
        embed.addField('Server', response.server, false)

        return embed
    }
}
