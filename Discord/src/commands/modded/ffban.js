const { EmbedBuilder, SlashCommandBuilder, MessageFlags } = require('discord.js');
import { Helpers, DiscordLimits } from '../../helpers/helpers';
import Fetch from '../../helpers/fetch';
import Matching from '../../helpers/matching';

module.exports = class BanHwid {
    constructor() {
        this.name = 'ffban';
        this.description = 'Ban player and all linked accounts by HWID';
        this.apiUrl = process.env.HWID_API_URL;
        this.apiKey = process.env.HWID_API_KEY;
    }

    async init() {
        this.slashCommand = new SlashCommandBuilder()
            .setName(this.name)
            .setDescription(this.description)
            .addStringOption(option =>
                option.setName('nickname')
                    .setDescription('Player nickname to ban')
                    .setRequired(true)
                    .setAutocomplete(true)
            );
    }

    async handleAutocomplete(interaction) {
        try {
            const apiClient = await Fetch.withApiKey(this.apiKey);
            const response = await apiClient.get(`${this.apiUrl}/api/nicknames`);

            if (!response.success || !response.nicknames) {
                await interaction.respond([]);
                return;
            }

            const allNicknames = response.nicknames;
            const focusedValue = interaction.options.getFocused().toLowerCase();

            const matchedPlayer = Matching.getBestMatch(focusedValue, allNicknames, 25);
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
                players.map(name => ({
                    name,
                    value: name
                }))
            );
        } catch (error) {
            console.error('Error in autocomplete:', error);
            await interaction.respond([]);
        }
    }

    async runSlash(interaction) {
        if (!await Helpers.checkRoles(interaction, this)) return;

        await interaction.deferReply();
        const nickname = interaction.options.getString('nickname');
        const user = interaction.user;

        if (!nickname) {
            await interaction.editReply("Nickname cannot be empty");
            return;
        }

        try {
            const apiClient = await Fetch.withApiKey(this.apiKey);
            const banResult = await apiClient.post(`${this.apiUrl}/api/ban-hwid/${encodeURIComponent(nickname)}`);

            if (!banResult.success) {
                await interaction.editReply(`Error: ${banResult.message || 'Failed to ban player'}`);
                return;
            }

            const embeds = [];
            const summaryEmbed = new EmbedBuilder()
                .setTitle(`HWID Ban: ${nickname}`)
                .setColor('Red')
                .setAuthor({ name: `Ban executed by ${interaction.user.tag}`, iconURL: user.displayAvatarURL() })
                .setTimestamp();

            let description = `Successfully banned ${banResult.player} and all linked accounts\n\n`;
            description += `**Stats:** Banned ${banResult.stats.bannedHwidsCount} HWIDs across ${banResult.stats.linkedPlayersCount} accounts\n\n`;

            if (banResult.linkedPlayers.length > 0) {
                description += `**Banned Players:**\n`;
                banResult.linkedPlayers.forEach(player => {
                    description += `→ ${player}\n`;
                });
            } else {
                description += `**Banned Players:** ${nickname} only\n`;
            }

            summaryEmbed.setDescription(Helpers.truncateString(description), DiscordLimits.maxDescriptionLength);
            embeds.push(summaryEmbed);

            const embedInfo = new EmbedBuilder()
                .setTitle('HWID info')
                .setColor('Blue')
                .setDescription(`${banResult.stats.bannedHwidsCount} hwids\n${banResult.bannedHwids.join('\n')}`);

            embeds.push(embedInfo);

            await Helpers.sendInChunks(interaction, embeds);

        } catch (error) {
            console.error('Error banning HWID:', error);
            await interaction.editReply(`Error banning player: ${error.message}`);
        }
    }
};