import { createPool } from 'mysql';
const Discord = require('discord.js');
import { Helpers } from '../../helpers/helpers'
import geoip from 'geoip-lite'

function truncateString(str, maxLength) {
    if (str.length > maxLength) {
        return str.substring(0, maxLength - 3) + '...';
    }
    return str;
}

module.exports = class link {
    constructor() {
        this.name = 'link';
        this.alias = ['linksoldier'];
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

    async findLinkedAccounts(connection, playerName, callback) {
        try {
            const query1 = `
                WITH
                ActID AS (
                    SELECT PlayerID
                    FROM tbl_playerdata
                    WHERE SoldierName = ?
                ),
                HistID AS (
                    SELECT PlayerID
                    FROM SoldierName_history
                    WHERE Old_SoldierName = ?
                )
                SELECT PlayerID
                FROM ActID
                UNION
                SELECT PlayerID
                FROM HistID;
            `;

            const results1 = await this.query(connection, query1, [playerName, playerName]);

            if (results1.length === 0) {
                return [];
            }

            const linkedPlayerIDs = results1.map(row => row.PlayerID);

            if (linkedPlayerIDs.length === 0) {
                return [];
            }

            const query2 = `
                SELECT DISTINCT
                pd.SoldierName AS original_soldierName,
                pd_linked.SoldierName AS linked_soldierName,
                ih.PlayerID,
                ih.IP_Address,
                pd.GameID
                FROM ip_history ih
                JOIN tbl_playerdata pd ON ih.PlayerID = pd.PlayerID
                JOIN ip_history ih_linked ON ih.IP_Address = ih_linked.IP_Address
                JOIN tbl_playerdata pd_linked ON ih_linked.PlayerID = pd_linked.PlayerID
                WHERE ih.PlayerID IN (?);
            `;

            const results2 = await this.query(connection, query2, [linkedPlayerIDs]);

            const linkedAccounts = results2.map(row => {
                if (row.original_soldierName !== row.linked_soldierName) {
                    const lookup = geoip.lookup(row.IP_Address);
                    const country = lookup ? lookup.country : 'Err';

                    return `${row.linked_soldierName} (IP: ${row.IP_Address}, Game ID: ${this.mapNames.get(row.GameID)}) Country: ${country}`;
                }
            });

            return linkedAccounts.filter(Boolean);
        } catch (error) {
            console.error(error);
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
        const pool = createPool(serverConfig);

        const getConnection = () => {
            return new Promise((resolve, reject) => {
                pool.getConnection((err, connection) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(connection);
                    }
                });
            });
        };

        const connection = await getConnection();
        
        try {
            const linkedAccounts = await this.findLinkedAccounts(connection, playerName);

            connection.release();

            return linkedAccounts;
        } catch (error) {
            console.error('Database error:', error);
            connection.release();
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

                return console.error("Couldn't get playername");
            }
            break;
        }

        const linkedAccountsPromises = this.processServer(serverDB, playerName);
        const linkedAccountsArrays = await linkedAccountsPromises;
        const linkedAccounts = linkedAccountsArrays.flat();

        if (linkedAccounts.length === 0) {
            message.reply("linkedAccounts is empty");
            return;
        }

        const embed = new Discord.MessageEmbed()
            .setColor('00FF00')
            .setTitle(`Linked Accounts ${serverDB.database} DB`)
            .addFields(
                {
                    name: 'Accounts',
                    value: truncateString(linkedAccounts.map(account => `• ${account}`).join('\n'), 1024),
                }
            )
            .setFooter(`Requested by ${message.author.username}`)
            .setTimestamp();

        message.channel.send(embed);
    };
}