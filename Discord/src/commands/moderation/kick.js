const fetch = require("node-fetch");
const { EmbedBuilder } = require('discord.js');
import { Helpers } from '../../helpers/helpers'
import PlayerMatching from '../../helpers/playerMatching'

module.exports = class Kick {
    constructor() {
        this.name = 'kick';
        this.alias = ['kickplayer'];
        this.usage = `${process.env.DISCORD_COMMAND_PREFIX}${this.name}`;
    }

    async run(bot, message, args) {
        if (!message.member.roles.cache.has(process.env.DISCORD_RCON_ROLEID)) {
            message.reply("You don't have permission to use this command.");
            return;
        }

        let server = await Helpers.selectServer(message);
        if (!server) {
            setTimeout(() => message.delete().catch(() => { }), 5000);
            return;
        }

        message.delete().catch(() => { });

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

        return fetch(`${server}/admin/kick`, {
            method: "post",
            headers: {
                "Content-type": "application/json",
                "Accept": "application/json",
                "Accept-Charset": "utf-8",
            },
            body: JSON.stringify(parameters),
        })
            .then(response => response.json())
            .then(async json => {
                return message.channel.send({ embeds: [this.buildEmbed(message, parameters, json)] });
            })
            .catch(error => {
                console.error(error);
                return false;
            });
    }

    async getParameters(message, server) {
        return new Promise(async (resolve, reject) => {
            const response = await Helpers.getPlayers(server);
            if (!response.data.players) return reject(new Error("No players in the server."));

            let playerName;
            let reason;

            // Player selection
            while (true) {
                playerName = await Helpers.ask(message, "Player name", "Give player name to kick");
                if (!playerName) {
                    if (await Helpers.askTryAgain(message)) continue;
                    return reject(new Error("Couldn't get the player name."));
                }

                const playerNames = response.data.players.map(player => player.name);
                const matchedPlayer = PlayerMatching.getBestPlayerMatch(playerName, playerNames);
                if (!matchedPlayer) {
                    if (await Helpers.askTryAgain(message, "No matches")) continue;
                    return reject(new Error("Couldn't match the player to any player in the server."));
                }

                switch (matchedPlayer.type) {
                    case "good":
                        playerName = matchedPlayer.playerName;
                        break;
                    case "far":
                        const confirmEmbed = new EmbedBuilder()
                            .setTimestamp()
                            .setColor('Yellow')
                            .setAuthor({ name: 'Confirm', iconURL: message.author.displayAvatarURL() })
                            .setDescription(`Did you mean ${matchedPlayer.playerName}?`);

                        if (await Helpers.confirm(message, confirmEmbed)) {
                            playerName = matchedPlayer.playerName;
                            break;
                        }
                        if (await Helpers.askTryAgain(message))
                            continue;
                        break;
                    case "multi":
                        const selectedPlayer = await Helpers.selectPlayerName(message, matchedPlayer.playerNames);
                        if (selectedPlayer) {
                            playerName = selectedPlayer;
                            break;
                        }
                        if (await Helpers.askTryAgain(message, "Didn't match"))
                            continue;
                        break;
                }

                break;
            }

            const embed = new EmbedBuilder()
                .setTimestamp()
                .setColor('Green')
                .setAuthor({ name: 'Given Properties', iconURL: message.author.displayAvatarURL() })
                .addFields({ name: 'Given playername', value: `**${playerName}**` });

            const msg = await message.channel.send({ embeds: [embed] });

            // Reason selection
            while (true) {
                reason = await Helpers.ask(message, "Kick Reason", "Give kick reason");
                if (!reason) {
                    if (await Helpers.askTryAgain(message)) continue;
                    return reject(new Error("Couldn't get the reason."));
                }
                break;
            }

            msg.delete().catch(() => { });

            const confirmEmbed = new EmbedBuilder()
                .setTimestamp()
                .setColor('Yellow')
                .setAuthor({ name: 'Are you sure you want to kick player?', iconURL: message.author.displayAvatarURL() })
                .addFields(
                    { name: 'Given playername', value: `**${playerName}**` },
                    { name: 'Given reason', value: `**${reason}**` },
                );

            if (await Helpers.confirm(message, confirmEmbed)) {
                return resolve({
                    playerName,
                    reason,
                });
            } else {
                return reject(new Error("Kick interrupted!"));
            }
        });
    }

    buildEmbed(message, parameters, response) {
        const embed = new EmbedBuilder()
            .setTimestamp()
            .setColor(response.status === "OK" ? 'Green' : 'Red')
            .setThumbnail('https://cdn.discordapp.com/attachments/608427147039866888/688004144165945344/cross.png')
            .setFooter({ text: 'Author: Bartis', iconURL: 'https://cdn.discordapp.com/attachments/608427147039866888/688004144165945344/cross.png' })
            .setAuthor({ name: 'Player Kick', iconURL: message.author.displayAvatarURL() })
            .addFields(
                { name: 'Issuer', value: message.author.username, inline: true },
                { name: 'Target', value: `**${parameters.playerName}**`, inline: true },
                { name: 'Status', value: response.status, inline: true }
            );

        if (response?.data?.reason) {
            embed.addFields({ name: 'Reason', value: response.data.reason, inline: true });
        }

        if (response.status === "FAILED") {
            embed.addFields({ name: 'Reason for failing', value: response.error.name, inline: true });
        }

        embed.addFields({ name: 'Server', value: response.server, inline: false });

        return embed;
    }
};
