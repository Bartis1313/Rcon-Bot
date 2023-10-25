import config from "config";
import { createConnection } from 'mysql';
//import geoip from 'geoip-country';
const Discord = require('discord.js');

module.exports = class link {
    constructor() {
        this.name = 'link',
        this.alias = ['linksoldier'],
        this.usage = `${process.env.DISCORD_COMMAND_PREFIX || config.commandPrefix}${this.name}`;
    }

    findLinkedAccounts(connection, playerName, callback) {
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
                console.error('Database error:', error);
                callback([]);
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

                callback(linkedAccounts);
            }
        });
    }

    async run(bot, message, args) {
        if (!(message.member.roles.cache.has(process.env.DISCORD_RCON_ROLEID || config.rconRoleId))) {
            message.reply("You don't have permission to use this command.")
            message.delete()
            return
        }
        message.delete();

        args = args.slice(1);
        const playerName = args.join(" ");

        const con = createConnection({
            multipleStatements: true,
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASS,
            database: process.env.DB_NAME,
            port: process.env.DB_PORT
        });

        con.connect();

        this.findLinkedAccounts(con, playerName, (linkedAccounts) => {
            if (linkedAccounts.length === 0) {
                message.reply("linkedAccounts is empty");
                return;
            }

            const embed = new Discord.MessageEmbed()
                .setColor('00FF00')
                .setTitle('Linked Accounts')
                .addFields(
                    linkedAccounts.map((account) => ({
                        name: 'Account',
                        value: account,
                    }))
                )
                .setFooter(`Requested by ${message.author.username}`)
                .setTimestamp();

            message.channel.send(embed);
        });
        
        con.end();
    };
}