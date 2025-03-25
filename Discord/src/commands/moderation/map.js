const { EmbedBuilder, SlashCommandBuilder, MessageFlags } = require("discord.js");
import { Helpers, DiscordLimits } from '../../helpers/helpers'
import Matching from '../../helpers/matching'
import Fetch from '../../helpers/fetch';

module.exports = class map {
    constructor() {
        this.name = 'map';
        this.description = 'Sets next map';
    }

    async init() {
        const servers = await Helpers.getServerChoices();

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
                option.setName('map')
                    .setDescription('Select map')
                    .setRequired(true)
                    .setAutocomplete(true)
            )
    }

    async handleAutocomplete(interaction) {
        const focused = interaction.options.getFocused();
        const server = interaction.options.getString("server");

        const mapObj = await this.getMapArray(server);

        const names = [];
        const fullNames = [];
        mapObj.forEach((mapData, index) => {
            const map = mapData[0];    // Map name
            const mode = mapData[1];   // Mode
            const rounds = mapData[2]; // Rounds

            names.push(map);
            fullNames.push({ map, mode, rounds, index });
        });

        const matchedCommand = Matching.getBestMatch(focused, names, DiscordLimits.maxChoices);
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
            filteredCommands = fullNames.filter(entry => entry.map === matchedCommand.name);
        }
        else if (type === "multi") {
            filteredCommands = fullNames.filter(entry => matchedCommand.names.includes(entry.map));
        }

        await interaction.respond(
            filteredCommands.map(({ map, mode, rounds, index }) => ({
                name: `${map} - ${mode} [${rounds} rounds]`,
                value: `${index}`
            }))
        );
    }

    async runSlash(interaction) {
        if (!await Helpers.checkRoles(interaction, this))
            return;

        await interaction.deferReply();

        const server = interaction.options.getString("server");
        // little confusion, but this way it's user-friendly
        const index = Number(interaction.options.getString("map"));

        const mapObj = await this.getMapArray(server);
        const mapObjRaw = await this.getMapArrayRaw(server);

        const version = await this.getVer(server);

        const parameters = {
            indexNum: index,
            selected: mapObj[index],
            selectedRaw: mapObjRaw[index],
            version: version
        };

        return Fetch.post(`${server}/setMapIndex`, { indexNum: parameters.indexNum })
            .then(json => {
                return interaction.editReply({ embeds: [this.buildEmbed(interaction, parameters, json)] })
            })
            .catch(error => {
                console.error(error)
                return false
            })
    }

    async getMapArrayRaw(server) {
        return Fetch.get(`${server}/listOfMaps`, {
            pretty: false
        })
            .then(json => {
                return json.data.maps;
            })
            .catch(error => {
                console.error("Error fetching map array:", error);
                return [];
            })
    }

    async getMapArray(server) {
        return Fetch.get(`${server}/listOfMaps`, {
            pretty: true
        })
            .then(json => {
                return json.data.maps;
            })
            .catch(error => {
                console.error("Error fetching map array:", error);
                return [];
            })
    }

    async getVer(server) {
        return Fetch.get(`${server}/version`)
            .then(json => {
                return json.data[0];
            })
            .catch(error => {
                console.error("Error fetching map array:", error);
                return null;
            });
    }

    buildEmbed(messageOrInteraction, parameters, response) {
        const user = Helpers.isCommand(messageOrInteraction) ? messageOrInteraction.user : messageOrInteraction.author;
        const urlPrefix = parameters.version === 'BF4'
            ? 'https://cdn.battlelog.com/bl-cdn/cdnprefix/3422397/public/base/bf4/map_images/195x79/'
            : 'https://cdn.battlelog.com/bl-cdn/cdnprefix/3422397/public/base/bf3/map_images/146x79/';

        const selectedMap = parameters.selected[0] + " | " + parameters.selected[1];
        const img = urlPrefix + parameters.selectedRaw[0].toLowerCase() + '.jpg';

        const embed = new EmbedBuilder()
            .setTimestamp()
            .setColor(response.status === "OK" ? 'Green' : 'Red')
            .setFooter({ text: 'Author: Bartis', iconURL: img })
            .setAuthor({
                name: 'Next map:',
                iconURL: user.displayAvatarURL(),
            })
            .addFields(
                { name: 'Issuer', value: user.username, inline: true },
                { name: 'Status', value: response.status, inline: true },
                { name: 'Next map will be:', value: selectedMap || 'Unknown', inline: false }
            )
            .setImage(img)
        if (response.status === "FAILED") {
            embed.addFields({ name: 'Reason for failing', value: response.error.name, inline: true });
        }
        embed.addFields({ name: 'Server', value: response.server, inline: false });

        return embed;
    }
}