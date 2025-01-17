const fetch = require("node-fetch");
const { EmbedBuilder } = require('discord.js');
import { Helpers } from '../../helpers/helpers'

module.exports = class Say {
    constructor() {
        this.name = 'say';
        this.alias = ['sayall'];
        this.usage = `${process.env.DISCORD_COMMAND_PREFIX}${this.name}`;
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
                return message.channel.send({ embeds: [this.buildEmbed(message, parameters, json)] });
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

            askMessage: while (true) {
                what = await Helpers.ask(message, "Global say", "Type message to all players");
                if (!what) {
                    if (await Helpers.askTryAgain(message)) {
                        continue askMessage;
                    }
                    return reject(console.error("Couldn't get the message"))
                }
                break;
            }

            const embed = new EmbedBuilder()
                .setTimestamp()
                .setColor('Yellow')
                .setAuthor({ name: 'Given Properties', iconURL: message.author.displayAvatarURL() })
                .addFields({ name: 'Given content', value: `**${what}**`, inline: false });

            const msg = await message.channel.send({ embeds: [embed] });

            const confirmEmbed = new EmbedBuilder()
                .setTimestamp()
                .setColor('Yellow')
                .setAuthor({ name: 'Are you sure you want to say it to all as admin?', iconURL: message.author.displayAvatarURL() });

            if (await Helpers.confirm(message, confirmEmbed)) {
                await msg.delete().catch(err => console.error('Failed to delete message:', err));
                return resolve({
                    what: what,
                });
            } else {
                await msg.delete().catch(err => console.error('Failed to delete message:', err));
                return reject(console.error("say interrupted!"));
            }
        })
    }


    buildEmbed(message, parameters, response) {
        const embed = new EmbedBuilder()
            .setTimestamp()
            .setColor(response.status === "OK" ? 'Green' : 'Red')
            .setAuthor({ name: 'Say all', iconURL: message.author.displayAvatarURL() })
            .addFields(
                { name: 'Issuer', value: message.author.username, inline: true },
                { name: 'Content', value: `**${parameters.what}**`, inline: true },
                { name: 'Status', value: response.status, inline: true }
            );

        if (response.status === "FAILED") {
            embed.addFields(
                { name: 'Reason for failing', value: response.error.name, inline: true }
            );
        }

        embed.addFields(
            { name: 'Server', value: response.server, inline: false }
        );

        return embed;
    }
}
