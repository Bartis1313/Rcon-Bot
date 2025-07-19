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

        // or optimize api db...
        this.nicknameCache = new Map();
        this.cacheExpiry = 2 * 60 * 1000; // 2 minutes
        this.cacheUpdatePromises = new Map();
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

        setInterval(async () => {
            await this.queueBackgroundNicknameFetch('FF', `${this.apiUrl}/api/nicknames`);
            await this.queueBackgroundNicknameFetch('ZLO', `${this.zloApiUrl}/api/nicknames`);
        }, 60_000);
    }

    // ff - I forgot about that nicknames can be copied, ol to new new to old
    // zlo - fixed, uses nativeData in OnlineId ServerPlayer::OnlineId
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

    getCachedNicknamesData(source) {
        const cacheKey = `${source}_nicknames`;
        const cached = this.nicknameCache.get(cacheKey);

        if (cached && cached.data.success && Date.now() - cached.timestamp < this.cacheExpiry) {
            return cached.data.nicknames;
        }
        return null;
    }

    setCachedNicknamesData(source, data) {
        const cacheKey = `${source}_nicknames`;
        this.nicknameCache.set(cacheKey, {
            data: { success: true, nicknames: data },
            timestamp: Date.now()
        });
    }

    async fetchAndCacheNicknamesBackground(source, url) {
        const cacheKey = `${source}_nicknames`;
        if (this.cacheUpdatePromises.has(cacheKey)) {
            return this.cacheUpdatePromises.get(cacheKey);
        }

        const fetchPromise = (async () => {
            try {
                const apiClient = await Fetch.withApiKey(this.apiKey);
                const response = await apiClient.get(url);

                if (response.success) {
                    const processed = this.processNicknames(response.nicknames, source);
                    this.setCachedNicknamesData(source, processed);
                    //console.log(`Successfully refreshed ${source} nickname cache.`);
                    return { success: true, nicknames: processed };
                } else {
                    console.warn(`Background fetch for ${source} failed:`, response.message);
                    return { success: false, nicknames: [] };
                }
            } catch (error) {
                console.warn(`Error during background fetch for ${source} nicknames:`, error.message);
                return { success: false, nicknames: [] };
            } finally {
                this.cacheUpdatePromises.delete(cacheKey);
            }
        })();

        this.cacheUpdatePromises.set(cacheKey, fetchPromise);
        return fetchPromise;
    }

    async queueBackgroundNicknameFetch(source) {
        const url = source === 'FF' ? `${this.apiUrl}/api/nicknames` : `${this.zloApiUrl}/api/nicknames`;
        await this.fetchAndCacheNicknamesBackground(source, url);
    }

    async handleAutocomplete(interaction) {
        try {
            if (!interaction.isAutocomplete()) {
                return;
            }

            const db = interaction.options.getString("db");
            const focusedValue = interaction.options.getFocused().toLowerCase();

            if (!focusedValue) {
                await this.safeRespond(interaction, []);
                return;
            }

            let allNames = [];
            let ffNicknames = [];
            let zloNicknames = [];

            if (db === "BOTH" || db === "FF") {
                ffNicknames = this.getCachedNicknamesData('FF') || [];
            }

            if (db === "BOTH" || db === "ZLO") {
                zloNicknames = this.getCachedNicknamesData('ZLO') || [];
            }

            if (db === "BOTH") {
                const mergedNicknames = this.mergeNicknames(ffNicknames, zloNicknames);
                allNames = mergedNicknames.map(entry => entry.name);
            } else if (db === "FF") {
                allNames = ffNicknames.map(entry => entry.name);
            } else if (db === "ZLO") {
                allNames = zloNicknames.map(entry => entry.name);
            }

            if (allNames.length === 0) {
                // If cache is empty or stale, return no suggestions.
                await this.safeRespond(interaction, []);
                return;
            }

            const matchedPlayer = Matching.getBestMatch(focusedValue, allNames, 25);
            if (!matchedPlayer || matchedPlayer.type === "far") {
                await this.safeRespond(interaction, []);
                return;
            }

            let players = [];
            if (matchedPlayer.type === "good") {
                players = [matchedPlayer.name];
            } else if (matchedPlayer.type === "multi") {
                players = matchedPlayer.names;
            }

            await this.safeRespond(interaction,
                players.map(name => ({ name: name, value: name }))
            );
        } catch (error) {
            console.error('Error in autocomplete:', error);
            await this.safeRespond(interaction, []);
        }
    }

    async safeRespond(interaction, choices) {
        try {
            if (!interaction.responded && !interaction.deferred) {
                await interaction.respond(choices);
            }
        } catch (error) {
            console.warn('Failed to respond to autocomplete interaction:', error.message);
        }
    }

    async runSlash(interaction) {
        if (!await Helpers.checkRoles(interaction, this)) return;

        await interaction.deferReply();

        const nickname = interaction.options.getString('nickname');
        const db = interaction.options.getString('db');

        if (!nickname) {
            await interaction.editReply("Nickname cannot be empty.");
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
                    console.error('Error fetching FF data for /ffhw command:', error);
                }
            }

            if (db === "BOTH" || db === "ZLO") {
                try {
                    const linkResult = await apiClient.get(`${this.zloApiUrl}/api/linked-players/${encodeURIComponent(nickname)}`);
                    if (linkResult.success && linkResult.data) {
                        const linkedPlayers = linkResult.data.linkedPlayers || [];

                        const convertedAccounts = linkedPlayers.map(player => ({
                            name: player.nicknames.join(', '),
                            source: 'ZLO',
                            userid: player.userid,
                            sharedHwids: player.hwids,
                            firstSeen: player.firstSeen,
                            lastSeen: player.lastSeen,
                            sessionCount: player.sessionCount
                        }));

                        convertedAccounts.forEach(account => {
                            account.sharedHwids.forEach(hwid => allHwids.add(hwid));
                        });

                        allLinkedAccounts = allLinkedAccounts.concat(convertedAccounts);
                    }
                } catch (error) {
                    console.error('Error fetching ZLO data for /ffhw command:', error);
                }
            }

            if (allLinkedAccounts.length === 0 && allHwids.size === 0) {
                await interaction.editReply(`No linked accounts or HWIDs found for **${nickname}**.`);
                return;
            }

            const allUniqueHwids = Array.from(allHwids);
            if (allUniqueHwids.length > 0) {
                const embedHwid = new EmbedBuilder()
                    .setColor('Blue')
                    .setTimestamp()
                    .setAuthor({ name: `HWIDs for ${nickname}`, iconURL: interaction.user.displayAvatarURL() })
                    .setDescription(`\`\`\`\n${Helpers.truncateString(allUniqueHwids.join('\n'), DiscordLimits.maxDescriptionLength)}\n\`\`\``)
                    .setFooter({ text: `Total HWIDs: ${allUniqueHwids.length}` });
                embeds.push(embedHwid);
            }

            const accountsBySource = {
                FF: allLinkedAccounts.filter(acc => acc.source === 'FF'),
                ZLO: allLinkedAccounts.filter(acc => acc.source === 'ZLO')
            };

            for (const [source, accounts] of Object.entries(accountsBySource)) {
                if (accounts.length === 0) continue;

                const FIELDS_PER_EMBED = 25;
                for (let i = 0; i < accounts.length; i += FIELDS_PER_EMBED) {
                    const accountsChunk = accounts.slice(i, i + FIELDS_PER_EMBED);
                    const embedChunk = new EmbedBuilder()
                        .setColor(source === 'FF' ? 'Green' : 'Orange')
                        .setTimestamp()
                        .setAuthor({
                            name: i === 0
                                ? `${source} Linked Accounts for ${nickname}`
                                : `${source} Linked Accounts for ${nickname} (Continued ${Math.ceil((i + 1) / FIELDS_PER_EMBED)})`,
                            iconURL: interaction.user.displayAvatarURL()
                        });

                    let zloHwidLines = [];

                    for (const acc of accountsChunk) {
                        const displayName = acc.source === 'ZLO' && acc.userid
                            ? `${acc.name} (ID: ${acc.userid})`
                            : acc.name;

                        const value = `${acc.sharedHwids.length} shared HWID${acc.sharedHwids.length !== 1 ? 's' : ''}${acc.sessionCount ? ` • ${acc.sessionCount} session${acc.sessionCount !== 1 ? 's' : ''}` : ''}`;

                        embedChunk.addFields({
                            name: displayName,
                            value,
                            inline: true
                        });

                        if (acc.source === 'ZLO') {
                            zloHwidLines.push(`**${displayName}**\n${acc.sharedHwids.join('\n')}`);
                        }
                    }

                    if (source === 'ZLO' && zloHwidLines.length > 0) {
                        const hwidText = Helpers.truncateString(zloHwidLines.join('\n\n'), DiscordLimits.maxDescriptionLength);
                        embedChunk.setDescription(`**Associated HWIDs:**\n\`\`\`\n${hwidText}\n\`\`\``);
                    }

                    embeds.push(embedChunk);
                }
            }

            await Helpers.sendInChunks(interaction, embeds);

        } catch (err) {
            console.error('Error in /ffhw command:', err);
            await interaction.editReply(`An unexpected error occurred: ${err.message}`);
        }
    }
};