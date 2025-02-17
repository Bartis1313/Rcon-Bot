const { EmbedBuilder, SlashCommandBuilder, MessageFlags } = require('discord.js');
const geoip = require('geoip-lite');
import { Helpers, DiscordLimits } from '../../helpers/helpers'
import DBHelper from '../../helpers/dbHelper';

module.exports = class Check {
    constructor() {
        this.name = 'check';
        this.description = 'check information from DB';

        const cfg = DBHelper.getCfg();

        this.dbsConfig = cfg.cfg;
        this.dbNames = cfg.names;

        this.mapNames = new Map([
            [1, 'BF3'],
            [2, 'BF4'],
            [3, 'BF?']
        ]);

        const dbChoices = Helpers.getChoices(this.dbNames, this.dbNames);

        this.slashCommand = new SlashCommandBuilder()
            .setName(this.name)
            .setDescription(this.description)
            .addStringOption(option =>
                option.setName("server")
                    .setDescription("Choose db server")
                    .setRequired(true)
                    .addChoices(...dbChoices)
            )
            .addStringOption(option =>
                option.setName("name")
                    .setDescription("Give name of player")
                    .setRequired(true)
            )
    }

    async findInfoAccounts(connection, playerName) {
        try {
            const query = `
            SELECT
                pd.PlayerID,
                COALESCE(pd.SoldierName, snh.New_SoldierName) AS SoldierName,
                pd.GlobalRank,
                pd.PBGUID,
                pd.EAGUID,
                pd.IP_Address,
                pd.CountryCode,
                pd.GameID,
                snh.New_SoldierName AS New_SoldierName,
                snh.Old_SoldierName,
                snh.RecStamp
            FROM tbl_playerdata pd
            LEFT JOIN SoldierName_history snh ON pd.PlayerID = snh.PlayerID
            WHERE pd.SoldierName = ? OR snh.New_SoldierName = ? OR snh.Old_SoldierName = ?
            ORDER BY snh.RecStamp;
            `;

            const results = await DBHelper.query(connection, query, [playerName, playerName, playerName]);

            const infos = [];
            const uniqueAccounts = new Set();

            results.forEach((row) => {
                const accountKey = `${row.SoldierName}-${row.IP_Address}-${row.GameID}`;

                if (!uniqueAccounts.has(accountKey)) {
                    const accountInfo = {
                        SoldierName: row.SoldierName,
                        GlobalRank: row.GlobalRank,
                        PBGUID: row.PBGUID,
                        EAGUID: row.EAGUID,
                        IP_Address: row.IP_Address,
                        CountryCode: row.CountryCode,
                        GameID: row.GameID,
                        NicknameHistory: []
                    };

                    if (row.New_SoldierName || row.Old_SoldierName) {
                        accountInfo.NicknameHistory.push({
                            New_SoldierName: row.New_SoldierName,
                            Old_SoldierName: row.Old_SoldierName,
                            RecStamp: row.RecStamp
                        });
                    }

                    infos.push(accountInfo);
                    uniqueAccounts.add(accountKey);
                } else {
                    // if the account is already added, just update the nickname history
                    const existingAccount = infos.find(account => account.SoldierName === row.SoldierName);
                    if (row.New_SoldierName || row.Old_SoldierName) {
                        existingAccount.NicknameHistory.push({
                            New_SoldierName: row.New_SoldierName,
                            Old_SoldierName: row.Old_SoldierName,
                            RecStamp: row.RecStamp
                        });
                    }
                }
            });

            return infos;
        } catch (error) {
            console.error(error);
            return [];
        }
    }

    async runSlash(interaction) {
        if (!Helpers.checkRoles(interaction, this))
            return;

        await interaction.deferReply();

        const server = interaction.options.getString("server");
        const serverDB = this.dbsConfig.find(db => db.database === server);
        const playerName = interaction.options.getString("name");

        const infoAccounts = await DBHelper.processServer(serverDB, async (connection) => {
            return await this.findInfoAccounts(connection, playerName);
        });

        if (infoAccounts.length === 0) {
            await interaction.editReply(`Did not find information for ${playerName}`);
            return;
        }

        await interaction.editReply({ embeds: await this.buildEmbeds(interaction, serverDB, playerName, infoAccounts) });
    }

    async buildEmbeds(messageOrInteraction, serverDB, playerName, infosAccounts) {
        const user = Helpers.isCommand(messageOrInteraction) ? messageOrInteraction.user : messageOrInteraction.author;
        const embeds = [];
        let currentEmbed = new EmbedBuilder()
            .setColor('Green')
            .setTimestamp()
            .setAuthor({ name: `Check for ${playerName} - ${serverDB.database}`, iconURL: user.displayAvatarURL() });

        const uniqueHistoryAccounts = new Map();

        for (const playerInfo of infosAccounts) {
            const lookup = geoip.lookup(playerInfo.IP_Address);
            const country = lookup ? lookup.country : 'Err';

            currentEmbed.addFields(
                { name: 'Soldier Name', value: playerInfo.SoldierName || 'N/A', inline: true },
                { name: 'Global Rank', value: String(playerInfo.GlobalRank) || 'N/A', inline: true },
                { name: 'EA GUID', value: playerInfo.EAGUID || 'N/A', inline: true },
                { name: 'PB GUID', value: playerInfo.PBGUID || 'N/A', inline: true },
                { name: 'IP Address', value: playerInfo.IP_Address || 'N/A', inline: true },
                { name: 'Country Code', value: country, inline: true },
                { name: 'GameID', value: this.mapNames.get(playerInfo.GameID) || 'N/A', inline: true },
                { name: '\u200b', value: '\u200b', inline: true },
                { name: '\u200b', value: '\u200b', inline: true }
            );

            if (currentEmbed.data.fields.length >= DiscordLimits.maxFieldsPerEmbed) {
                embeds.push(currentEmbed); // ok we hit the limit
                currentEmbed = new EmbedBuilder() // just reset it
                    .setColor('Green')
                    .setTimestamp()
                    .setAuthor({ name: `Check for ${playerName} - ${serverDB.database} (Continued)`, iconURL: user.displayAvatarURL() });
            }

            if (playerInfo.NicknameHistory && playerInfo.NicknameHistory.length > 0) {
                playerInfo.NicknameHistory.forEach(history => {
                    const newKey = history.New_SoldierName;
                    const oldKey = history.Old_SoldierName;

                    if (!uniqueHistoryAccounts.has(newKey) && !uniqueHistoryAccounts.has(oldKey)) {
                        uniqueHistoryAccounts.set(newKey, history.RecStamp);
                        uniqueHistoryAccounts.set(oldKey, history.RecStamp);
                    }
                });
            }
        }

        if (currentEmbed.data.fields.length > 0) {
            embeds.push(currentEmbed);
        }

        if (uniqueHistoryAccounts.size > 0) {
            const historyAccountsList = Array.from(uniqueHistoryAccounts).map(([nickname, date]) => {
                const dateObject = new Date(date);
                return `• ${nickname} (Date: ${dateObject.toLocaleDateString()})`;
            }).join('\n');

            const chunkString = (str, size) => {
                const chunks = [];
                for (let i = 0; i < str.length; i += size) {
                    chunks.push(str.substring(i, i + size));
                }
                return chunks;
            }

            const historyChunks = chunkString(historyAccountsList, DiscordLimits.maxFieldLength);

            let currentEmbed = new EmbedBuilder()
                .setColor('Green')
                .setTimestamp()
                .setAuthor({ name: `Name History for ${serverDB.database}`, iconURL: user.displayAvatarURL() });

            for (const chunk of historyChunks) {
                currentEmbed
                    .addFields({ name: 'Name History', value: chunk, inline: true });

                if (currentEmbed.data.fields >= DiscordLimits.maxFieldsPerEmbed) {
                    embeds.push(currentEmbed);
                    currentEmbed = new EmbedBuilder()
                        .setColor('Green')
                        .setTimestamp()
                        .setAuthor({ name: `Name History for ${serverDB.database} (Continued)`, iconURL: user.displayAvatarURL() });
                }
            }

            if (currentEmbed.data.fields.length > 0) {
                embeds.push(currentEmbed);
            }
        }

        return embeds;
    }
};
