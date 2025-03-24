const { EmbedBuilder, SlashCommandBuilder, MessageFlags } = require('discord.js');
import { Helpers, DiscordLimits } from '../../helpers/helpers';
import Fetch from '../../helpers/fetch';

module.exports = class GetBans {
    constructor() {
        this.name = 'ffbans';
        this.description = 'Get current HWID bans';
        this.apiUrl = process.env.HWID_API_URL;
        this.apiKey = process.env.HWID_API_KEY;
    }

    async init() {
        this.slashCommand = new SlashCommandBuilder()
            .setName(this.name)
            .setDescription(this.description)
    }

    async runSlash(interaction) {
        if (!Helpers.checkRoles(interaction, this)) return;

        await interaction.deferReply();
        const user = interaction.user;

        try {
            const apiClient = await Fetch.withApiKey(this.apiKey);
            const bansResult = await apiClient.get(`${this.apiUrl}/api/bans`);

            if (!bansResult.success) {
                await interaction.editReply(`Error: ${bansResult.message || 'Failed to retrieve bans'}`);
                return;
            }

            const bans = bansResult.bans || [];

            if (bans.length === 0) {
                await interaction.editReply("No HWID bans found");
                return;
            }

            const embeds = [];
            const summaryEmbed = new EmbedBuilder()
                .setTitle('HWID Ban List')
                .setColor('Red')
                .setAuthor({ name: `Requested by ${interaction.user.tag}`, iconURL: user.displayAvatarURL() })
                .setTimestamp();

            let description = `Showing ${bans.length} of ${bansResult.totalBans} total banned HWIDs\n\n`;
            description += `**Ban Statistics:**\n`;
            description += `→ Total Banned HWIDs: ${bansResult.totalBans}\n`;
            description += `→ Unique Players Banned: ${bansResult.uniquePlayers}`;

            summaryEmbed.setDescription(description);
            embeds.push(summaryEmbed);

            const descs = [];
            let d = '';
            bansResult.bans.forEach((ban, index) => {
                d += `${ban.players.join(', ')}\n${ban.hwid}\n`;

                if ((index !== 0 && index % 20 === 0) || d.length > 1000) { // to make sure it's fine
                    descs.push(d);
                    d = '';
                }
            })

            if (d.length) {
                descs.push(descIp);
            }

            descs.forEach((desc, index) => {
                const embed = new EmbedBuilder()
                    .setColor('Blue')
                    .setDescription(`${index === 0 ? '🔹 Previous ips\n\n' : ''}${desc}`);

                embeds.push(embed);
            })

            await Helpers.sendInChunks(interaction, embeds);

        } catch (error) {
            console.error('Error retrieving bans:', error);
            await interaction.editReply(`Error retrieving ban list: ${error.message}`);
        }
    }
};