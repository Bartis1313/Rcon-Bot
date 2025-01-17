const fetch = require("node-fetch");
const { EmbedBuilder } = require('discord.js');
import { Helpers } from '../../helpers/helpers'

module.exports = class Vip {
    constructor() {
        this.name = 'vip';
        this.alias = ['reservedslots'];
        this.usage = `${process.env.DISCORD_COMMAND_PREFIX}`;
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

        return fetch(`${server}/reservedSlots`, {
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

    async getParameters(message) {
        return new Promise(async (resolve, reject) => {
            let soldierName;

            askPlayerName: while (true) {
                soldierName = await Helpers.askPlayerName(message);
                if (!soldierName) {
                    if (await Helpers.askTryAgain(message)) {
                        continue askPlayerName;
                    }

                    return reject(console.error("Couldn't get the soldierName"));
                }
                break;
            }

            const confirmEmbed = new EmbedBuilder()
                .setTimestamp()
                .setColor('Yellow')
                .setAuthor({
                    name: 'Are you sure you want to add VIP for this player?',
                    iconURL: message.author.displayAvatarURL(),
                })
                .addFields({ name: 'Given playerName', value: `**${soldierName}**`, inline: false });

            if (await Helpers.confirm(message, confirmEmbed)) {
                return resolve({
                    soldierName: soldierName,
                });
            } else {
                return reject(console.error("VIP command interrupted!"));
            }
        });
    }

    buildEmbed(message, parameters, response) {
        const embed = new EmbedBuilder()
            .setTimestamp()
            .setColor(response.status === "OK" ? 'Green' : 'Red')
            .setThumbnail('https://cdn.discordapp.com/attachments/608427147039866888/688012094972625024/fireworks.png')
            .setFooter({
                text: 'Author: Bartis',
                iconURL: 'https://cdn.discordapp.com/attachments/608427147039866888/688012094972625024/fireworks.png',
            })
            .setAuthor({
                name: 'Reserved Slot',
                iconURL: message.author.displayAvatarURL(),
            })
            .addFields(
                { name: 'Issuer', value: message.author.username, inline: true },
                { name: 'Target', value: `**${parameters.soldierName}**`, inline: true },
                { name: 'Status', value: response.status, inline: true }
            );

        if (response.status === "FAILED") {
            embed.addFields({ name: 'Reason for Failing', value: response.error.name, inline: true });
        }

        return embed;
    }
};