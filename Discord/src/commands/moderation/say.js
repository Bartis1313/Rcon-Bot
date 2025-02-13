const { EmbedBuilder, SlashCommandBuilder, MessageFlags } = require('discord.js');
import { Helpers } from '../../helpers/helpers'
import Fetch from '../../helpers/fetch';

module.exports = class Say {
    constructor() {
        this.name = 'say';
        this.description = 'Say a message to server';
    }

    async init() {
        const servers = await Helpers.getServerChoices();

        // TODO: handle player say, team say, squad say
        // subcommand, or static choices
        this.slashCommand = new SlashCommandBuilder()
            .setName(this.name)
            .setDescription(this.description)
            .addStringOption(option =>
                option.setName('server')
                    .setDescription('Select the server')
                    .setRequired(true)
                    .addChoices(...servers)
            )
            .addStringOption(option =>
                option.setName('message')
                    .setDescription('Type what to say')
                    .setRequired(true)
            )
    }

    async runSlash(interaction) {
        if (!Helpers.checkRoles(interaction, this))
            return;

        await interaction.deferReply();

        const server = interaction.options.getString("server");
        const content = interaction.option.getString("message");

        const isWhitespaceString = str => !/\S/.test(str)
        if (isWhitespaceString(content)) {
            await interaction.editReply({ content: "It makes no sense to send whitespaces only", flags: MessageFlags.Ephemeral });
            return;
        }

        const parameters = {
            what: content
        };

        return Fetch.post(`${server}/admin/sayall`, parameters)
            .then(response => {
                return interaction.editReply({ embeds: [this.buildEmbed(interaction, parameters, response)] });
            })
            .catch(error => {
                console.log(error)
                return;
            })
    }

    async run(bot, message, args) {
        if (!Helpers.checkRoles(message, this))
            return;

        const server = await Helpers.selectServer(message)
        if (!server) {
            await message.delete();
            return;
        }

        await message.delete();

        const parameters = await this.getParameters(message, server)
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

        return Fetch.post(`${server}/admin/sayall`, parameters)
            .then(response => {
                return message.channel.send({ embeds: [this.buildEmbed(message, parameters, response)] });
            })
            .catch(error => {
                console.log(error)
                return;
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


    buildEmbed(messageOrInteraction, parameters, response) {
        const user = Helpers.isCommand(messageOrInteraction) ? messageOrInteraction.user : messageOrInteraction.author;
        const embed = new EmbedBuilder()
            .setTimestamp()
            .setColor(response.status === "OK" ? 'Green' : 'Red')
            .setAuthor({ name: 'Say all', iconURL: user.displayAvatarURL() })
            .addFields(
                { name: 'Issuer', value: user.username, inline: true },
                { name: 'Content', value: `**${parameters.what}**`, inline: true },
                { name: 'Status', value: response.status, inline: true }
            );

        if (response.status === "FAILED") {
            embed.addFields(
                { name: 'Reason for failing', value: response.error, inline: true }
            );
        }

        embed.addFields(
            { name: 'Server', value: response.server, inline: false }
        );

        return embed;
    }
}
