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

  async run(bot, message, args) {
    if (!(message.member.roles.cache.has(process.env.DISCORD_RCON_ROLEID))) {
      message.reply("You don't have permission to use this command.")
      return
    }

    message.delete();

    for (const serverConfig of this.dbsConfig) {
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

        const query = `
                SELECT rcd.record_id, target_name, ban_id, ban_status, ban_notes, ban_startTime, ban_endTime, record_message, source_name, ServerName
                FROM adkats_bans AS ab
                INNER JOIN tbl_playerdata AS tp ON ab.player_id = tp.PlayerID
                INNER JOIN adkats_records_main AS rcd ON ab.latest_record_id = rcd.record_id
                INNER JOIN tbl_server AS s ON rcd.server_id = s.ServerID
                `;


        const results = await this.query(connection, query);

        if (results.length === 0) {
          message.reply('No bans found in the ban list.');
          return;
        }
        else {
          const fileName = `bans_${serverConfig.database}.txt`;

          const fileContent = results.map(row => (
            `Ban ID: ${row.ban_id}\n`
            + `Ban Notes: ${row.ban_notes}\n`
            + `Ban Status: ${row.ban_status}\n`
            + `Ban Start Time: ${row.ban_startTime}\n`
            + `Ban End Time: ${row.ban_endTime}\n`
            + `Target Name: ${row.target_name}\n`
            + `Record Message: ${row.record_message}\n`
            + `Banned by: ${row.source_name}\n`
            + `Server: ${row.ServerName}\n\n`
          )).join('');

          fs.writeFileSync(fileName, fileContent, 'utf-8');
          await message.channel.send({ files: [fileName] });
          await fs.promises.unlink(fileName);
        }

        await disconnect();

      } catch (error) {
        console.error('Database error:', error);
        await disconnect();
      }
    }
  }
}