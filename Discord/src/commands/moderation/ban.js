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
        if (!await Helpers.checkRoles(interaction, this)) return;

        await interaction.deferReply();

        const server = interaction.options.getString("server");
        const subcommand = interaction.options.getSubcommand();
        const banType = interaction.options.getString('type');
        const banId = interaction.options.getString('id');
        const banReason = interaction.options.getString('reason');

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
            reason: banReason,
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
                { name: 'Target', value: `**${parameters.banId}**`, inline: true },
                { name: 'Timeout', value: parameters.timeout, inline: true }
            );

        if (response?.data?.reason) {
            embed.addFields({ name: 'Reason', value: response.data.reason, inline: true });
        }

        if (response.status === "FAILED") {
            embed.addFields({ name: 'Reason for failing', value: response.error, inline: true });
        }

        embed.addFields({ name: 'Server', value: response.server, inline: false });

        return embed;
    }
};