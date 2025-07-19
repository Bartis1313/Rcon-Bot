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
            await this.fetchNicknamesWithCache('FF', `${this.apiUrl}/api/nicknames`);
            await this.fetchNicknamesWithCache('ZLO', `${this.zloApiUrl}/api/nicknames`);
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

    async getCachedNicknames(source) {
        const cacheKey = `${source}_nicknames`;
        const cached = this.nicknameCache.get(cacheKey);

        if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
            return cached.data;
        }

        return null;
    }

    setCachedNicknames(source, data) {
        const cacheKey = `${source}_nicknames`;
        this.nicknameCache.set(cacheKey, {
            data: data,
            timestamp: Date.now()
        });
    }

    async fetchNicknamesWithCache(source, url) {
        const cached = await this.getCachedNicknames(source);
        if (cached) {
            return cached;
        }

        const cacheKey = `${source}_nicknames`;
        if (this.cacheUpdatePromises.has(cacheKey)) {
            return await this.cacheUpdatePromises.get(cacheKey);
        }

        const fetchPromise = this.fetchAndCacheNicknames(source, url);
        this.cacheUpdatePromises.set(cacheKey, fetchPromise);

        try {
            const result = await fetchPromise;
            return result;
        } finally {
            this.cacheUpdatePromises.delete(cacheKey);
        }
    }

    async fetchAndCacheNicknames(source, url) {
        try {
            const apiClient = await Fetch.withApiKey(this.apiKey);
            const response = await apiClient.get(url);

            if (response.success) {
                this.setCachedNicknames(source, response);
                return response;
            } else {
                return { success: false, nicknames: [] };
            }
        } catch (error) {
            console.warn(`Error fetching ${source} nicknames:`, error.message);
            return { success: false, nicknames: [] };
        }
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

            // cuz it's heavy, let manual handle instead of dc error
            const timeout = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Timeout')), 2000)
            );

            if (db === "BOTH") {
                try {
                    const [responseFF, responseZLO] = await Promise.race([
                        Promise.all([
                            this.fetchNicknamesWithCache('FF', `${this.apiUrl}/api/nicknames`),
                            this.fetchNicknamesWithCache('ZLO', `${this.zloApiUrl}/api/nicknames`)
                        ]),
                        timeout
                    ]);

                    if (!responseFF.success && !responseZLO.success) {
                        await this.safeRespond(interaction, []);
                        return;
                    }

                    const ffNicknames = responseFF.success ? this.processNicknames(responseFF.nicknames, 'FF') : [];
                    const zloNicknames = responseZLO.success ? this.processNicknames(responseZLO.nicknames, 'ZLO') : [];

                    const mergedNicknames = this.mergeNicknames(ffNicknames, zloNicknames);
                    allNames = mergedNicknames.map(entry => entry.name);
                } catch (error) {
                    console.warn('Timeout or error in BOTH API calls:', error.message);
                    await this.safeRespond(interaction, []);
                    return;
                }

            } else if (db === "ZLO") {
                try {
                    const responseZLO = await Promise.race([
                        this.fetchNicknamesWithCache('ZLO', `${this.zloApiUrl}/api/nicknames`),
                        timeout
                    ]);

                    if (!responseZLO.success) {
                        await this.safeRespond(interaction, []);
                        return;
                    }

                    const processedNicknames = this.processNicknames(responseZLO.nicknames, 'ZLO');
                    allNames = processedNicknames.map(entry => entry.name);
                } catch (error) {
                    console.warn('Timeout or error in ZLO API call:', error.message);
                    await this.safeRespond(interaction, []);
                    return;
                }

            } else if (db === "FF") {
                try {
                    const responseFF = await Promise.race([
                        this.fetchNicknamesWithCache('FF', `${this.apiUrl}/api/nicknames`),
                        timeout
                    ]);

                    if (!responseFF.success) {
                        await this.safeRespond(interaction, []);
                        return;
                    }

                    const processedNicknames = this.processNicknames(responseFF.nicknames, 'FF');
                    allNames = processedNicknames.map(entry => entry.name);
                } catch (error) {
                    console.warn('Timeout or error in FF API call:', error.message);
                    await this.safeRespond(interaction, []);
                    return;
                }
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

                    let zloHwidLines = [];

                    for (const acc of accountsChunk) {
                        const displayName = acc.source === 'ZLO' && acc.userid
                            ? `${acc.name} (ID: ${acc.userid})`
                            : acc.name;

                        const value = `${acc.sharedHwids.length} shared HWID${acc.sharedHwids.length !== 1 ? 's' : ''}${acc.sessionCount ? ` • ${acc.sessionCount} session${acc.sessionCount !== 1 ? 's' : ''}` : ''
                            }`;

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
                        embedChunk.setDescription(`**HWIDs:**\n\`\`\`\n${hwidText}\n\`\`\``);
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