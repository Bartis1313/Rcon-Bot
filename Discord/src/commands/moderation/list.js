const fetch = require("node-fetch");
const { EmbedBuilder } = require('discord.js');
import { Helpers } from '../../helpers/helpers'
import fTime from '../../helpers/timeFormat.js'

module.exports = class List {
    constructor() {
        this.name = 'list';
        this.alias = ['listplayers'];
        this.usage = `${process.env.DISCORD_COMMAND_PREFIX}${this.name}`;

        this.scoreboardMessage = {};
        this.scoreboardChannelId = {};
        this.intervalIds = {};
    }

    async getTeams(server) {
        try {
            const response1 = fetch(`${server}/team`, {
                method: "POST",
                headers: {
                    "Content-type": "application/json",
                    "Accept": "application/json",
                    "Accept-Charset": "utf-8"
                },
                body: JSON.stringify({ id: 1 })
            });

            const response2 = fetch(`${server}/team`, {
                method: "POST",
                headers: {
                    "Content-type": "application/json",
                    "Accept": "application/json",
                    "Accept-Charset": "utf-8"
                },
                body: JSON.stringify({ id: 2 })
            });

            const [data1, data2] = await Promise.all([response1, response2]);

            const json1 = await data1.json();
            const json2 = await data2.json();

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
        return fetch(`${server}/getInfo`, {
            method: "post",
            headers: {
                "Content-type": "application/json",
                "Accept": "application/json",
                "Accept-Charset": "utf-8"
            },
        })
            .then(response => response.json())
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
        return fetch(`${server}/getIndices`, {
            method: "post",
            headers: {
                "Content-type": "application/json",
                "Accept": "application/json",
                "Accept-Charset": "utf-8"
            }
        })
            .then(response => response.json())
            .then(json => {
                return { currentIdx: json.data[0], nextIdx: json.data[1] };
            })
            .catch(error => {
                return null;
            })
    }

    async getMapArray(server) {
        return fetch(`${server}/listOfMaps`, {
            method: "post",
            headers: {
                "Content-type": "application/json",
                "Accept": "application/json",
                "Accept-Charset": "utf-8"
            },
            body: JSON.stringify({
                pretty: true
            })
        })
            .then(response => response.json())
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


    async createInfoEmbed(server) {
        const embed = new EmbedBuilder();

        const mapArray = await this.getMapArray(server);
        const players = await this.getTeams(server);
        const indexMap = await this.getIndices(server);
        const currentInfo = await this.getInfo(server);

        const currentMapMode = mapArray[indexMap.currentIdx];
        const nextMapMode = mapArray[indexMap.nextIdx];

        const team1 = players.team_1;
        const team2 = players.team_2;

        const playerDataTeam1 = team1.map(player => [player.score, player.kills, player.deaths, player.name]);
        const playerDataTeam2 = team2.map(player => [player.score, player.kills, player.deaths, player.name]);

        const formattedScoreboard = this.format(playerDataTeam1, playerDataTeam2);
        if (formattedScoreboard.length > 4096) {
            formattedScoreboard = formattedScoreboard.substring(0, 4090) + '...';
        }

        embed.setTitle('Current Map and Round Info')
            .addFields(
                { name: 'Players', value: `${currentInfo.Players} / ${currentInfo.MaxPlayers}`, inline: false },
                { name: 'Current Map', value: `${currentMapMode[0]} - ${currentMapMode[1]}`, inline: true },
                { name: 'Next Map', value: `${nextMapMode[0]} - ${nextMapMode[1]}`, inline: true },
                { name: 'Tickets', value: `${Math.round(currentInfo.Scores.Team1)} : ${Math.round(currentInfo.Scores.Team2)}`, inline: true },
                { name: 'Round Time', value: `${fTime(currentInfo.RoundUpTime)}`, inline: true }
            )
            .setDescription(`**Scoreboard**\n` +
                `**Kills (K)** | **Deaths (D)** | **Player Names**\n` +
                `\`\`\`c\n${formattedScoreboard}\`\`\``)
            .setColor(0x00FF00)
            .setTimestamp();

        return embed;
    }

    async sendEmbedWithInterval(bot, message, server) {
        try {
            if (this.intervalIds[server]) {
                clearInterval(this.intervalIds[server]);
            }

            let embed = await this.createInfoEmbed(server);
            const msg = await message.channel.send({ embeds: [embed] });

            this.scoreboardMessage[server] = msg.id;
            this.scoreboardChannelId[server] = message.channel.id;

            const channel = bot.channels.cache.get(this.scoreboardChannelId[server]);

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
            }, 10000); // Update every 10 seconds

        } catch (error) {
            console.error("Error sending initial message:", error);
        }
    }

    async run(bot, message, args) {
        if (!(message.member.roles.cache.has(process.env.DISCORD_RCON_ROLEID))) {
            message.reply("You don't have permission to use this command.")
            return
        }

        let server = await Helpers.selectServer(message)
        if (!server) {
            message.delete({ timeout: 5000 });
            return;
        }

        await message.delete()

        this.sendEmbedWithInterval(bot, message, server);
    }
}