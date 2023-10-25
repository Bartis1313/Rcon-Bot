var config = require("config")
const fetch = require("node-fetch");
const Discord = require('discord.js');
import Helpers from '../../helpers/helpers'

module.exports = class unban {
    constructor() {
        this.name = 'unban';
        this.alias = ['ub'];
        this.usage = `${process.env.DISCORD_COMMAND_PREFIX || config.commandPrefix}${this.name}`;
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
    //     if (!(message.member.roles.cache.has(process.env.DISCORD_RCON_ROLEID || config.rconRoleId))) {
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

    //     let parameters = await this.getParameters(message, server)
    //         .then(parameters => {
    //             this.clearMessages();
    //             return parameters;
    //         })
    //         .catch(err => {
    //             console.log(err);
    //             this.clearMessages();
    //             return null;
    //         })

    //     if (!parameters) {
    //         return
    //     }

    //     return fetch(`${ server } /admin/unban`, {
    //         method: "post",
    //         headers: {
    //             "Content-type": "application/json",
    //             "Accept": "application/json",
    //             "Accept-Charset": "utf-8"
    //         },
    //         body: JSON.stringify(parameters)
    //     })
    //         .then(response => response.json())
    //         .then(json => {
    //             return message.channel.send({ embed: this.buildEmbed(message, parameters, json) })
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

    // getParameters(message) {
    //     return new Promise(async (resolve, reject) => {
    //         let banType;
    //         let banId;

    //         askbanType: while (true) {
    //             banType = await Helpers.askbanType(message);
    //             if (!banType) {
    //                 if (await Helpers.askTryAgain(message)) {
    //                     continue askbanType;
    //                 }

    //                 return reject(Error("Couldn't get the ban Type"))
    //             }
    //             break;
    //         }

    //         askPlayerName: while (true) {
    //             banId = await Helpers.askPlayerName(message);
    //             if (!banId) {
    //                 if (await Helpers.askTryAgain(message)) {
    //                     continue askPlayerName;
    //                 }

    //                 return reject(Error("Couldn't get the banId"))
    //             }
    //             break;
    //         }


    //         const embed = new Discord.MessageEmbed()
    //             .setTimestamp()
    //             .setColor("00FF00")
    //             .setAuthor('Given Properties', message.author.avatarURL());

    //         embed.addField('Given playername', `** ${ banId }** `, false);

    //         const msg = await message.channel.send(embed);

    //         msg.delete();
    //         const confirmEmbed = new Discord.MessageEmbed()
    //             .setTimestamp()
    //             .setColor("00FF00")
    //             .setAuthor('Are you sure you want to unban the player?', message.author.avatarURL());

    //         confirmEmbed.addField('Given banType', `** ${ banType }** `, false);
    //         confirmEmbed.addField('Given playername', `** ${ banId }** `, false);


    //         if (await Helpers.confirm(message, confirmEmbed)) {
    //             return resolve({
    //                 banType: banType,
    //                 banId: banId,
    //             });
    //         }
    //         else {
    //             return reject(Error("Unban interrupted!"))
    //         }
    //     })
    // }

    // buildEmbed(message, parameters, response) {
    //     const embed = new Discord.MessageEmbed()
    //         .setColor(response.status === "OK" ? "00FF00" : "FF0000")
    //         .setTimestamp()
    //         .setThumbnail('https://i.ytimg.com/vi/6HZRpRhS0-8/maxresdefault.jpg')
    //         .setFooter('Author: Bartis', 'https://i.ytimg.com/vi/6HZRpRhS0-8/maxresdefault.jpg')
    //         .setAuthor('Unban', message.author.avatarURL())
    //         .addField('Issuer', message.author.username, true)
    //     if (response.status === "OK") {
    //         embed.addField('Target', `** ${ response.data.banId }** `, true)
    //         embed.addField('Type', response.data.banType, true)
    //     }
    //     else {
    //         embed.addField('Reason for Fail', `** ${ response.error }** `, true)
    //         embed.setDescription("It could be the fact nikcname is case-sensitive or wrong banId, try again")
    //     }
    //     embed.addField('Server', response?.server, false)

    //     return embed
    // }

    // code for adkats relation
    async run(bot, message, args) {
        if (!(message.member.roles.cache.has(process.env.DISCORD_RCON_ROLEID || config.rconRoleId))) {
            message.reply("You don't have permission to use this command.")
            message.delete()
            return
        }

        // should we do that?
        // ORDER BY r.record_time DESC
        // LIMIT 1;
        const query = `
        UPDATE adkats_bans AS b
        JOIN adkats_records_main AS r ON b.latest_record_id = r.record_id
        SET b.ban_status = ?
        WHERE r.target_name = ?;
        `;

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
        const newBanStatus = "Expired";

        for (const serverConfig of this.dbsConfig) {
            const connection = createConnection(serverConfig);

            connection.connect((err) => {
                if (err) {
                    console.error('Error connecting to MySQL:', err);
                    return;
                }

                connection.query(query, [newBanStatus, playerName], (error, result) => {
                    if (error) {
                        console.error('Error updating ban status:', error);
                        message.reply('An error occurred while updating the ban status.');
                    } else {
                        if (result.affectedRows === 0) {
                            message.reply(`Server ${serverConfig.database}, no active bans found for player name: ${playerName}.`);
                        } else {
                            message.reply(`Server ${serverConfig.database}, the ban for player name: ${playerName} has been marked as expired.`);
                        }
                    }
                });

                connection.end();
            })
        }
    }
}