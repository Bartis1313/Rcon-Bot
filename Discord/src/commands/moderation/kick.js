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
        if (!await Helpers.checkRoles(interaction, this))
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
