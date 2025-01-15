const fetch = require("node-fetch");
const Discord = require('discord.js');
import { Helpers } from '../../helpers/helpers'

module.exports = class psay {
    constructor() {
        this.name = 'custom';
        this.alias = ['customcommand'];
        this.usage = `${process.env.DISCORD_COMMAND_PREFIX}${this.name}`;
        this.desc = 'Custom command, execute anything';
    }

    async run(bot, message, args) {
        if (!(message.member.roles.cache.has(process.env.DISCORD_RCON_ROLEID))) {
            message.reply("You don't have permission to use this command.")
            return
        }

        let server = await Helpers.selectServer(message)
        if (!server) {
            message.delete({ timeout: 5000 });
            return;
        }

        message.delete();

        let parameters = await this.getParameters(message, server)
            .then(parameters => {
                return parameters;
            })
            .catch(err => {
                console.log(err);
                return null;
            })

        if (!parameters) {
            return
        }

        return fetch(`${server}/custom`, {
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

    getParameters(message, server) {
        return new Promise(async (resolve, reject) => {
            let custom;      

            askCustom: while(true) {
                custom = await Helpers.askString("Custom", "Provide custom command **SPACE = NEW ARG**, docs are linked in !help", message);
                if(!custom) {
                    if(await Helpers.askTryAgain(message)) {
                        continue askCustom;
                    }
                    return reject(console.error("Couldn't get the message"))
                }
                break;
            }

            const embed = new Discord.MessageEmbed()
                .setTimestamp()
                .setColor("00FF00")
                .setAuthor('Given Properties', message.author.avatarURL());

            embed.addField('Given content', `**${custom}**`, false);

            const msg = await message.channel.send(embed);

            msg.delete();
            const confirmEmbed = new Discord.MessageEmbed()
                .setTimestamp()
                .setColor("00FF00")
                .setAuthor('Are you sure you want execute this command?', message.author.avatarURL());

            confirmEmbed.addField('Given content', `**${custom}**`, false);

            if (await Helpers.confirm(message, confirmEmbed)) {
                let command = '';
                let params = [];
                const splited = custom.split(' ');
                if(splited.length > 1) { // grab params then
                    command = splited[0];
                    params = splited.slice(1);
                } else {
                    command = custom;
                }

                return resolve({
                    command: command,
                    params: params
                });
            }
            else {
                return reject(console.error("custom command interrupted!"))
            }
        })
    }


    buildEmbed(message, parameters, response) { 
        const str = parameters.params.length ? `[${parameters.params.join(' ')}]` : "";
        const embed = new Discord.MessageEmbed()
            .setTimestamp()
            .setColor(response.status === "OK" ? "00FF00" : "FF0000")
            .setThumbnail('https://cdn.discordapp.com/attachments/608427147039866888/688075162608074872/skull2-9b2d7622.png')
            .setFooter('Author: Bartis', 'https://cdn.discordapp.com/attachments/608427147039866888/688075162608074872/skull2-9b2d7622.png')
            .setAuthor('Custom command', message.author.avatarURL())
            .addField('Issuer', message.author.username, true)
            .addField('Content', `**${parameters.command}** ${str}`, true)
            .addField('Status', response.status, true)
        if (response.status === "FAILED") {
            embed.addField('Reason for failing', response.error, true)
        }
        if (response.data) {
            embed.addField('Message', response.data);
        }
        embed.addField('Server', response.server, false)

        return embed
    }
}
