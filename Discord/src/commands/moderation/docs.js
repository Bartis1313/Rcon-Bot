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
            .addSubcommand(subcommand =>
                subcommand
                    .setName("commands")
                    .setDescription("Get information about commands")
                    .addStringOption(option =>
                        option.setName('command')
                            .setDescription('Command name to get documentation for')
                            .setRequired(true)
                            .setAutocomplete(true)
                    )
            )
            .addSubcommand(subcommand =>
                subcommand
                    .setName("types")
                    .setDescription("Get information about commands")
                    .addStringOption(option =>
                        option.setName('type')
                            .setDescription('Type info from documentation')
                            .setRequired(true)
                            .setAutocomplete(true)
                    )
            )
    }

    async init() {
        const docs = await this.fetchDocs();
        this.docs = docs;
        const commandNames = docs.commands.map(command => command.name);
        this.commandNames = commandNames;

        const types = await this.fetchTypes();
        this.types = types;
        const typeNames = types.types.map(t => t.name);
        this.typeNames = typeNames;
    }

    async handleAutocomplete(interaction) {
        const focusedValue = interaction.options.getFocused(true);
        const options = focusedValue.value === "commands" ? this.commandNames : this.typeNames;

        const matched = Matching.getBestMatch(focusedValue.value, options, DiscordLimits.maxChoices);
        if (!matched) {
            await interaction.respond([]);
            return;
        }

        const type = matched.type;
        if (type === "far") {
            await interaction.respond([]);
            return;
        }

        let filteredCommands = [];
        if (type === "good") {
            filteredCommands = [matched.name];
        }
        else if (type === "multi") {
            filteredCommands = matched.names;
        }

        await interaction.respond(
            filteredCommands.map(name => ({ name: name, value: name }))
        );
    }

    async runSlash(interaction) {
        if (!Helpers.checkRoles(interaction, this))
            return;

        await interaction.deferReply();

        const subcommand = interaction.options.getSubcommand();
        const interactionSub = subcommand === "commands"
            ? interaction.options.getString("command")
            : interaction.options.getString("type");
        const options = subcommand === "commands" ? this.docs.commands : this.types.types;
        const command = options.find(c => c.name === interactionSub);

        if (!command) {
            await interaction.editReply("Could not find the specified command.");
            return;
        }

        await interaction.editReply({ embeds: [this.buildEmbed(interaction, { name: interactionSub, command: command })] });
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

    async fetchTypes() {
        try {
            const response = await Fetch.get(`${Helpers.selectFirstServer()}/getTypes`)
            const json = response;
            return json.data;
        } catch (error) {
            console.error(error);
            return null;
        }
    }

    buildEmbed(messageOrInteraction, parameters) {
        const user = Helpers.isCommand(messageOrInteraction) ? messageOrInteraction.user : messageOrInteraction.author;
        const embed = new EmbedBuilder()
            .setTitle(`Info for ${parameters.name}`)
            .setColor('Aqua')
            .setAuthor({ name: 'Docs', iconURL: user.displayAvatarURL() })
            .setTimestamp();

        for (const [key, value] of Object.entries(parameters.command)) {
            if (Array.isArray(value)) {
                if (typeof value[0] === 'object') {
                    embed.addFields({
                        name: key.charAt(0).toUpperCase() + key.slice(1),
                        value: value.map(v => `**${v.value}**: ${v.description}`).join('\n'),
                        inline: false
                    });
                } else {
                    embed.addFields({
                        name: key.charAt(0).toUpperCase() + key.slice(1),
                        value: value.join('\n'),
                        inline: false
                    });
                }
            } else if (typeof value === 'object') {
                embed.addFields({
                    name: key.charAt(0).toUpperCase() + key.slice(1),
                    value: Object.entries(value).map(([k, v]) => `**${k}**: ${v}`).join('\n'),
                    inline: false
                });
            } else {
                embed.addFields({
                    name: key.charAt(0).toUpperCase() + key.slice(1),
                    value: value.toString(),
                    inline: false
                });
            }
        }


        return embed;
    }
};