const fetch = require("node-fetch");
const Discord = require('discord.js');
import Helpers from '../../helpers/helpers'
import { createConnection } from 'mysql';
import fs from 'fs'

// notice I don't use offset for the printing bans, I print 0-100 bans. If you want more or add all, use number that will
// add itself and save to file while the array contains anything

module.exports = class printBans {
    constructor() {
        this.name = 'printbans';
        this.alias = ['showbans'];
        this.usage = `${process.env.DISCORD_COMMAND_PREFIX}${this.name}`;
        this.messagesToDelete = [];

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

    // code for NO adkats db relation to server
    // async run(bot, message, args) {
    //     if (!(message.member.roles.cache.has(process.env.DISCORD_RCON_ROLEID))) {
    //         message.reply("You don't have permission to use this command.")
    //         return
    //     }
    //     await message.delete()

    //     let server = await Helpers.selectServer(message)
    //     if (!server) {
    //         message.reply("Unknown error");
    //         message.delete({ timeout: 5000 });
    //         this.clearMessages();
    //         return;
    //     }

    //     return fetch(`${server}/printBans`, {
    //         method: "post",
    //         headers: {
    //             "Content-type": "application/json",
    //             "Accept": "application/json",
    //             "Accept-Charset": "utf-8"
    //         },
    //     })
    //         .then(response => response.json())
    //         .then(json => {
    //             let str = "[banType], [banId], [timeout], [seconds-timeout], [rounds-timeout], [reason]\n";
    //             for (let i = 0; i < json.data.length; i++) {
    //                 if (i % 6 === 0) {
    //                     str += `\n${(i / 6 + 1).toString()}. `
    //                 }
    //                 str += `${json.data[i]} `;
    //             }
    //             fs.writeFile('printBans.txt', str, (err) => {
    //                 if (err) console.log(err)
    //             })
    //             return message.channel.send({
    //                 embed: this.buildEmbed(message, json), files: [{
    //                     attachment: './printBans.txt',
    //                     name: 'BanlistPrint.txt'
    //                 }]
    //             })
    //         })
    //         .catch(error => {
    //             console.log(error)
    //             return false
    //         })
    // }

    // clearMessages() {
    //     for (const message of this.messagesToDelete) {
    //         message.delete();
    //     }
    // }

    // buildEmbed(message, response) {
    //     const embed = new Discord.MessageEmbed()
    //         .setTimestamp()
    //         .setColor(response.status === "OK" ? "00FF00" : "FF0000")
    //         .setThumbnail('https://img.pngio.com/ban-banhammer-censor-censorship-hammer-ip-block-moderator-icon-banhammer-png-512_512.png')
    //         .setFooter('Author: Bartis', 'https://img.pngio.com/ban-banhammer-censor-censorship-hammer-ip-block-moderator-icon-banhammer-png-512_512.png')
    //         .setAuthor('Banlist print', message.author.avatarURL())
    //         .addField('Issuer', message.author.username, true)
    //         .addField('Status', response.status, true)
    //     if (response.status === "FAILED") {
    //         embed.addField('Reason for failing', response.error, true)
    //     }
    //     embed.addField('Server', response.server, false)

    //     return embed
    // }

    // code for adkats relation
    async run(bot, message, args) {
        if (!(message.member.roles.cache.has(process.env.DISCORD_RCON_ROLEID))) {
            message.reply("You don't have permission to use this command.")
            return
        }

        for (const serverConfig of this.dbsConfig) {
            const connection = createConnection(serverConfig);

            connection.connect((err) => {
                if (err) {
                    console.error('Error connecting to MySQL:', err);
                    return;
                }

                const query = `
                SELECT 
                  b.ban_id,
                  b.ban_notes,
                  b.ban_status,
                  b.ban_startTime,
                  b.ban_endTime,
                  r.target_name,
                  r.record_message,
                  r.record_time
                FROM adkats_bans AS b
                JOIN adkats_records_main AS r ON b.latest_record_id = r.record_id;
              `;

              connection.query(query, async(error, results) => {
                if (error) {
                  console.error('Error querying the database:', error);
                  message.reply('An error occurred while fetching ban information.');
                } else {
                  if (results.length === 0) {
                    message.reply('No bans found in the ban list.');
                  } else {
                    const fileName = `bans_${serverConfig.database}.txt`;
              
                    const fileContent = results.map(row => (
                      `Ban ID: ${row.ban_id}\n`
                      + `Ban Notes: ${row.ban_notes}\n`
                      + `Ban Status: ${row.ban_status}\n`
                      + `Ban Start Time: ${row.ban_startTime}\n`
                      + `Ban End Time: ${row.ban_endTime}\n`
                      + `Target Name: ${row.target_name}\n`
                      + `Record Message: ${row.record_message}\n`
                      + `Record Time: ${row.record_time}\n\n`
                    )).join('');
              
                    fs.writeFileSync(fileName, fileContent, 'utf-8');
                    await message.channel.send({ files: [fileName] });
                    await fs.promises.unlink(fileName);
                  }
                }
              });

              connection.end();
            })
        }
    }
}