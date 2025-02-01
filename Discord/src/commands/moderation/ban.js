const { EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');
import { Helpers } from '../../helpers/helpers'

module.exports = class BanCommand {
    constructor() {
        this.name = 'ban';
        this.alias = ['banplayer'];
        this.usage = `${process.env.DISCORD_COMMAND_PREFIX}${this.name}`;
    }

    async run(bot, message, args) {
        if (!message.member.roles.cache.has(process.env.DISCORD_RCON_ROLEID)) {
            await message.reply("You don't have permission to use this command.");
            return;
        }

        let server = await Helpers.selectServer(message);
        if (!server) {
            await message.delete({ timeout: 5000 });
            return;
        }

        await message.delete().catch(() => { });

        let parameters = await this.getParameters(message, server)
            .then(parameters => parameters)
            .catch(err => {
                console.error(err);
                return null;
            });

        if (!parameters) {
            return;
        }

        return fetch(`${server}/admin/ban`, {
            method: "POST",
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
                console.error(error);
                return false;
            });
    }

    async getParameters(message) {
        return new Promise(async (resolve, reject) => {
            let banType;
            let banId;
            let timeout;
            let banReason;

            // Ask for the ban type
            askBanType: while (true) {
                banType = await Helpers.askByArray(message, ["name", "ip", "guid"], "Type of ban");
                if (!banType) {
                    if (await Helpers.askTryAgain(message)) {
                        continue askBanType;
                    }
                    return reject(console.error("Couldn't get the ban type"));
                }
                break;
            }

            // Ask for the player name, IP, or GUID
            askPlayerName: while (true) {
                banId = await Helpers.ask(message, "Give name / IP / GUID", "Type it correctly, it's NOT matched");
                if (!banId) {
                    if (await Helpers.askTryAgain(message)) {
                        continue askPlayerName;
                    }
                    return reject(console.error("Couldn't get the banId"));
                }
                break;
            }

            // Ask for the ban timeout
            askTimeout: while (true) {
                timeout = await Helpers.askByArray(message, ["perm", "seconds", "rounds"], "Choose ban time");
                if (!timeout) {
                    if (await Helpers.askTryAgain(message)) {
                        continue askTimeout;
                    }
                    return reject(console.error("Couldn't get the ban type"));
                }
                break;
            }

            // Validate and parse the timeout
            if (timeout === "seconds") {
                askSeconds: while (true) {
                    const timeInput = await Helpers.ask(message, "Timeout", "Specify amount of time (e.g., 2m, 1h, 1w)");
                    if (!timeInput) {
                        if (await Helpers.askTryAgain(message)) {
                            continue askSeconds;
                        }
                        return reject(console.error("Couldn't get ban duration in seconds"));
                    }

                    const parsedSeconds = this.parseTimeout(timeInput);
                    if (parsedSeconds === null) {
                        await message.reply("Invalid time format. Use examples like `2m`, `1h`, or `1w`.");
                        continue askSeconds;
                    }

                    timeout = `seconds ${parsedSeconds}`;
                    break;
                }
            } else if (timeout === "rounds") {
                askRounds: while (true) {
                    const roundsInput = await Helpers.ask(message, "Timeout", "Specify amount of rounds for ban");
                    if (!roundsInput || isNaN(roundsInput)) {
                        if (await Helpers.askTryAgain(message)) {
                            continue askRounds;
                        }
                        return reject(console.error("Couldn't get ban duration in rounds"));
                    }

                    timeout = `rounds ${roundsInput}`;
                    break;
                }
            }

            // Ask for the ban reason
            askReason: while (true) {
                banReason = await Helpers.ask(message, "Give reason of ban", "The reason will be why the player got banned");
                if (!banReason) {
                    if (await Helpers.askTryAgain(message)) {
                        continue askReason;
                    }
                    return reject(console.error("Couldn't get the reason"));
                }
                break;
            }

            const confirmEmbed = new EmbedBuilder()
                .setTimestamp()
                .setColor("00FF00")
                .setAuthor({ name: 'Are you sure you want to ban the player?', iconURL: message.author.avatarURL() })
                .addFields(
                    { name: 'Given banType', value: `**${banType}**`, inline: false },
                    { name: 'Given playername', value: `**${banId}**`, inline: false },
                    { name: 'Given timeout', value: `**${timeout}**`, inline: false },
                    { name: 'Given reason', value: `**${banReason}**`, inline: false }
                );

            if (await Helpers.confirm(message, confirmEmbed)) {
                return resolve({
                    banType: banType,
                    banId: banId,
                    timeout: timeout,
                    banReason: banReason,
                });
            } else {
                return reject(console.error("Ban interrupted!"));
            }
        });
    }

    parseTimeout(timeInput) {
        const timeUnits = {
            s: 1,          // seconds
            m: 60,         // minutes
            h: 3600,       // hours
            d: 86400,      // days
            w: 604800,     // weeks
        };

        const regex = /^(\d+)([smhdw])$/;
        const match = timeInput.match(regex);

        if (!match) {
            return null; // Invalid format
        }

        const value = parseInt(match[1], 10);
        const unit = match[2];

        return value * timeUnits[unit];
    }

    buildEmbed(message, parameters, response) {
        const embed = new EmbedBuilder()
            .setTimestamp()
            .setColor(response.status === "OK" ? "00FF00" : "FF0000")
            .setThumbnail('https://img.pngio.com/ban-banhammer-censor-censorship-hammer-ip-block-moderator-icon-banhammer-png-512_512.png')
            .setFooter({ text: 'Author: Bartis', iconURL: 'https://img.pngio.com/ban-banhammer-censor-censorship-hammer-ip-block-moderator-icon-banhammer-png-512_512.png' })
            .setAuthor({ name: 'Ban', iconURL: message.author.avatarURL() })
            .addFields(
                { name: 'Issuer', value: message.author.username, inline: true },
                { name: 'Target', value: `**${response?.data?.banId}**`, inline: true },
                { name: 'Type', value: response?.data?.banType, inline: true }
            );

        switch (response?.data?.banTimeoutType) {
            case "perm":
                embed.addFields({ name: 'Duration', value: '**Permanent**', inline: true });
                break;
            case "rounds":
                embed.addFields({ name: 'Duration', value: `**${response?.data?.banTimeout}** rounds`, inline: true });
                break;
            case "seconds":
                embed.addFields({ name: 'Duration', value: `**${response?.data?.banTimeout}** seconds`, inline: true });
                break;
            default:
                embed.addFields({ name: 'Duration', value: `unknown`, inline: true });
                break;
        }

        embed.addFields(
            { name: 'Reason', value: response?.data?.banReason, inline: true },
            { name: 'Server', value: response?.server, inline: false }
        );

        return embed;
    }
};