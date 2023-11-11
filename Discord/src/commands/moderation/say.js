const fetch = require("node-fetch");
const Discord = require('discord.js');
import { Helpers } from '../../helpers/helpers'

module.exports = class say {
    constructor() {
        this.name = 'say';
        this.alias = ['sayall'];
        this.usage = `${process.env.DISCORD_COMMAND_PREFIX}${this.name}`;
        this.messagesToDelete = [];
    }

    async run(bot, message, args) {
        if (!(message.member.roles.cache.has(process.env.DISCORD_RCON_ROLEID))) {
            message.reply("You don't have permission to use this command.")
            return
        }

        let server = await Helpers.selectServer(message)
        if (!server) {
            message.delete({ timeout: 5000 });
            this.clearMessages();
            return;
        }

        message.delete();

        let parameters = await this.getParameters(message, server)
            .then(parameters => {
                this.clearMessages();
                return parameters;
            })
            .catch(err => {
                console.log(err);
                this.clearMessages();
                return null;
            })

        if (!parameters) {
            return
        }

        return fetch(`${server}/admin/sayall`, {
            method: "post",
            headers: {
                "Content-type": "application/json",
                "Accept": "application/json",
                "Accept-Charset": "utf-8"
            },
            body: JSON.stringify(parameters)
        })
            .then(response => response.json())
            .then(json => {  
                return message.channel.send({ embed: this.buildEmbed(message, parameters, json) })
            })
            .catch(error => {
                console.log(error)
                return false
            })
    }

    clearMessages() {
        for (const message of this.messagesToDelete) {
            message.delete();
        }
    }

    getParameters(message, server) {
        return new Promise(async (resolve, reject) => {

            let what;

            askMessage: while(true) {
                what = await Helpers.askMessage(message);
                if(!what) {
                    if(await Helpers.askTryAgain(message)) {
                        continue askMessage;
                    }
                    return reject(console.error("Couldn't get the message"))
                }
                break;
            }

            const embed = new Discord.MessageEmbed()
                .setTimestamp()
                .setColor("00FF00")
                .setAuthor('Given Properties', message.author.avatarURL());

            embed.addField('Given content', `**${what}**`, false);

            const msg = await message.channel.send(embed);

            const confirmEmbed = new Discord.MessageEmbed()
                .setTimestamp()
                .setColor("00FF00")
                .setAuthor('Are you sure you want say it to all as admin?', message.author.avatarURL());

            if (await Helpers.confirm(message, confirmEmbed)) {
                msg.delete();
                return resolve({
                    what: what,
                });
                
            }
            else {
                msg.delete();
                return reject(console.error("say interrupted!"))
            }
        })
    }


    buildEmbed(message, parameters, response) {
        const embed = new Discord.MessageEmbed()
            .setTimestamp()
            .setColor(response.status === "OK" ? "00FF00" : "FF0000")
            .setThumbnail('https://cdn.discordapp.com/attachments/608427147039866888/688075162608074872/skull2-9b2d7622.png')
            .setFooter('Author: Bartis', 'https://cdn.discordapp.com/attachments/608427147039866888/688075162608074872/skull2-9b2d7622.png')
            .setAuthor('Say all', message.author.avatarURL())
            .addField('Issuer', message.author.username, true)
            .addField('Content', `**${parameters.what}**`, true)
            .addField('Status', response.status, true)
        if (response.status === "FAILED") {
            embed.addField('Reason for failing', response.error, true)
        }
        embed.addField('Server', response.server, false)

        return embed
    }
}
