import { createConnection } from 'mysql';
const Discord = require('discord.js');
import { Helpers } from '../../helpers/helpers'
import geoip from 'geoip-lite'
import fs from 'fs'

function truncateString(str, maxLength) {
    if (str.length > maxLength) {
        return str.substring(0, maxLength - 3) + '...';
    }
    return str;
}

module.exports = class check {
    constructor() {
        this.name = 'check';
        this.alias = ['checkplayer'];
        this.usage = `${process.env.DISCORD_COMMAND_PREFIX}${this.name}`;

        this.dbsConfig = [];
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
            }
        }

        this.mapNames = new Map();
        this.mapNames.set(1, 'BF3')
        this.mapNames.set(2, 'BF4')
        this.mapNames.set(3, 'BF?')
    }

    async findInfoAccounts(connection, playerName, callback) {
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

            const results = await this.query(connection, query, [playerName, playerName, playerName]);

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
            throw error;
        }
    }

    query(connection, sql, values) {
        return new Promise((resolve, reject) => {
            connection.query(sql, values, (error, results) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(results);
                }
            });
        });
    }

    async processServer(serverConfig, playerName) {

        const connection = createConnection(serverConfig);

        const connect = () => {
            return new Promise((resolve, reject) => {
                connection.connect((err) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve();
                    }
                });
            });
        };

        const disconnect = () => {
            return new Promise((resolve) => {
                connection.end(() => {
                    resolve();
                });
            });
        };

        try {
            await connect();

            const infosAccounts = await this.findInfoAccounts(connection, playerName);

            await disconnect();

            return infosAccounts;
        } catch (error) {
            console.error('Database error:', error);
            await disconnect();
            return [];
        }
    }

    async run(bot, message, args) {
        if (!(message.member.roles.cache.has(process.env.DISCORD_RCON_ROLEID))) {
            message.reply("You don't have permission to use this command.")
            message.delete()
            return
        }

        let serverDB = await Helpers.selectDBServer(message, this.dbsConfig)
        if (!serverDB) {
            message.delete({ timeout: 5000 });
            return;
        }

        message.delete();

        let playerName = '';
        askPlayerName: while (true) {
            playerName = await Helpers.askPlayerName(message);
            if (!playerName) {
                if (await Helpers.askTryAgain(message)) {
                    continue askPlayerName;
                }

                return console.error("Couldn't get the playerName");
            }
            break;
        }

        const infosAccountsPromises = this.processServer(serverDB, playerName);
        const infosAccountsArrays = await infosAccountsPromises;
        const infosAccounts = infosAccountsArrays.flat();

        if (infosAccounts.length === 0) {
            message.reply("infos is empty");
            return;
        }

        const embed = new Discord.MessageEmbed()
            .setColor('00FF00')
            .setTimestamp()
            .setAuthor(`Check for ${serverDB.database}`, message.author.avatarURL())
            .setFooter('Author: Bartis');

        infosAccounts.forEach(async (playerInfo) => {
            const lookup = geoip.lookup(playerInfo.IP_Address);
            const country = lookup ? lookup.country : 'Err';

            embed.addFields(
                { name: 'Soldier Name', value: playerInfo.SoldierName || 'N/A', inline: true },
                { name: 'Global Rank', value: playerInfo.GlobalRank || 'N/A', inline: true },
                { name: 'EA GUID', value: playerInfo.EAGUID || 'N/A', inline: true },
                { name: 'PB GUID', value: playerInfo.PBGUID || 'N/A', inline: true },
                { name: 'IP Address', value: playerInfo.IP_Address || 'N/A', inline: true },
                { name: 'Country Code', value: country || 'N/A', inline: true }, // country code might be empty for some people
                { name: 'GameID', value: this.mapNames.get(playerInfo.GameID) || 'N/A', inline: true },
                { name: '\u200b', value: '\u200b', inline: true },
                { name: '\u200b', value: '\u200b', inline: true }
            );

            const uniqueHistoryAccounts = new Map();

            if (playerInfo.NicknameHistory && playerInfo.NicknameHistory.length > 0) {
                playerInfo.NicknameHistory.forEach(history => {
                    const newKey = history.New_SoldierName;
                    const oldKey = history.Old_SoldierName;

                    if (!uniqueHistoryAccounts.has(newKey) && !uniqueHistoryAccounts.has(oldKey)) {
                        uniqueHistoryAccounts.set(newKey, history.RecStamp);
                        uniqueHistoryAccounts.set(oldKey, history.RecStamp);
                    }
                });

                if (Array.from(uniqueHistoryAccounts).length >= 25) {

                    message.channel.send(embed);

                    const fileName = `name_history.txt`;

                    const fileContent = Array.from(uniqueHistoryAccounts).map(([nickname, date]) => {
                        const dateObject = new Date(date);
                        return `• ${nickname} (Date: ${dateObject.toLocaleDateString()})`;
                    }).join('\n');

                    fs.writeFileSync(fileName, fileContent, 'utf-8');
                    await message.channel.send({ files: [fileName] });
                    await fs.promises.unlink(fileName);

                    return;
                }

                const historyAccountsList = Array.from(uniqueHistoryAccounts).map(([nickname, date]) => {
                    const dateObject = new Date(date);
                    return `• ${nickname} (Date: ${dateObject.toLocaleDateString()})`;
                }).join('\n');

                const truncated = truncateString(historyAccountsList, 1024);

                embed.addField('Name history', truncated, false);
            }
        });

        message.channel.send(embed);
    };
}