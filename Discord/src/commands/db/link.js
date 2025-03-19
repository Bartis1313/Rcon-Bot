const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const geoip = require('geoip-lite');
import { Helpers, DiscordLimits } from '../../helpers/helpers'
import DBHelper from '../../helpers/dbHelper';

module.exports = class LinkCommand {
    constructor() {
        this.name = 'link';
        this.description = 'Links all accounts by IP';

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
            .addBooleanOption(option =>
                option.setName("complex")
                    .setDescription("Find really ALL ips")
                    .setRequired(false)
            );
    }

    async findLinkedAccounts(connection, playerName, easy) {
        try {
            return DBHelper.query(connection, `
                WITH ActID AS (
                    SELECT PlayerID, IP_Address FROM tbl_playerdata WHERE SoldierName = ?
                ),
                HistID AS (
                    SELECT PlayerID FROM SoldierName_history WHERE Old_SoldierName = ?
                )
                SELECT PlayerID, IP_Address FROM ActID
                UNION
                SELECT PlayerID, NULL FROM HistID;
            `, [playerName, playerName])
                .then(async playerData => {
                    if (!playerData.length) return { linkedAccounts: [], ipHistory: [] };

                    const playerIDs = playerData.map(row => row.PlayerID);
                    const currentIP = playerData.find(row => row.IP_Address)?.IP_Address || 'Unknown';

                    const ipHistory = await DBHelper.query(connection, `
                        SELECT DISTINCT IP_Address, RecStamp FROM ip_history WHERE PlayerID IN (?);
                    `, [playerIDs]);

                    let linkedAccounts = [];

                    if (easy) {
                        // easy - get directly only current
                        linkedAccounts = await DBHelper.query(connection, `
                            SELECT DISTINCT
                                SoldierName AS linked_soldierName,
                                IP_Address,
                                GameID
                            FROM tbl_playerdata
                            WHERE IP_Address IN (
                                SELECT IP_Address FROM tbl_playerdata WHERE PlayerID IN (?)
                            );
                        `, [playerIDs]);
                    } else {
                        // complex - based on ip history
                        //const ipList = ipHistory.map(row => row.IP_Address);
                        linkedAccounts = await DBHelper.query(connection, `
                            SELECT DISTINCT 
                                pd.SoldierName AS original_soldierName,
                                pd_linked.SoldierName AS linked_soldierName,
                                ih.IP_Address,
                                pd.GameID
                            FROM ip_history ih
                            JOIN tbl_playerdata pd ON ih.PlayerID = pd.PlayerID
                            JOIN ip_history ih_linked ON ih.IP_Address = ih_linked.IP_Address
                            JOIN tbl_playerdata pd_linked ON ih_linked.PlayerID = pd_linked.PlayerID
                            WHERE ih.PlayerID IN (?);
                        `, [playerIDs]);
                    }

                    const uniqueNames = new Set();
                    const filteredLinkedAccounts = linkedAccounts.filter(el => {
                        const key = el.linked_soldierName + el.GameID;
                        if (!uniqueNames.has(key)) {
                            uniqueNames.add(key);
                            return true;
                        }
                        return false;
                    });

                    return {
                        linkedAccounts: Array.from(filteredLinkedAccounts),
                        ipData: ipHistory.map(row => ({ IP: row.IP_Address, Date: row.RecStamp })),
                        currentIP
                    };
                });
        } catch (error) {
            console.error('Error finding linked accounts:', error);
            return { linkedAccounts: [], ipHistory: [] };
        }
    }

    async runSlash(interaction) {
        if (!Helpers.checkRoles(interaction, this))
            return;

        await interaction.deferReply();

        const server = interaction.options.getString("server");
        const serverDB = this.dbsConfig.find(db => db.database === server);
        const playerName = interaction.options.getString("name");
        const complex = interaction.options.getBoolean("complex");

        const linkedAccounts = await DBHelper.processServer(serverDB, async (connection) => {
            return await this.findLinkedAccounts(connection, playerName, !complex);
        });

        if (linkedAccounts.length === 0) {
            await interaction.editReply(`Did not find linked accounts for ${playerName}`);
            return;
        }

        const { ips, embeds } = await this.buildEmbeds(interaction, serverDB, playerName, linkedAccounts);
        const sendInChunks = async (arr) => {
            if (arr.length === 0)
                return;

            for (let i = 0; i < arr.length; i += 10) {
                await interaction.followUp({ embeds: arr.slice(i, i + 10) });
            }
        }

        await interaction.editReply({ embeds: embeds.slice(0, 10) });
        await sendInChunks(embeds.slice(10));
        await sendInChunks(ips);
    }

    async buildEmbeds(messageOrInteraction, serverDB, playerName, linkedData) {
        const user = Helpers.isCommand(messageOrInteraction) ? messageOrInteraction.user : messageOrInteraction.author;
        const { linkedAccounts, ipData, currentIP } = linkedData;

        const embeds = [];
        const chunkArray = (arr, size) => {
            const chunks = [];
            for (let i = 0; i < arr.length; i += size) {
                chunks.push(arr.slice(i, i + size));
            }
            return chunks;
        };

        const descIps = [];
        const ips = [];
        let descIp = '';
        ipData.forEach((ip, index) => {
            const pad = (n) => {
                return n.toString().padStart(2, '0');
            }

            const formatDate = (date) => {
                return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
            }
            descIp += `${ip.IP} ${formatDate(new Date(ip.Date))}\n`;

            if (index !== 0 && index % 20 === 0) { // to make sure it's fine
                descIps.push(descIp);
                descIp = '';
            }
        })

        if (descIp.length) {
            descIps.push(descIp);
        }

        descIps.forEach((desc, index) => {
            const ipEmbed = new EmbedBuilder()
                .setColor('Blue');
            if (index === 0) {
                ipEmbed
                    .setTitle(`${playerName} - ${serverDB.database} DB (${currentIP})`)
                    .setFooter({ text: `Requested by ${user.username}` })
                    .setTimestamp()
            }
            ipEmbed
                .setDescription(`${index === 0 ? '🔹 Previous ips\n\n' : ''}${desc}`);

            ips.push(ipEmbed);
        })
        const accountChunks = chunkArray(linkedAccounts, 15);

        for (let i = 0; i < accountChunks.length; i++) {
            const chunk = accountChunks[i];
            const embed = new EmbedBuilder()
                .setColor('Green')
                .setTitle(i === 0 ? `Linked Accounts for ${playerName}` : null)
                .setFooter({ text: `Requested by ${user.username}` })
                .setTimestamp();

            let str = '';
            chunk.forEach((account, index) => {
                str += `• ${account.linked_soldierName} (${account.IP_Address} ${geoip.lookup(account.IP_Address).country}, ${this.mapNames.get(account.GameID)})\n`;
            });
            embed.setDescription(str);

            embeds.push(embed);
        }

        return { embeds, ips };
    }
};