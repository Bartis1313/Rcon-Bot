const fetch = require("node-fetch");
const { EmbedBuilder } = require('discord.js');
import { Helpers } from '../../helpers/helpers'

module.exports = class CustomCommand {
    constructor() {
        this.name = 'custom';
        this.alias = ['customcommand'];
        this.usage = `${process.env.DISCORD_COMMAND_PREFIX}${this.name}`;
        this.desc = 'Custom command, execute anything';
    }

    async run(bot, message, args) {
        if (!message.member.roles.cache.has(process.env.DISCORD_RCON_ROLEID)) {
            message.reply("You don't have permission to use this command.");
            return;
        }

        let server = await Helpers.selectServer(message);
        if (!server) {
            message.delete().catch(console.error);
            return;
        }

        message.delete().catch(console.error);

        let parameters = await this.getParameters(message, server)
            .then(parameters => parameters)
            .catch(err => {
                console.error(err);
                return null;
            });

        if (!parameters) {
            return;
        }

        return fetch(`${server}/custom`, {
            method: "post",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json",
                "Accept-Charset": "utf-8",
            },
            body: JSON.stringify(parameters),
        })
            .then(response => response.json())
            .then(json => {
                return message.channel.send({ embeds: [this.buildEmbed(message, parameters, json)] });
            })
            .catch(error => {
                console.error(error);
                return false;
            });
    }

    async getParameters(message, server) {
        return new Promise(async (resolve, reject) => {
            let custom;

            askCustom: while (true) {
                custom = await Helpers.ask(message, "Custom", "Provide custom command **SPACE = NEW ARG**");
                if (!custom) {
                    if (await Helpers.askTryAgain(message)) {
                        continue askCustom;
                    }
                    return reject(console.error("Couldn't get the message"));
                }
                break;
            }

            const confirmEmbed = new EmbedBuilder()
                .setTimestamp()
                .setColor('Yellow')
                .setAuthor({ name: 'Are you sure you want to execute this command?', iconURL: message.author.displayAvatarURL() })
                .addFields({ name: 'Given content', value: `**${custom}**`, inline: false });

            if (await Helpers.confirm(message, confirmEmbed)) {
                let command = '';
                let params = [];
                const split = custom.split(' ');
                if (split.length > 1) {
                    command = split[0];
                    params = split.slice(1);
                } else {
                    command = custom;
                }

                return resolve({
                    command: command,
                    params: params,
                });
            } else {
                return reject(console.error("Custom command interrupted!"));
            }
        });
    }

    buildEmbed(message, parameters, response) {
        const str = parameters.params.length ? `[${parameters.params.join(' ')}]` : "";
        const embed = new EmbedBuilder()
            .setTimestamp()
            .setColor(response.status === "OK" ? 'Green' : 'Red')
            .setAuthor({ name: 'Custom Command', iconURL: message.author.displayAvatarURL() })
            .addFields(
                { name: 'Issuer', value: message.author.username, inline: true },
                { name: 'Content', value: `**${parameters.command}** ${str}`, inline: true },
                { name: 'Status', value: response.status, inline: true }
            );

        if (response.status === "FAILED") {
            embed.addFields({ name: 'Reason for Failing', value: response.error.name, inline: true });
        }
        if (response.data) {
            embed.addFields({ name: 'Message', value: String(response.data), inline: false });
        }
        embed.addFields({ name: 'Server', value: response.server, inline: false });

        return embed;
    }
};