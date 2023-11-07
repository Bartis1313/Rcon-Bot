import { createConnection } from 'mysql';
//import geoip from 'geoip-country';
const Discord = require('discord.js');
import Helpers from '../../helpers/helpers'
import geoip from 'geoip-lite'

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
    }

    async findInfoAccounts(connection, playerName, callback) {
        return new Promise((resolve, reject) => {
            const query = `
            SELECT PlayerID, SoldierName, GlobalRank, PBGUID, EAGUID, IP_Address, CountryCode, GameID
            FROM tbl_playerdata
            WHERE SoldierName = ?
            `;

            connection.query(query, [playerName.toLowerCase()], (error, results) => {
                if (error) {
                    reject(error);
                } else {
                    const infos = [];
                    const uniqueAccounts = new Set();

                    results.forEach((row) => {
                        const accountKey = `${row.SoldierName}-${row.IP_Address}-${row.GameID}`;

                        if (!uniqueAccounts.has(accountKey)) {
                            infos.push({
                                SoldierName: row.SoldierName,
                                GlobalRank: row.GlobalRank,
                                PBGUID: row.PBGUID,
                                EAGUID: row.EAGUID,
                                IP_Address: row.IP_Address,
                                CountryCode: row.CountryCode,
                                GameID: row.GameID,
                            });
                            uniqueAccounts.add(accountKey);
                        }
                    });

                    resolve(infos);
                }
            });
        });
    }

    async processServer(serverConfig, playerName) {
        const connection = createConnection(serverConfig);

        connection.connect();

        try {
            const infosAccounts = await this.findInfoAccounts(connection, playerName);

            connection.end();

            return infosAccounts;
        } catch (error) {
            console.error('Database error:', error);
            connection.end();
            return [];
        }
    }

    async run(bot, message, args) {
        if (!(message.member.roles.cache.has(process.env.DISCORD_RCON_ROLEID))) {
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
        infosAccounts.forEach((playerInfo) => {
            console.log(playerInfo);
            const lookup = geoip.lookup(playerInfo.IP_Address);
            let country = "Err";
            if(lookup) {
                country = lookup.country;
            }

            embed.addField('Soldier Name', playerInfo.SoldierName || 'N/A', true); // 1
            embed.addField('Global Rank', playerInfo.GlobalRank || 'N/A', true); // 2
            embed.addField('EA GUID', playerInfo.EAGUID || 'N/A', true); // 3
            embed.addField('PB GUID', playerInfo.PBGUID || 'N/A', true); // 1
            embed.addField('IP Address', playerInfo.IP_Address || 'N/A', true); // 2
            embed.addField('Country Code', /*playerInfo.CountryCode*/country || 'N/A', true); // 3 // crashign sometimes, country code is empty for some ppl
            embed.addField('GameID', playerInfo.GameID || 'N/A', true); // 1
            embed.addField('\u200b', '\u200b', true); // 2
            embed.addField('\u200b', '\u200b', true); // 3
        });
        embed.setTimestamp()
        embed.setAuthor(`Check for ${serverDB.database}`, message.author.avatarURL())
        embed.setFooter('Author: Bartis')

        message.channel.send(embed);
    };
}