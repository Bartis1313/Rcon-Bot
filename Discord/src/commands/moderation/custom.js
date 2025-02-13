const { EmbedBuilder, SlashCommandBuilder, MessageFlags } = require('discord.js');
import { Helpers, DiscordLimits } from '../../helpers/helpers'
import Matching from '../../helpers/matching';
import Fetch from '../../helpers/fetch';

module.exports = class CustomCommand {
    constructor() {
        this.name = 'custom';
        this.description = 'Custom command, execute anything';
    }

    async init() {
        const servers = await Helpers.getServerChoices();

        const docs = await this.fetchDocs();
        this.docs = docs;
        const commandNames = docs.commands.map(command => command.name);
        this.commandNames = commandNames;

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
                option.setName('command')
                    .setDescription('Type the command')
                    .setRequired(true)
                    .setAutocomplete(true)
            )
            .addStringOption(option =>
                option.setName('args')
                    .setDescription('Type arguments for the command')
                    .setRequired(false)
            )
    }

    async handleAutocomplete(interaction) {
        const focusedValue = interaction.options.getFocused();
        const commandNames = this.commandNames;

        const matchedCommand = Matching.getBestMatch(focusedValue, commandNames, DiscordLimits.maxChoices);
        if (!matchedCommand) {
            await interaction.respond([]);
            return;
        }

        const type = matchedCommand.type;
        if (type === "far") {
            await interaction.respond([]);
            return;
        }

        let filteredCommands = [];
        if (type === "good") {
            filteredCommands = [matchedCommand.name];
        }
        else if (type === "multi") {
            filteredCommands = matchedCommand.names;
        }

        // description: `Hint: ${this.docs.commands.find(c => c.name === name)?.request || 'No hint available'}`
        await interaction.respond(
            filteredCommands.map(name => ({
                name: name,
                value: name
            }))
        );
    }

    async runSlash(interaction) {
        if (!Helpers.checkRoles(interaction, this))
            return;

        await interaction.deferReply();

        const server = interaction.options.getString("server");
        const command = interaction.options.getString("command");
        const args = interaction.options.getString("args");

        const commandJSON = this.docs.commands.find(c => c.name === command);

        if (!commandJSON) {
            await interaction.editReply("Could not find the specified command.");
            return;
        }

        // trick params, since it's hard to validate all commands for params
        const parameters = {
            command: args && args.length ? command + ' ' + args : command,
            params: null,
        }

        return Fetch.get(`${server}/getCommands`)
            .then(json => {
                if (!json.data.includes(command)) {
                    interaction.editReply(`${command} does not exist as command.`);
                    return Promise.reject("Custom command failed");
                }
            })
            .then(() => {
                return Fetch.post(`${server}/custom`, parameters)
            })
            .then(json => {
                interaction.editReply({ embeds: [this.buildEmbed(interaction, parameters, json)] });
                return true;
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

        return Fetch.get(`${server}/getCommands`)
            .then(json => {
                if (!json.data.includes(command)) {
                    message.channel.send(`${command} does not exist as command.`);
                    return Promise.reject("Custom command failed");
                }
            })
            .then(() => {
                return Fetch.post(`${server}/custom`, parameters)
            })
            .then(json => {
                message.channel.send({ embeds: [this.buildEmbed(message, parameters, json)] });
                return true;
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

    async fetchDocs() {
        try {
            const response = await Fetch.get(`${Helpers.selectFirstServer()}/getDocs`);

            const json = response;
            return json.data;
        } catch (error) {
            console.error(error);
            return null;
        }
    }

    buildEmbed(messageOrInteraction, parameters, response) {
        const str = parameters.params && parameters.params.length ? `[${parameters.params.join(' ')}]` : "";
        const embed = new EmbedBuilder()
            .setTimestamp()
            .setColor(response.status === "OK" ? 'Green' : 'Red')
            .setAuthor({ name: 'Custom Command', iconURL: messageOrInteraction.user.displayAvatarURL() })
            .addFields(
                { name: 'Issuer', value: messageOrInteraction.user.username, inline: true },
                { name: 'Content', value: `**${parameters.command}** ${str}`, inline: true },
                { name: 'Status', value: response.status, inline: true }
            );

        if (response.status === "FAILED") {
            embed.addFields({ name: 'Reason for Failing', value: response.error, inline: true });
        }
        if (response.data) {
            embed.addFields({ name: 'Message', value: Array.isArray(response.data) ? response.data.join(", ") : response.data, inline: false });
        }
        embed.addFields({ name: 'Server', value: response.server, inline: false });

        return embed;
    }
};