const { EmbedBuilder, SlashCommandBuilder, MessageFlags } = require('discord.js');
import { Helpers } from '../../helpers/helpers'
import Matching from '../../helpers/matching'
import Fetch from '../../helpers/fetch';

module.exports = class Bully {
    constructor() {
        this.name = 'bully';
        this.description = 'Kill loop the player until they leave';
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

        if (!playerName) {
            await interaction.editReply("playerName can't be null");
            return;
        }

        const parameters = {
            playerName
        };

        return Fetch.post(`${server}/admin/kill`, parameters)
            .then(async (response) => {
                let countmap = new Map();
                const initialCount = 1;
                countmap.set(playerName, initialCount);

                const msg = await interaction.editReply({ embeds: [this.buildEmbed(interaction, parameters, response, initialCount)] });
                const interval = setInterval(async () => {
                    const response = await Helpers.getPlayers(server);
                    const playerNames = response.data.players.map(player => player.name);

                    Fetch.post(`${server}/admin/kill`, parameters)
                        .then(response => {
                            if (response?.status === "OK") {
                                countmap.set(playerName, ++curr);
                                const curr = countmap.get(playerName);

                                msg.edit({ embeds: [this.buildEmbed(interaction, parameters, response, curr)] }).catch(err => { });
                            }
                        })

                    if (!playerNames.includes()) {
                        clearInterval(interval);

                        const curr = countmap.get(playerName);
                        msg.edit({ embeds: [this.buildEmbed(interaction, parameters, response, curr, true)] }).catch(err => { });
                        return;
                    }

                }, 1000);

            })
            .catch(error => {
                console.error(error);
                return false;
            });
    }

    buildEmbed(messageOrInteraction, parameters, response, countbully, left) {
        const user = Helpers.isCommand(messageOrInteraction) ? messageOrInteraction.user : messageOrInteraction.author;
        const embed = new EmbedBuilder()
            .setTimestamp()
            .setColor(response.status === "OK" ? 'Green' : 'Red')
            .setThumbnail('https://cdn.discordapp.com/attachments/608427147039866888/688004144165945344/cross.png')
            .setFooter({ text: 'Author: Bartis', iconURL: 'https://cdn.discordapp.com/attachments/608427147039866888/688004144165945344/cross.png' })
            .setAuthor({ name: 'Bully', iconURL: user.displayAvatarURL() })
            .addFields(
                { name: 'Issuer', value: user.username, inline: true },
                { name: 'Target', value: `**${parameters.playerName}**`, inline: true },
                { name: 'Status', value: response.status, inline: true }
            );

        if (response.status === "FAILED") {
            embed.addFields({ name: 'Reason for failing', value: response.error, inline: true });
        }

        if (countbully) {
            embed.addFields({ name: `Bully count ${left ? '(Left the server)' : ''}`, value: countbully, inline: true });
        }

        embed.addFields({ name: 'Server', value: response.server, inline: false });

        return embed;
    }
};
