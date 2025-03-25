const { EmbedBuilder, SlashCommandBuilder, MessageFlags } = require('discord.js');
import { Helpers } from '../../helpers/helpers'
import Fetch from '../../helpers/fetch';
import Matching from '../../helpers/matching';

module.exports = class Say {
    constructor() {
        this.name = 'say';
        this.description = 'Say a message to server';
    }

    async init() {
        const servers = await Helpers.getServerChoices();

        // didn't add squad say, who uses it?
        this.slashCommand = new SlashCommandBuilder()
            .setName(this.name)
            .setDescription(this.description)
            .addSubcommand(subcommand =>
                subcommand
                    .setName('all')
                    .setDescription('say to all')
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
            )
            .addSubcommand(subcommand =>
                subcommand
                    .setName('player')
                    .setDescription('say to all')
                    .addStringOption(option =>
                        option.setName('server')
                            .setDescription('Select the server')
                            .setRequired(true)
                            .addChoices(...servers)
                    )
                    .addStringOption(option =>
                        option.setName('name')
                            .setDescription('Select player name')
                            .setRequired(true)
                            .setAutocomplete(true)
                    )
                    .addStringOption(option =>
                        option.setName('message')
                            .setDescription('Type what to say')
                            .setRequired(true)
                    )
            )
            .addSubcommand(subcommand =>
                subcommand
                    .setName('teamsay')
                    .setDescription('say to team')
                    .addStringOption(option =>
                        option.setName('server')
                            .setDescription('Select the server')
                            .setRequired(true)
                            .addChoices(...servers)
                    )
                    .addStringOption(option =>
                        option.setName('team')
                            .setDescription('Select team')
                            .setRequired(true)
                            .setAutocomplete(true)
                    )
                    .addStringOption(option =>
                        option.setName('message')
                            .setDescription('Type what to say')
                            .setRequired(true)
                    )
            )
    }

    async handleAutocomplete(interaction) {
        const focusedValue = interaction.options.getFocused(true);
        const server = interaction.options.getString("server");

        if (focusedValue.name == "name") {
            const response = await Helpers.getPlayers(server);
            const playerNames = response.data.players.map(player => player.name);

            const focusedOption = interaction.options.getFocused();
            const matchedPlayer = Matching.getBestMatch(focusedOption, playerNames);
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
        else if (focusedValue.name == "team") {
            const version = await this.getVer(server);

            const teams = [];
            if (version == "BF3") {
                teams.push({ id: 0, faction: "US (0)" });
                teams.push({ id: 1, faction: "RU (1)" });
            }
            else if (version == "BF4") {
                const parameters = {
                    command: "vars.teamFactionOverride",
                    params: [],
                }
                // assume we dont run sqdm...
                await Fetch.post(`${server}/custom`, parameters)
                    .then(async json => {
                        const response = await Helpers.getPlayers(server);
                        const players = response.data.players;

                        const scores = {};
                        players.forEach(player => {
                            if (player.teamId === '0')
                                return;

                            if (!scores[player.teamId]) {
                                scores[player.teamId] = [];
                            }
                            scores[player.teamId].push(player);
                        });

                        const topScorers = Object.fromEntries(
                            Object.keys(scores).map(teamId => [
                                teamId,
                                scores[teamId]
                                    .sort((a, b) => Number(b.score) - Number(a.score))
                                    .slice(0, Math.min(3, scores[teamId].length))
                                    .map(player => player.name)
                            ])
                        );

                        const factions =
                            version === 'BF4' ?
                                new Map([
                                    ['0', 'US'],
                                    ['1', 'RU'],
                                    ['2', 'CH']
                                ])
                                : new Map([
                                    ['0', 'US'],
                                    ['1', 'RU'],
                                ]);

                        teams.push({
                            id: '1',
                            faction: `[${factions.get(json.data[0])}] Top3 (${(topScorers["1"]?.join(', ') || 'No players')}...)`
                        });
                        teams.push({
                            id: '2',
                            faction: `[${factions.get(json.data[1])}] Top3 (${(topScorers["2"]?.join(', ') || 'No players')}...)`
                        });
                    })
                    .catch(async error => {
                        console.error(error);
                        await interaction.respond([]);
                        return;
                    });
            }

            const filtered = teams.filter(team => team.faction.toLowerCase().startsWith(focusedValue.value.toLowerCase()));

            await interaction.respond(
                filtered.map(team => ({ name: team.faction, value: team.id }))
            );
        }
    }

    async runSlash(interaction) {
        if (!await Helpers.checkRoles(interaction, this))
            return;

        await interaction.deferReply();

        const server = interaction.options.getString("server");
        const subcommand = interaction.options.getSubcommand();
        let sub;
        switch (subcommand) {
            case 'all':
                sub = "all"
                break;
            case 'player':
                sub = "player " + interaction.options.getString("name");
                break;
            case 'teamsay':
                sub = "team " + interaction.options.getString("team");
                break;
        }

        if (!sub) {
            await interaction.editReply("sub was null");
            return;
        }

        const content = interaction.options.getString("message");

        const isWhitespaceString = str => !/\S/.test(str)
        if (isWhitespaceString(content)) {
            await interaction.editReply({ content: "It makes no sense to send whitespaces only", flags: MessageFlags.Ephemeral });
            return;
        }

        const parameters = {
            what: content,
            sub: sub
        };

        return Fetch.post(`${server}/admin/say`, parameters)
            .then(response => {
                return interaction.editReply({ embeds: [this.buildEmbed(interaction, parameters, response)] });
            })
            .catch(error => {
                console.log(error)
                return;
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
        const embed = new EmbedBuilder()
            .setTimestamp()
            .setColor(response.status === "OK" ? 'Green' : 'Red')
            .setAuthor({ name: 'Say all', iconURL: user.displayAvatarURL() })
            .addFields(
                { name: 'Issuer', value: user.username, inline: true },
                { name: 'Content', value: `**${parameters.what}**`, inline: true },
                { name: 'Subset', value: parameters.sub, inline: true },
                { name: 'Status', value: response.status, inline: false }
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
