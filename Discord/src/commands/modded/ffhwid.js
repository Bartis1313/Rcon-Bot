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
        this.zloApiUrl = process.env.ZLO_HWID_API_URL;
        this.globalCommand = true;
    }

    async init() {
        this.slashCommand = new SlashCommandBuilder()
            .setName(this.name)
            .setDescription(this.description)
            .addStringOption(option =>
                option.setName('db')
                    .setDescription('Select database')
                    .setRequired(true)
                    .addChoices(
                        { name: "BOTH", value: "BOTH" },
                        { name: "FF", value: "FF" },
                        { name: "ZLO", value: "ZLO" }
                    )
            )
            .addStringOption(option =>
                option.setName('nickname')
                    .setDescription('Player nickname to check')
                    .setRequired(true)
                    .setAutocomplete(true)
            );
    }

    processNicknames(nicknames, dbType) {
        if (dbType === 'ZLO') {
            return nicknames.map(entry => ({
                name: entry.name,
                source: 'ZLO',
                identifier: entry.userid,
                lastUsed: entry.lastUsed
            }));
        } else {
            return nicknames.map(entry => ({
                name: entry.name,
                source: 'FF',
                identifier: entry.hwid_hash,
                lastUsed: entry.lastUsed
            }));
        }
    }

    mergeNicknames(ffNicknames, zloNicknames) {
        const nicknameMap = new Map();

        ffNicknames.forEach(entry => {
            const key = entry.name.toLowerCase();
            if (!nicknameMap.has(key)) {
                nicknameMap.set(key, {
                    name: entry.name,
                    sources: []
                });
            }
            nicknameMap.get(key).sources.push({
                source: 'FF',
                identifier: entry.identifier,
                lastUsed: entry.lastUsed
            });
        });

        zloNicknames.forEach(entry => {
            const key = entry.name.toLowerCase();
            if (!nicknameMap.has(key)) {
                nicknameMap.set(key, {
                    name: entry.name,
                    sources: []
                });
            }
            nicknameMap.get(key).sources.push({
                source: 'ZLO',
                identifier: entry.identifier,
                lastUsed: entry.lastUsed
            });
        });

        return Array.from(nicknameMap.values()).map(entry => {
            entry.sources.sort((a, b) => new Date(b.lastUsed) - new Date(a.lastUsed));
            return {
                name: entry.name,
                primarySource: entry.sources[0].source,
                allSources: entry.sources
            };
        });
    }

    async handleAutocomplete(interaction) {
        try {
            const apiClient = await Fetch.withApiKey(this.apiKey);
            const db = interaction.options.getString("db");

            let allNames = [];

            if (db === "BOTH") {
                const [responseFF, responseZLO] = await Promise.all([
                    apiClient.get(`${this.apiUrl}/api/nicknames`).catch(() => ({ success: false, nicknames: [] })),
                    apiClient.get(`${this.zloApiUrl}/api/nicknames`).catch(() => ({ success: false, nicknames: [] }))
                ]);

                if (!responseFF.success && !responseZLO.success) {
                    await interaction.respond([]);
                    return;
                }

                const ffNicknames = responseFF.success ? this.processNicknames(responseFF.nicknames, 'FF') : [];
                const zloNicknames = responseZLO.success ? this.processNicknames(responseZLO.nicknames, 'ZLO') : [];

                const mergedNicknames = this.mergeNicknames(ffNicknames, zloNicknames);
                allNames = mergedNicknames.map(entry => entry.name);

            } else if (db === "ZLO") {
                const responseZLO = await apiClient.get(`${this.zloApiUrl}/api/nicknames`).catch(() => ({ success: false }));

                if (!responseZLO.success) {
                    await interaction.respond([]);
                    return;
                }

                const processedNicknames = this.processNicknames(responseZLO.nicknames, 'ZLO');
                allNames = processedNicknames.map(entry => entry.name);

            } else if (db === "FF") {
                const responseFF = await apiClient.get(`${this.apiUrl}/api/nicknames`).catch(() => ({ success: false }));

                if (!responseFF.success) {
                    await interaction.respond([]);
                    return;
                }

                const processedNicknames = this.processNicknames(responseFF.nicknames, 'FF');
                allNames = processedNicknames.map(entry => entry.name);
            }

            const focusedValue = interaction.options.getFocused().toLowerCase();

            const matchedPlayer = Matching.getBestMatch(focusedValue, allNames, 25);
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
            } else if (type === "multi") {
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
        if (!await Helpers.checkRoles(interaction, this)) return;

        await interaction.deferReply();

        const nickname = interaction.options.getString('nickname');
        const db = interaction.options.getString('db');

        if (!nickname) {
            await interaction.editReply("Nickname cannot be empty");
            return;
        }

        try {
            const apiClient = await Fetch.withApiKey(this.apiKey);
            const embeds = [];
            let allLinkedAccounts = [];
            let allHwids = new Set();

            if (db === "BOTH" || db === "FF") {
                try {
                    const linkResult = await apiClient.get(`${this.apiUrl}/api/linked-players/${encodeURIComponent(nickname)}`);
                    if (linkResult.success) {
                        const linkedAccounts = linkResult.linkedAccounts || [];
                        const playerHwids = linkResult.hwids || [];

                        linkedAccounts.forEach(account => {
                            account.source = 'FF';
                            account.sharedHwids.forEach(hwid => allHwids.add(hwid));
                        });

                        playerHwids.forEach(hwid => allHwids.add(hwid));
                        allLinkedAccounts = allLinkedAccounts.concat(linkedAccounts);
                    }
                } catch (error) {
                    console.error('Error fetching FF data:', error);
                }
            }

            if (db === "BOTH" || db === "ZLO") {
                try {
                    const linkResult = await apiClient.get(`${this.zloApiUrl}/api/linked-players/${encodeURIComponent(nickname)}`);
                    if (linkResult.success) {
                        const linkedAccounts = linkResult.linkedAccounts || [];
                        const playerHwids = linkResult.hwids || [];

                        linkedAccounts.forEach(account => {
                            account.source = 'ZLO';
                            account.sharedHwids.forEach(hwid => allHwids.add(hwid));
                        });

                        playerHwids.forEach(hwid => allHwids.add(hwid));
                        allLinkedAccounts = allLinkedAccounts.concat(linkedAccounts);
                    }
                } catch (error) {
                    console.error('Error fetching ZLO data:', error);
                }
            }

            if (allLinkedAccounts.length === 0) {
                await interaction.editReply(`No linked accounts found for ${nickname}`);
                return;
            }

            const allUniqueHwids = Array.from(allHwids);

            const embedHwid = new EmbedBuilder()
                .setColor('Blue')
                .setTimestamp()
                .setAuthor({ name: `HWIDs for ${nickname}`, iconURL: interaction.user.displayAvatarURL() })
                .setDescription(Helpers.truncateString(allUniqueHwids.join('\n'), DiscordLimits.maxDescriptionLength))
                .setFooter({ text: `Total HWIDs: ${allUniqueHwids.length}` });

            embeds.push(embedHwid);

            const accountsBySource = {
                FF: allLinkedAccounts.filter(acc => acc.source === 'FF'),
                ZLO: allLinkedAccounts.filter(acc => acc.source === 'ZLO')
            };

            Object.entries(accountsBySource).forEach(([source, accounts]) => {
                if (accounts.length === 0) return;

                const FIELDS_PER_EMBED = 25;
                for (let i = 0; i < accounts.length; i += FIELDS_PER_EMBED) {
                    const accountsChunk = accounts.slice(i, i + FIELDS_PER_EMBED);
                    const embedChunk = new EmbedBuilder()
                        .setColor(source === 'FF' ? 'Green' : 'Orange')
                        .setTimestamp()
                        .setAuthor({
                            name: i === 0
                                ? `${source} Linked accounts for ${nickname}`
                                : `${source} Linked accounts for ${nickname} (Continued ${Math.ceil((i + 1) / FIELDS_PER_EMBED)})`,
                            iconURL: interaction.user.displayAvatarURL()
                        });

                    for (const acc of accountsChunk) {
                        embedChunk.addFields({
                            name: acc.name,
                            value: `${acc.sharedHwids.length} shared HWID${acc.sharedHwids.length !== 1 ? 's' : ''}`,
                            inline: true
                        });
                    }

                    embeds.push(embedChunk);
                }
            });

            await Helpers.sendInChunks(interaction, embeds);
        } catch (err) {
            console.error('Error finding linked accounts:', err);
            await interaction.editReply(`Error finding linked accounts: ${err.message}`);
        }
    }
};