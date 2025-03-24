const { EmbedBuilder, SlashCommandBuilder, MessageFlags } = require('discord.js');
import { Helpers, DiscordLimits } from '../../helpers/helpers';
import Fetch from '../../helpers/fetch';
import Matching from '../../helpers/matching';

module.exports = class LinkHwid {
    constructor() {
        this.name = 'ffhw';
        this.description = 'Find accounts linked to a player by shared HWIDs';
        this.apiUrl = process.env.HWID_API_URL;
        this.apiKey = process.env.HWID_API_KEY;
        this.globalCommand = true;
    }

    async init() {
        this.slashCommand = new SlashCommandBuilder()
            .setName(this.name)
            .setDescription(this.description)
            .addStringOption(option =>
                option.setName('nickname')
                    .setDescription('Player nickname to check')
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
                players.map(name => ({ name: name, value: name }))
            );
        } catch (error) {
            console.error('Error in autocomplete:', error);
            await interaction.respond([]);
        }
    }

    async runSlash(interaction) {
        if (!Helpers.checkRoles(interaction, this) && !Helpers.checkUsers(interaction)) return;

        await interaction.deferReply();
        
        const nickname = interaction.options.getString('nickname');
        if (!nickname) {
            await interaction.editReply("Nickname cannot be empty");
            return;
        }
        try {
            const apiClient = await Fetch.withApiKey(this.apiKey);
            const linkResult = await apiClient.get(`${this.apiUrl}/api/linked-players/${encodeURIComponent(nickname)}`);
            if (!linkResult.success) {
                await interaction.editReply(`Error: ${linkResult.message || 'Failed to find linked accounts'}`);
                return;
            }
            const embeds = [];
            const linkedAccounts = linkResult.linkedAccounts || [];
            const playerHwids = linkResult.hwids || [];
            const uniqueHwids = new Set();
            playerHwids.forEach(hwid => uniqueHwids.add(hwid));
            linkedAccounts.forEach(account => {
                account.sharedHwids.forEach(hwid => uniqueHwids.add(hwid));
            });
            const allUniqueHwids = Array.from(uniqueHwids);
            const embedHwid = new EmbedBuilder()
                .setColor('Blue')
                .setTimestamp()
                .setAuthor({ name: `Linked accounts for ${nickname}`, iconURL: interaction.user.displayAvatarURL() })
                .setDescription(Helpers.truncateString(allUniqueHwids.join('\n'), DiscordLimits.maxDescriptionLength))
            embeds.push(embedHwid);
            
            // Create multiple embeds for linked accounts, each with no more than 25 fields
            const FIELDS_PER_EMBED = 25; // Discord's limit
            for (let i = 0; i < linkedAccounts.length; i += FIELDS_PER_EMBED) {
                const accountsChunk = linkedAccounts.slice(i, i + FIELDS_PER_EMBED);
                const embedChunk = new EmbedBuilder()
                    .setColor('Green')
                    .setTimestamp()
                    .setAuthor({ 
                        name: i === 0 
                            ? `Linked accounts for ${nickname}` 
                            : `Linked accounts for ${nickname} (Continued ${Math.ceil((i+1)/FIELDS_PER_EMBED)})`, 
                        iconURL: interaction.user.displayAvatarURL() 
                    });
                
                for (const acc of accountsChunk) {
                    embedChunk.addFields({ 
                        name: acc.name, 
                        value: `${acc.sharedHwids.length.toString()} hwid`, 
                        inline: true 
                    });
                }
                
                embeds.push(embedChunk);
            }
            
            await Helpers.sendInChunks(interaction, embeds);
        }
        catch (err) {
            console.error('Error finding linked accounts:', err);
            await interaction.editReply(`Error finding linked accounts: ${err.message}`);
        }
    }
};