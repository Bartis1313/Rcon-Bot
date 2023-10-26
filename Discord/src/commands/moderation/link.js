import config from "config";
import { createConnection } from 'mysql';
const Discord = require('discord.js');
import Helpers from '../../helpers/helpers'

module.exports = class link {
    constructor() {
        this.name = 'link';
        this.alias = ['linksoldier'];
        this.usage = `${process.env.DISCORD_COMMAND_PREFIX || config.commandPrefix}${this.name}`;

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
    }

    async findLinkedAccountsOctet3(connection, playerName, callback) {
        return new Promise((resolve, reject) => {
            const query = `
              SELECT t1.SoldierName, t1.IP_Address, t1.GameID
              FROM tbl_playerdata t1
              JOIN tbl_playerdata t2 ON SUBSTRING_INDEX(t1.IP_Address, '.', 3) = SUBSTRING_INDEX(t2.IP_Address, '.', 3)
              WHERE LOWER(t2.SoldierName) = LOWER(?)
              ORDER BY
                CASE
                  WHEN t1.IP_Address = t2.IP_Address AND t1.GameID = t2.GameID THEN 1  -- Exact IP, Exact Game ID
                  WHEN t1.IP_Address = t2.IP_Address THEN 2  -- Exact IP, Different Game ID
                  ELSE 3  -- Same octet
                END
            `;

            connection.query(query, [playerName.toLowerCase()], (error, results) => {
                if (error) {
                    reject(error);
                } else {
                    const linkedAccounts = [];
                    const uniqueAccounts = new Set();

                    results.forEach((row) => {
                        const accountKey = `${row.SoldierName}-${row.IP_Address}-${row.GameID}`;

                        if (!uniqueAccounts.has(accountKey)) {
                            linkedAccounts.push(
                                `${row.IP_Address === results[0].IP_Address && row.GameID === results[0].GameID
                                    ? 'Exact IP, Exact Game ID'
                                    : row.IP_Address === results[0].IP_Address
                                        ? 'Exact IP, Different Game ID'
                                        : 'Same Octet'
                                }: ${row.SoldierName} (IP: ${row.IP_Address}, Game ID: ${row.GameID})`
                            );
                            uniqueAccounts.add(accountKey);
                        }
                    });

                    resolve(linkedAccounts);
                }
            });
        });
    }

    async findLinkedAccounts(connection, playerName, callback) {
        return new Promise((resolve, reject) => {
            const query = `
            SELECT t1.SoldierName, t1.IP_Address, t1.GameID
            FROM tbl_playerdata t1
            JOIN tbl_playerdata t2 ON t1.IP_Address = t2.IP_Address
            WHERE LOWER(t2.SoldierName) = LOWER(?)
            ORDER BY
              CASE
                WHEN t1.IP_Address = t2.IP_Address AND t1.GameID = t2.GameID THEN 1  -- Exact IP, Exact Game ID
                WHEN t1.IP_Address = t2.IP_Address THEN 2  -- Exact IP, Different Game ID
                ELSE 3  -- Different IP
              END
            `;

            connection.query(query, [playerName.toLowerCase()], (error, results) => {
                if (error) {
                    reject(error);
                } else {
                    const linkedAccounts = [];

                    results.forEach((row) => {
                        if(row.IP_Address) {
                            const accountInfo = `${row.SoldierName} (IP: ${row.IP_Address}, Game ID: ${row.GameID})`;
                            linkedAccounts.push(accountInfo);
                        }
                    });

                    resolve(linkedAccounts);
                }
            });
        });
    }

    async processServer(serverConfig, playerName) {
        const connection = createConnection(serverConfig);

        connection.connect();

        try {
            const linkedAccounts = await this.findLinkedAccounts(connection, playerName);

            connection.end();

            return linkedAccounts;
        } catch (error) {
            console.error('Database error:', error);
            connection.end();
            return [];
        }
    }

    async run(bot, message, args) {
        if (!(message.member.roles.cache.has(process.env.DISCORD_RCON_ROLEID || config.rconRoleId))) {
            message.reply("You don't have permission to use this command.")
            message.delete()
            return
        }
        message.delete();

        let serverDB = await Helpers.selectDBServer(message, this.dbsConfig)
        if (!serverDB) {
            message.reply("Unknown error");
            message.delete({ timeout: 5000 });
            return;
        }

        let playerName = '';
        askPlayerName: while (true) {
            playerName = await Helpers.askPlayerName(message);
            if (!playerName) {
                if (await Helpers.askTryAgain(message)) {
                    continue askPlayerName;
                }

                return reject(Error("Couldn't get the playerName"))
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
                linkedAccounts.map((account) => ({
                    name: 'Account',
                    value: account,
                }))
            )
            .setFooter(`Requested by ${message.author.username}`)
            .setTimestamp();

        message.channel.send(embed);
    };
}