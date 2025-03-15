const { EmbedBuilder, SlashCommandBuilder, MessageFlags } = require('discord.js');
import { Helpers } from '../../helpers/helpers'
import Matching from '../../helpers/matching'
import Fetch from '../../helpers/fetch';

module.exports = class Ffss {
    constructor() {
        this.name = 'ffss';
        this.description = 'Get fairfight images for player';
        this.secret = process.env.FF_SERVER;
    }

    async init() {
        this.slashCommand = new SlashCommandBuilder()
            .setName(this.name)
            .setDescription(this.description)
            .addStringOption(option =>
                option.setName('name')
                    .setDescription('Select player name')
                    .setRequired(true)
                    .setAutocomplete(true)
            )
    }

    async handleAutocomplete(interaction) {
        let allFolders = [];
        await Fetch.get(`${this.secret}/api/folders`)
            .then(json => {
                allFolders = json.folders;
            })
            .catch(async (err) => {
                console.err(err);
                await interaction.respond([]);
                return;
            })

        const focusedOption = interaction.options.getFocused();
        const matchedPlayer = Matching.getBestMatch(focusedOption, allFolders);
        if (!matchedPlayer) {
            await interaction.respond([]);
            return;
        }

        const type = matchedPlayer.type;
        if (type === "far") {
            await interaction.respond([]);
            return;
        }

        let players = [];
        if (type === "good") {
            players = [matchedPlayer.name];
        }
        else if (type === "multi") {
            players = matchedPlayer.names;
        }

        await interaction.respond(
            players.map(name => ({ name: name, value: name }))
        );
    }

    async runSlash(interaction) {
        if (!Helpers.checkRoles(interaction, this)) return;

        await interaction.deferReply();

        const playerName = interaction.options.getString('name');

        if (!playerName) {
            await interaction.editReply("playerName can't be null");
            return;
        }

        let folderContent = [];

        try {
            const folderData = await Fetch.get(`${this.secret}/api/folder/${playerName}`);

            if (folderData.contents) {
                folderContent = folderData.contents
                    .filter(a => a.name.endsWith('.jpg'))
                    .sort((a, b) => b.name.localeCompare(a.name))
                    .map(img => img.path);
            }
        } catch (err) {
            console.error(err);
            await interaction.editReply("Error fetching folder content");
            return;
        }

        if (folderContent.length === 0) {
            await interaction.editReply("No images found");
            return;
        }

        const files = folderContent.map(filePath => ({ attachment: filePath })).slice(0, 10);

        await interaction.editReply({
            content: `Found ${folderContent.length} images for ${playerName} ${this.secret}/images/${playerName}`,
            files: files
        });
    }
};
