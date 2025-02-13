const { EmbedBuilder, SlashCommandBuilder, MessageFlags } = require('discord.js');
import { Helpers } from '../../helpers/helpers'
import Matching from '../../helpers/matching'
import Fetch from '../../helpers/fetch';

module.exports = class Kick {
    constructor() {
        this.name = 'kick';
        this.description = 'Kicks a player from the server';
    }

    async init() {
        const servers = await Helpers.getServerChoices();

        this.slashCommand = new SlashCommandBuilder()
            .setName(this.name)
            .setDescription(this.description)
            .addStringOption(option =>
                option.setName('server')
                    .setDescription('Select the server')
                    .setRequired(true)
                    .addChoices(...servers)
            )
            .addStringOption(option =>
                option.setName('name')
                    .setDescription('Select player name')
                    .setRequired(true)
                    .setAutocomplete(true)
            )
            .addStringOption(option =>
                option.setName('reason')
                    .setDescription('Give reason to kick player')
                    .setRequired(false)
            );
    }

    async handleAutocomplete(interaction) {
        const server = interaction.options.getString("server");

        const response = await Helpers.getPlayers(server);
        const playerNames = response.data.players.map(player => player.name);

        const focusedOption = interaction.options.getFocused();
        const matchedPlayer = Matching.getBestMatch(focusedOption, playerNames);
        if (!matchedPlayer) {
            await interaction.respond([]);
            return;
        }

        const type = matchedPlayer.type;
        if (type === "far") {
            await interaction.respond([]);
            return;
        }

        let players = [];
        if (type === "good") {
            players = [matchedPlayer.name];
        }
        else if (type === "multi") {
            players = matchedPlayer.names;
        }

        await interaction.respond(
            players.map(name => ({ name: name, value: name }))
        );
    }

    async runSlash(interaction) {
        if (!Helpers.checkRoles(interaction, this))
            return;

        await interaction.deferReply();

        const server = interaction.options.getString("server");
        const playerName = interaction.options.getString('name');
        const reason = interaction.options.getString('reason');

        if (!playerName) {
            await interaction.editReply("playerName can't be null");
            return;
        }

        const parameters = {
            playerName,
            reason
        };

        return Fetch.post(`${server}/admin/kick`, parameters)
            .then(response => {
                return interaction.editReply({ embeds: [this.buildEmbed(interaction, parameters, response)] });
            })
            .catch(error => {
                console.error(error);
                return false;
            });
    }

    async run(bot, message, args) {
        if (!Helpers.checkRoles(message, this))
            return;

        const server = await Helpers.selectServer(message);
        if (!server) {
            await message.delete();
            return;
        }

        await message.delete();

        const parameters = await this.getParameters(message, server)
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

        return Fetch.post(`${server}/admin/kick`, parameters)
            .then(response => {
                return message.channel.send({ embeds: [this.buildEmbed(message, parameters, response)] });
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

            while (true) {
                playerName = await Helpers.ask(message, "Player name", "Give player name to kick");
                if (!playerName) {
                    if (await Helpers.askTryAgain(message)) continue;
                    return reject(new Error("Couldn't get the player name."));
                }

                const playerNames = response.data.players.map(player => player.name);
                const matchedPlayer = Matching.getBestMatch(playerName, playerNames);
                if (!matchedPlayer) {
                    if (await Helpers.askTryAgain(message, "No matches")) continue;
                    return reject(new Error("Couldn't match the player to any player in the server."));
                }

                switch (matchedPlayer.type) {
                    case "good":
                        playerName = matchedPlayer.name;
                        break;
                    case "far":
                        const confirmEmbed = new EmbedBuilder()
                            .setTimestamp()
                            .setColor('Yellow')
                            .setAuthor({ name: 'Confirm', iconURL: message.author.displayAvatarURL() })
                            .setDescription(`Did you mean ${matchedPlayer.name}?`);

                        if (await Helpers.confirm(message, confirmEmbed)) {
                            playerName = matchedPlayer.name;
                            break;
                        }
                        if (await Helpers.askTryAgain(message))
                            continue;
                        break;
                    case "multi":
                        const selectedPlayer = await Helpers.selectFromEmoteList(message, matchedPlayer.names);
                        if (selectedPlayer === null) {
                            return reject(new Error("Canceled selection"));
                        }
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

    buildEmbed(messageOrInteraction, parameters, response) {
        const user = Helpers.isCommand(messageOrInteraction) ? messageOrInteraction.user : messageOrInteraction.author;
        const embed = new EmbedBuilder()
            .setTimestamp()
            .setColor(response.status === "OK" ? 'Green' : 'Red')
            .setThumbnail('https://cdn.discordapp.com/attachments/608427147039866888/688004144165945344/cross.png')
            .setFooter({ text: 'Author: Bartis', iconURL: 'https://cdn.discordapp.com/attachments/608427147039866888/688004144165945344/cross.png' })
            .setAuthor({ name: 'Player Kick', iconURL: user.displayAvatarURL() })
            .addFields(
                { name: 'Issuer', value: user.username, inline: true },
                { name: 'Target', value: `**${parameters.playerName}**`, inline: true },
                { name: 'Status', value: response.status, inline: true }
            );

        if (response?.data?.reason) {
            embed.addFields({ name: 'Reason', value: response.data.reason, inline: true });
        }

        if (response.status === "FAILED") {
            embed.addFields({ name: 'Reason for failing', value: response.error, inline: true });
        }

        embed.addFields({ name: 'Server', value: response.server, inline: false });

        return embed;
    }
};
