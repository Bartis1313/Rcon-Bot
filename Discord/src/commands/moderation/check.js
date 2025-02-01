const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const geoip = require('geoip-lite');
const mysql = require('mysql2');

module.exports = class Check {
    constructor() {
        this.name = 'check';
        this.aliases = ['checkplayer'];
        this.usage = `${process.env.DISCORD_COMMAND_PREFIX}${this.name}`;

        this.dbsConfig = [];
        if (process.env.DBS_NAME) {
            const sHosts = process.env.DBS_HOST.split(',');
            const sNames = process.env.DBS_NAME.split(',');
            const sUsers = process.env.DBS_USER.split(',');
            const sPasses = process.env.DBS_PASS.split(',');
            const sPorts = process.env.DBS_PORT.split(',');

            for (let i = 0; i < sPorts.length; i++) {
                this.dbsConfig.push({
                    host: sHosts[i],
                    user: sUsers[i],
                    password: sPasses[i],
                    database: sNames[i],
                    port: sPorts[i],
                });
            }
        }
        else {
            throw Error("Unable to load check, fill config correctly");
        }

        this.mapNames = new Map([
            [1, 'BF3'],
            [2, 'BF4'],
            [3, 'BF?']
        ]);
    }

    async query(connection, sql, values) {
        return new Promise((resolve, reject) => {
            connection.query(sql, values, (error, results) => {
                error ? reject(error) : resolve(results);
            });
        });
    }

    async findInfoAccounts(connection, playerName) {
        try {
            const query = `
            SELECT pd.PlayerID, COALESCE(pd.SoldierName, snh.New_SoldierName) AS SoldierName,
                   pd.GlobalRank, pd.PBGUID, pd.EAGUID, pd.IP_Address, pd.CountryCode, pd.GameID,
                   snh.New_SoldierName, snh.Old_SoldierName, snh.RecStamp
            FROM tbl_playerdata pd
            LEFT JOIN SoldierName_history snh ON pd.PlayerID = snh.PlayerID
            WHERE pd.SoldierName = ? OR snh.New_SoldierName = ? OR snh.Old_SoldierName = ?
            ORDER BY snh.RecStamp;`;

            return await this.query(connection, query, [playerName, playerName, playerName]);
        } catch (error) {
            throw error;
        }
    }

    async processServer(serverConfig, playerName) {
        const connection = mysql.createConnection(serverConfig);
        try {
            await new Promise((resolve, reject) => connection.connect(err => err ? reject(err) : resolve()));
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
        if (!message.member.roles.cache.has(process.env.DISCORD_RCON_ROLEID)) {
            await message.reply("You don't have permission to use this command.");
            return;
        }

        const serverDB = await Helpers.selectDBServer(message, this.dbsConfig);
        if (!serverDB) return;

        let playerName = await Helpers.askPlayerName(message);
        if (!playerName) return;

        const infosAccounts = await this.processServer(serverDB, playerName);
        if (infosAccounts.length === 0) {
            await message.reply("No information found.");
            return;
        }

        const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTimestamp()
            .setAuthor({ name: `Check for ${serverDB.database}`, iconURL: message.author.displayAvatarURL() })
            .setFooter({ text: 'Author: Bartis' });

        const fileContent = [];

        infosAccounts.forEach(playerInfo => {
            const country = geoip.lookup(playerInfo.IP_Address)?.country || 'Err';
            embed.addFields(
                { name: 'Soldier Name', value: playerInfo.SoldierName || 'N/A', inline: true },
                { name: 'Global Rank', value: String(playerInfo.GlobalRank) || 'N/A', inline: true },
                { name: 'EA GUID', value: playerInfo.EAGUID || 'N/A', inline: true },
                { name: 'PB GUID', value: playerInfo.PBGUID || 'N/A', inline: true },
                { name: 'IP Address', value: playerInfo.IP_Address || 'N/A', inline: true },
                { name: 'Country Code', value: country, inline: true },
                { name: 'GameID', value: this.mapNames.get(playerInfo.GameID) || 'N/A', inline: true }
            );
            fileContent.push(JSON.stringify(playerInfo, null, 2));
        });

        await message.channel.send({ embeds: [embed] });

        if (fileContent.length > 2) {
            const fileName = 'check.txt';
            fs.writeFileSync(fileName, fileContent.join('\n'), 'utf-8');
            await message.channel.send({ files: [fileName] });
            fs.unlinkSync(fileName);
        }
    }
};
