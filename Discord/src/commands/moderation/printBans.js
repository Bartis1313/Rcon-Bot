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
  }

  async run(bot, message, args) {
    if (!(message.member.roles.cache.has(process.env.DISCORD_RCON_ROLEID))) {
      message.reply("You don't have permission to use this command.")
      return
    }
    await message.delete()

    let server = await Helpers.selectServer(message)
    if (!server) {
      message.reply("Unknown error");
      message.delete({ timeout: 5000 });
      return;
    }

    return fetch(`${server}/printBans`, {
      method: "post",
      headers: {
        "Content-type": "application/json",
        "Accept": "application/json",
        "Accept-Charset": "utf-8"
      },
    })
      .then(response => response.json())
      .then(json => {
        let str = "[banType], [banId], [timeout], [seconds-timeout], [rounds-timeout], [reason]\n";
        for (let i = 0; i < json.data.length; i++) {
          if (i % 6 === 0) {
            str += `\n${(i / 6 + 1).toString()}. `
          }
          str += `${json.data[i]} `;
        }
        fs.writeFile('printBans.txt', str, (err) => {
          if (err) console.log(err)
        })
        return message.channel.send({
          embed: this.buildEmbed(message, json), files: [{
            attachment: './printBans.txt',
            name: 'BanlistPrint.txt'
          }]
        })
      })
      .catch(error => {
        console.log(error)
        return false
      })
  }

  buildEmbed(message, response) {
    const embed = new Discord.MessageEmbed()
      .setTimestamp()
      .setColor(response.status === "OK" ? "00FF00" : "FF0000")
      .setThumbnail('https://img.pngio.com/ban-banhammer-censor-censorship-hammer-ip-block-moderator-icon-banhammer-png-512_512.png')
      .setFooter('Author: Bartis', 'https://img.pngio.com/ban-banhammer-censor-censorship-hammer-ip-block-moderator-icon-banhammer-png-512_512.png')
      .setAuthor('Banlist print', message.author.avatarURL())
      .addField('Issuer', message.author.username, true)
      .addField('Status', response.status, true)
    if (response.status === "FAILED") {
      embed.addField('Reason for failing', response.error, true)
    }
    embed.addField('Server', response.server, false)

    return embed
  }
}