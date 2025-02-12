const { EmbedBuilder, SlashCommandBuilder, MessageFlags } = require('discord.js');
const geoip = require('geoip-lite');
import { Helpers, DiscordLimits } from '../../helpers/helpers';
import DBHelper from '../../helpers/dbHelper';

module.exports = class LinkCommand {
    constructor() {
        this.name = 'link';
        this.description = 'Links all accounts by IP';

        this.dbsConfig = [];
        this.dbNames = [];
        if (process.env.DBS_NAME) {
            const sHosts = process.env.DBS_HOST.split(',');
            const sNames = process.env.DBS_NAME.split(',');
            const sUsers = process.env.DBS_USER.split(',');
            const sPasses = process.env.DBS_PASS.split(',');
            const sPorts = process.env.DBS_PORT.split(',');
            const len = sPorts.length;

            for (let i = 0; i < len; i++) {
                this.dbsConfig.push({
                    host: sHosts[i],
                    user: sUsers[i],
                    password: sPasses[i],
                    database: sNames[i],
                    port: sPorts[i],
                });
                this.dbNames.push(sNames[i]);
            }
        }
        else {
            throw Error("Unable to load link, fill config correctly");
        }

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

    async findLinkedAccounts(connection, playerName) {
        try {
            return DBHelper.query(connection, `
                WITH ActID AS (
                    SELECT PlayerID FROM tbl_playerdata WHERE SoldierName = ?
                ),
                HistID AS (
                    SELECT PlayerID FROM SoldierName_history WHERE Old_SoldierName = ?
                )
                SELECT PlayerID FROM ActID
                UNION
                SELECT PlayerID FROM HistID;
            `, [playerName, playerName])
                .then(playerDataIDs => {
                    if (!playerDataIDs.length) return [];
                    const linkedPlayerIDs = playerDataIDs.map(row => row.PlayerID);
                    return DBHelper.query(connection, `
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
                `, [linkedPlayerIDs]);
                })
                .then(infos => infos
                    .filter(row => row.original_soldierName !== row.linked_soldierName)
                    .map(row => {
                        const country = geoip.lookup(row.IP_Address)?.country || 'Err';
                        return `${row.linked_soldierName} (IP: ${row.IP_Address}, Game ID: ${this.mapNames.get(row.GameID)}) Country: ${country}`;
                    })
                );
        } catch (error) {
            console.error('Error finding linked accounts:', error);
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

        const linkedAccounts = await DBHelper.processServer(serverDB, async (connection) => {
            return await this.findLinkedAccounts(connection, playerName);
        });

        if (linkedAccounts.length === 0) {
            await interaction.editReply(`Did not find linked accounts for ${playerName}`);
            return;
        }

        await interaction.editReply({ embeds: await this.buildEmbeds(interaction, serverDB, playerName, linkedAccounts) });
    }

    async run(bot, message, args) {
        if (!Helpers.checkRoles(message, this))
            return;

        const serverDB = await Helpers.selectArray(message, this.dbsConfig, this.dbNames);
        if (!serverDB)
            return;

        let playerName = '';
        askPlayerName: while (true) {
            playerName = await Helpers.askPlayerName(message);
            if (!playerName) {
                if (await Helpers.askTryAgain(message)) {
                    continue askPlayerName;
                }

                return console.error("Couldn't get playername");
            }
            break;
        }

        const linkedAccounts = await DBHelper.processServer(serverConfig, async (connection) => {
            return await this.findLinkedAccounts(connection, playerName);
        });

        if (linkedAccounts.length === 0) {
            await message.reply("linkedAccounts is empty");
            return;
        }

        await message.channel.send({ embeds: [await this.buildEmbed(message, serverDB, playerName, linkedAccounts)] });
    }

    async buildEmbeds(messageOrInteraction, serverDB, playerName, linkedAccounts) {
        const chunkArray = (arr, size) => {
            const chunks = [];
            for (let i = 0; i < arr.length; i += size) {
                chunks.push(arr.slice(i, i + size));
            }
            return chunks;
        };

        const accountChunks = chunkArray(linkedAccounts, DiscordLimits.accountsPerField);

        const embeds = [];
        let currentEmbed = new EmbedBuilder()
            .setColor('Green')
            .setTitle(`Linked Accounts for ${playerName} - ${serverDB.database} DB`)
            .setFooter({ text: `Requested by ${messageOrInteraction.user.username}` })
            .setTimestamp();

        for (let i = 0; i < accountChunks.length; i++) {
            const chunk = accountChunks[i];
            const fieldValue = Helpers.truncateString(chunk.map(account => `• ${account}`).join('\n'), DiscordLimits.maxFieldLength);

            if (currentEmbed.data.fields && currentEmbed.data.fields.length >= DiscordLimits.maxFieldsPerEmbed) {
                embeds.push(currentEmbed);
                currentEmbed = new EmbedBuilder()
                    .setColor('Green')
                    .setFooter({ text: `Requested by ${messageOrInteraction.user.username}` })
                    .setTimestamp();
            }

            currentEmbed.addFields({
                name: `Accounts (Part ${i + 1})`,
                value: fieldValue,
            });
        }

        if (currentEmbed.data.fields && currentEmbed.data.fields.length > 0) {
            embeds.push(currentEmbed);
        }

        return embeds;
    }
};