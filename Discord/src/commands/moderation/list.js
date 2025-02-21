const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
import { Helpers, DiscordLimits } from '../../helpers/helpers'
import Fetch from '../../helpers/fetch.js';
import fs from 'fs'
import path from 'path'

const fsPromises = fs.promises;

const configDir = path.join(__dirname, "../../configList");
const configPath = path.join(configDir, 'config.json');

const ensureConfigDirectory = async () => {
    try {
        await fsPromises.mkdir(configDir, { recursive: true });
    } catch (error) {
        console.error("Error creating config directory:", error);
    }
}

const loadConfig = async () => {
    await ensureConfigDirectory();

    if (!fs.existsSync(configPath)) {
        const defaultConfig = { servers: {} };
        try {
            await fsPromises.writeFile(configPath, JSON.stringify(defaultConfig, null, 2), 'utf8');
        } catch (error) {
            console.error("Error creating initial config file:", error);
            return { servers: {} };
        }
    }

    try {
        const rawData = await fsPromises.readFile(configPath, 'utf8');
        const parsedData = JSON.parse(rawData);

        if (!parsedData || typeof parsedData !== 'object') {
            console.error("Error: Parsed config is not an object!", parsedData);
            return { servers: {} };
        }

        return parsedData;
    } catch (error) {
        console.error("Error loading config.json:", error);
        return { servers: {} };
    }
}

const saveConfig = async (config) => {
    await ensureConfigDirectory();
    try {
        await fsPromises.writeFile(configPath, JSON.stringify(config, null, 2), 'utf8');
    } catch (error) {
        console.error("Error saving config:", error);
    }
}
const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    let formattedDuration = '';

    if (hours > 0) {
        formattedDuration += hours.toString().padStart(2, '0') + ':';
    }

    formattedDuration += minutes.toString().padStart(2, '0') + ':' + remainingSeconds.toString().padStart(2, '0');

    return formattedDuration;
}

module.exports = class List {
    constructor() {
        this.name = 'list';
        this.description = 'Sends formatted embed message of players from the server'

        this.scoreboardMessage = {};
        this.scoreboardChannelId = {};
        this.intervalIds = {};
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
    }

    async getTeams(server) {
        try {
            const response1 = Fetch.get(`${server}/team`, { id: 1 });
            const response2 = Fetch.get(`${server}/team`, { id: 2 });

            const [data1, data2] = await Promise.all([response1, response2]);

            const json1 = data1;
            const json2 = data2;

            let retData = {};

            const processTeamData = (jsonData) => {
                let array = [];
                for (let i = 0; i < jsonData.data.players.length; i++) {
                    const score = jsonData.data.players[i].score;
                    const kills = jsonData.data.players[i].kills;
                    const deaths = jsonData.data.players[i].deaths;
                    const name = jsonData.data.players[i].name;
                    array.push({ score, kills, deaths, name });
                }
                return array;
            }

            retData.team_1 = processTeamData(json1);
            retData.team_2 = processTeamData(json2);

            return retData;

        } catch (error) {
            console.error("Error fetching team data:", error);
        }
    }

    formatInfo(data) {
        return {
            ServerName: data[0],
            Players: data[1],
            MaxPlayers: data[2],
            ModeName: data[3],
            MapName: data[4],
            RoundsPlayed: data[5],
            RoundsTotal: data[6],
            Scores: { Team1: data[8], Team2: data[9] },
            ServerUpTime: data[15],
            RoundUpTime: data[16]
        }
    }

    async getInfo(server) {
        return Fetch.get(`${server}/getInfo`)
            .then(json => {
                if (json.status !== "OK") {
                    return null;
                }
                return this.formatInfo(json.data);
            })
            .catch(error => {
                return null;
            })
    }

    async getIndices(server) {
        return Fetch.get(`${server}/getIndices`)
            .then(json => {
                return { currentIdx: json.data[0], nextIdx: json.data[1] };
            })
            .catch(error => {
                return null;
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
                return json.data.maps.map(map => map.slice(0, 2));
            })
            .catch(error => {
                console.error("Error fetching map array:", error);
                return [];
            })
    }

    format(team1, team2) {
        const formatTeam = (inputArray) => {
            if (inputArray.length === 0) return "Empty";

            let arr = inputArray
                .map(([score, stat1, stat2, name]) => {
                    if (isNaN(score) || isNaN(stat1) || isNaN(stat2) || !name) return null;
                    return [parseInt(score, 10), parseInt(stat1, 10), parseInt(stat2, 10), name];
                })
                .filter(Boolean);

            arr.sort((a, b) => b[0] - a[0]);

            const maxLengths = arr.reduce(
                (max, w) => {
                    max[0] = Math.max(max[0], String(w[0]).length);
                    max[1] = Math.max(max[1], String(w[1]).length);
                    max[2] = Math.max(max[2], String(w[2]).length);
                    return max;
                },
                [0, 0, 0] // example
            );

            return arr
                .map(w => `${String(w[0]).padEnd(maxLengths[0] + 1, " ")}${String(w[1]).padEnd(maxLengths[1] + 1, " ")}${String(w[2]).padEnd(maxLengths[2] + 1, " ")}"${w[3]}"\n`)
                .join("");
        };

        return `\n${formatTeam(team1)}\n\n\n${formatTeam(team2)}`;
    };

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

    async createInfoEmbed(server) {
        const embed = new EmbedBuilder();

        const mapArray = await this.getMapArray(server);
        const players = await this.getTeams(server);
        const indexMap = await this.getIndices(server);
        const currentInfo = await this.getInfo(server);
        const version = await this.getVer(server);
        const rawMapsArray = await this.getMapArrayRaw(server);
        const rawMaps = rawMapsArray[indexMap.currentIdx];

        const urlPrefix = version === 'BF4'
            ? 'https://cdn.battlelog.com/bl-cdn/cdnprefix/3422397/public/base/bf4/map_images/195x79/'
            : 'https://cdn.battlelog.com/bl-cdn/cdnprefix/3422397/public/base/bf3/map_images/146x79/';

        const img = urlPrefix + rawMaps[0].toLowerCase() + '.jpg';

        const currentMapMode = mapArray[indexMap.currentIdx];
        const nextMapMode = mapArray[indexMap.nextIdx];

        const team1 = players.team_1;
        const team2 = players.team_2;

        const playerDataTeam1 = team1.map(player => [player.score, player.kills, player.deaths, player.name]);
        const playerDataTeam2 = team2.map(player => [player.score, player.kills, player.deaths, player.name]);

        const formattedScoreboard = Helpers.truncateString(this.format(playerDataTeam1, playerDataTeam2), DiscordLimits.maxDescriptionLength);

        embed.setTitle('Current Map and Round Info')
            .addFields(
                { name: 'Players', value: `${currentInfo.Players} / ${currentInfo.MaxPlayers}`, inline: false },
                { name: 'Current Map', value: `${currentMapMode[0]} - ${currentMapMode[1]}`, inline: true },
                { name: 'Next Map', value: `${nextMapMode[0]} - ${nextMapMode[1]}`, inline: true },
                { name: '\u200b', value: '\u200b', inline: true },
                { name: 'Tickets', value: `${Math.round(currentInfo.Scores.Team1)} : ${Math.round(currentInfo.Scores.Team2)}`, inline: true },
                { name: 'Round Time', value: `${formatDuration(currentInfo.RoundUpTime)}`, inline: true },
                { name: '\u200b', value: '\u200b', inline: true },
            )
            .setDescription(`**Scoreboard**\n` +
                `**Score** | **Kills (K)** | **Deaths (D)** | **Player Names**\n` +
                `\`\`\`c\n${formattedScoreboard}\`\`\``)
            .setColor('Green')
            .setImage(img)
            .setTimestamp();

        return embed;
    }

    async sendEmbedWithInterval(messageOrInteraction, server) {
        try {
            const config = await loadConfig();

            if (Helpers.isCommand(messageOrInteraction)) {
                await messageOrInteraction.deferReply();
            }

            if (this.intervalIds[server]) {
                clearInterval(this.intervalIds[server]);
            }

            let embed = await this.createInfoEmbed(server);
            const msg = Helpers.isCommand(messageOrInteraction)
                ? await messageOrInteraction.editReply({ embeds: [embed] })
                : await message.channel.send({ embeds: [embed] });

            this.scoreboardMessage[server] = msg.id;
            this.scoreboardChannelId[server] = messageOrInteraction.channel.id;

            config.servers[server] = {
                messageId: msg.id,
                channelId: messageOrInteraction.channel.id
            };

            await saveConfig(config);

            const channel = messageOrInteraction.channel;

            this.intervalIds[server] = setInterval(async () => {
                try {
                    const fetchedMsg = await channel.messages.fetch(this.scoreboardMessage[server]);
                    if (!fetchedMsg) {
                        console.log("Message not found, stopping interval.");
                        clearInterval(this.intervalIds[server]);
                        return;
                    }

                    embed = await this.createInfoEmbed(server);
                    await fetchedMsg.edit({ embeds: [embed] });

                } catch (error) {
                    console.error("Error updating embed:", error);
                }
            }, 30000); // Update every 30 seconds

        } catch (error) {
            console.error(`Error resuming interval for server ${server}:`, error);
        }
    }

    async onReady(client) {
        const config = await loadConfig();

        if (!config.servers || typeof config.servers !== 'object') {
            console.warn("skipping config list, as it's pobably not set");
            await saveConfig({ servers: {} });
            return;
        }

        for (const [server, data] of Object.entries(config.servers)) {
            try {
                const channel = await client.channels.fetch(data.channelId);
                if (!channel) {
                    console.warn(`Channel ${data.channelId} not found for server ${server}`);
                    continue;
                }

                const message = await channel.messages.fetch(data.messageId);
                if (!message) {
                    console.warn(`Message ${data.messageId} not found for server ${server}`);
                    continue;
                }

                this.scoreboardMessage[server] = message.id;
                this.scoreboardChannelId[server] = channel.id;

                this.intervalIds[server] = setInterval(async () => {
                    try {
                        const fetchedMsg = await channel.messages.fetch(this.scoreboardMessage[server]);
                        if (!fetchedMsg) {
                            console.log("Message not found, stopping interval.");
                            clearInterval(this.intervalIds[server]);
                            return;
                        }

                        const embed = await this.createInfoEmbed(server);
                        await fetchedMsg.edit({ embeds: [embed] });
                    } catch (error) {
                        console.error("Error updating embed:", error);
                    }
                }, 30000);

                console.log(`${server} updating cached interval started...`);
            } catch (error) {
                console.error(`Error resuming interval for server ${server}:`, error);
            }
        }
    }

    async runSlash(interaction) {
        if (!Helpers.checkRoles(interaction, this))
            return;

        const server = interaction.options.getString("server");

        this.sendEmbedWithInterval(interaction, server);
    }
}