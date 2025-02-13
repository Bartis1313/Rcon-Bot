const { EmbedBuilder, SlashCommandBuilder, MessageFlags } = require('discord.js');
import { Helpers } from '../../helpers/helpers'
import Fetch from '../../helpers/fetch';

module.exports = class BanCommand {
    constructor() {
        this.name = 'ban';
        this.description = 'Ban a player from the server.';
    }

    async init() {
        const servers = await Helpers.getServerChoices();

        this.slashCommand = new SlashCommandBuilder()
            .setName(this.name)
            .setDescription('Ban a player from the server.')
            .addSubcommand(subcommand =>
                subcommand
                    .setName('permanent')
                    .setDescription('Permanently ban a player')
                    .addStringOption(option =>
                        option.setName('server')
                            .setDescription("Select the server")
                            .setRequired(true)
                            .addChoices(...servers)
                    )
                    .addStringOption(option =>
                        option.setName('type')
                            .setDescription('The type of ban (name, ip, or guid)')
                            .setRequired(true)
                            .addChoices(
                                { name: 'Name', value: 'name' },
                                { name: 'IP', value: 'ip' },
                                { name: 'GUID', value: 'guid' }
                            )
                    )
                    .addStringOption(option =>
                        option.setName('id')
                            .setDescription('The player name, IP, or GUID to ban')
                            .setRequired(true)
                    )
                    .addStringOption(option =>
                        option.setName('reason')
                            .setDescription('The reason for the ban')
                            .setRequired(false)
                    )
            )
            .addSubcommand(subcommand =>
                subcommand
                    .setName('temporary')
                    .setDescription('Temporarily ban a player for a specific duration')
                    .addStringOption(option =>
                        option.setName("server")
                            .setDescription("Select the server")
                            .setRequired(true)
                            .addChoices(...servers)
                    )
                    .addStringOption(option =>
                        option.setName('type')
                            .setDescription('The type of ban (name, ip, or guid)')
                            .setRequired(true)
                            .addChoices(
                                { name: 'Name', value: 'name' },
                                { name: 'IP', value: 'ip' },
                                { name: 'GUID', value: 'guid' }
                            )
                    )
                    .addStringOption(option =>
                        option.setName('id')
                            .setDescription('The player name, IP, or GUID to ban')
                            .setRequired(true)
                    )
                    .addStringOption(option =>
                        option.setName('duration')
                            .setDescription('The ban duration (e.g., 2m, 1h, 1w)')
                            .setRequired(true)
                    )
                    .addStringOption(option =>
                        option.setName('reason')
                            .setDescription('The reason for the ban')
                            .setRequired(false)
                    )
            )
            .addSubcommand(subcommand =>
                subcommand
                    .setName('rounds')
                    .setDescription('Ban a player for a specific number of rounds')
                    .addStringOption(option =>
                        option.setName("server")
                            .setDescription("Select the server")
                            .setRequired(true)
                            .addChoices(...servers)
                    )
                    .addStringOption(option =>
                        option.setName('type')
                            .setDescription('The type of ban (name, ip, or guid)')
                            .setRequired(true)
                            .addChoices(
                                { name: 'Name', value: 'name' },
                                { name: 'IP', value: 'ip' },
                                { name: 'GUID', value: 'guid' }
                            )
                    )
                    .addStringOption(option =>
                        option.setName('id')
                            .setDescription('The player name, IP, or GUID to ban')
                            .setRequired(true)
                    )
                    .addIntegerOption(option =>
                        option.setName('rounds')
                            .setDescription('The number of rounds to ban the player')
                            .setRequired(true)
                    )
                    .addStringOption(option =>
                        option.setName('reason')
                            .setDescription('The reason for the ban')
                            .setRequired(false)
                    )
            );
    }

    async runSlash(interaction) {
        if (!interaction.member.roles.cache.has(process.env.DISCORD_RCON_ROLEID)) {
            await interaction.reply({ content: "You don't have permission to use this command.", flags: MessageFlags.Ephemeral });
            return;
        }

        await interaction.deferReply();

        const server = interaction.options.getString("server");
        const subcommand = interaction.options.getSubcommand();
        const banType = interaction.options.getString('type');
        const banId = interaction.options.getString('id');
        const banReason = interaction.options.getString('reason') || 'No reason provided';

        let timeout;

        switch (subcommand) {
            case 'permanent':
                timeout = 'perm';
                break;

            case 'temporary':
                const duration = interaction.options.getString('duration');
                const parsedSeconds = this.parseTimeout(duration);
                if (parsedSeconds === null) {
                    await interaction.editReply("Invalid time format. Use `2m`, `1h`, `1w`.");
                    return;
                }
                timeout = `seconds ${parsedSeconds}`;
                break;

            case 'rounds':
                const rounds = interaction.options.getInteger('rounds');
                if (isNaN(rounds) || rounds <= 0) {
                    await interaction.editReply("Invalid number of rounds.");
                    return;
                }
                timeout = `rounds ${rounds}`;
                break;
        }

        const parameters = {
            banType: banType,
            banId: banId,
            timeout: timeout,
            banReason: banReason,
        };

        return Fetch.post(`${server}/admin/ban`, parameters)
            .then(json => {
                return interaction.editReply({ embeds: [this.buildEmbed(interaction, parameters, json)] });
            })
            .catch(error => {
                console.error(error);
                return false;
            });
    }

    async run(bot, message, args) {
        if (!Helpers.checkRoles(message, this))
            return;

        const server = await Helpers.selectServer(message);
        if (!server) {
            await message.delete();
            return;
        }

        await message.delete();

        const parameters = await this.getParameters(message, server)
            .then(parameters => parameters)
            .catch(err => {
                console.error(err);
                return null;
            });

        if (!parameters) {
            return;
        }

        return Fetch.post(`${server}/admin/ban`, parameters)
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
                .setAuthor({ name: 'Are you sure you want to ban the player?', iconURL: message.user.avatarURL() })
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
            return null;
        }

        const value = parseInt(match[1], 10);
        const unit = match[2];

        return value * timeUnits[unit];
    }

    buildEmbed(messageOrInteraction, parameters, response) {
        const user = Helpers.isCommand(messageOrInteraction) ? messageOrInteraction.user : messageOrInteraction.author;
        const embed = new EmbedBuilder()
            .setTimestamp()
            .setColor(response.status === "OK" ? "00FF00" : "FF0000")
            .setThumbnail('https://img.pngio.com/ban-banhammer-censor-censorship-hammer-ip-block-moderator-icon-banhammer-png-512_512.png')
            .setFooter({ text: 'Author: Bartis', iconURL: 'https://img.pngio.com/ban-banhammer-censor-censorship-hammer-ip-block-moderator-icon-banhammer-png-512_512.png' })
            .setAuthor({ name: 'Ban', iconURL: user.displayAvatarURL() })
            .addFields(
                { name: 'Issuer', value: user.username, inline: true },
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