const { EmbedBuilder, SlashCommandBuilder, MessageFlags } = require('discord.js');
import { Helpers, DiscordLimits } from '../../helpers/helpers'
import Matching from '../../helpers/matching'
import Fetch from '../../helpers/fetch';

module.exports = class Docs {
    constructor() {
        this.name = 'docs';
        this.description = 'Fetch command documentation';

        this.slashCommand = new SlashCommandBuilder()
            .setName(this.name)
            .setDescription(this.description)
            .addStringOption(option =>
                option.setName('command')
                    .setDescription('Command name to get documentation for')
                    .setRequired(true)
                    .setAutocomplete(true)
            );
    }

    async init() {
        const docs = await this.fetchDocs();
        this.docs = docs;
        const commandNames = docs.commands.map(command => command.name);
        this.commandNames = commandNames;
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

        await interaction.respond(
            filteredCommands.map(name => ({ name: name, value: name }))
        );
    }

    async runSlash(interaction) {
        if (!Helpers.checkRoles(interaction, this))
            return;

        await interaction.deferReply();

        const commandName = interaction.options.getString('command');
        const command = this.docs.commands.find(c => c.name === commandName);

        if (!command) {
            await interaction.editReply("Could not find the specified command.");
            return;
        }

        await interaction.editReply({ embeds: [this.buildEmbed(interaction, { name: commandName, command: command })] });
    }

    async run(client, message, args) {
        if (!Helpers.checkRoles(message, this))
            return;

        await message.delete();

        const docs = await this.fetchDocs();

        if (!docs) {
            await message.channel.send("Internal error, docs were empty");
            return;
        }

        const parameters = await this.getParameters(message, docs);

        if (!parameters) {
            return;
        }

        await message.channel.send({ embeds: [this.buildEmbed(message, parameters)] });
    }

    async fetchDocs() {
        try {
            const response = await Fetch.get(`${Helpers.selectFirstServer()}/getDocs`)
            const json = response;
            return json.data;
        } catch (error) {
            console.error(error);
            return null;
        }
    }

    async getParameters(messageOrInteraction, docs) {
        return new Promise(async (resolve, reject) => {
            let command;
            const commandNames = docs.commands.map(command => command.name);

            while (true) {
                const userInput = await Helpers.ask(messageOrInteraction, "Command", "Type part of command name to get information");
                if (!userInput) {
                    if (await Helpers.askTryAgain(messageOrInteraction)) continue;
                    return reject(new Error("Couldn't get command."));
                }

                const matchedCommand = Matching.getBestMatch(userInput, commandNames);
                if (!matchedCommand) {
                    if (await Helpers.askTryAgain(messageOrInteraction, "No matches")) continue;
                    return reject(new Error("Couldn't match any command"));
                }

                switch (matchedCommand.type) {
                    case "good":
                        command = docs.commands.find(c => c.name === matchedCommand.name);
                        break;
                    case "far":
                        const confirmEmbed = new EmbedBuilder()
                            .setTimestamp()
                            .setColor('Yellow')
                            .setAuthor({ name: 'Confirm', iconURL: messageOrInteraction.author.displayAvatarURL() })
                            .setDescription(`Did you mean ${matchedCommand.name}?`);

                        if (await Helpers.confirm(messageOrInteraction, confirmEmbed)) {
                            command = docs.commands.find(c => c.name === matchedCommand.name);
                            break;
                        }
                        if (await Helpers.askTryAgain(messageOrInteraction)) continue;
                        break;
                    case "multi":
                        const selectedCommand = await Helpers.selectFromEmoteList(messageOrInteraction, matchedCommand.names);

                        if (selectedCommand) {
                            command = docs.commands.find(c => c.name === selectedCommand);
                            break;
                        }
                        if (await Helpers.askTryAgain(messageOrInteraction, "Didn't match")) continue;
                        break;
                }

                break;
            }

            if (!command) {
                return reject(new Error("docs command empty"));
            }

            return resolve({
                name: command.name,
                command: command
            });
        });
    }

    buildEmbed(messageOrInteraction, parameters) {
        const embed = new EmbedBuilder()
            .setTitle(`Command Info for ${parameters.name}`)
            .setColor('Aqua')
            .setAuthor({ name: 'Docs', iconURL: messageOrInteraction.user.displayAvatarURL() })
            .setTimestamp();

        for (const [key, value] of Object.entries(parameters.command)) {
            if (Array.isArray(value)) {
                embed.addFields(
                    { name: key.charAt(0).toUpperCase() + key.slice(1), value: value.join('\n'), inline: false }
                );
            } else {
                embed.addFields(
                    { name: key.charAt(0).toUpperCase() + key.slice(1), value: value, inline: false }
                );
            }
        }

        return embed;
    }
};