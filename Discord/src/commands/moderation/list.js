const fetch = require("node-fetch");
const Discord = require('discord.js');
import { Helpers } from '../../helpers/helpers'
import format from '../../helpers/format.js'
import getVer from '../../helpers/ver.js';
import { getMapObj, getModesObj } from '../../helpers/mapsObj.js'
import fTime from '../../helpers/timeFormat.js'

module.exports = class list {
    constructor() {
        this.name = 'list';
        this.alias = ['listplayers'];
        this.usage = `${process.env.DISCORD_COMMAND_PREFIX}${this.name}`;
        this.maplistRaw = [];
        this.maplistArr = [];

        this.scoreboardMessage = {};
        this.scoreboardChannelId = {};
        this.intervalIds = {};
        this.consecutiveErrors = {};
        this.maxConsecutiveErrors = 3;
    }

    async team1(server) {
        return fetch(`${server}/team_1`, {
            method: "post",
            headers: {
                "Content-type": "application/json",
                "Accept": "application/json",
                "Accept-Charset": "utf-8"
            }
        })
            .then(response => response.json())
            .then(json => {
                let array = [];
                const long = json.data.players.length;
                for (let i = 0; i < long; i++) {
                    const result = json.data.players[i].score;
                    const result2 = json.data.players[i].kills;
                    const result3 = json.data.players[i].deaths;
                    const result4 = json.data.players[i].name;
                    array.push(result, result2, result3, result4)
                }
                return array;
            })
            .catch(error => {

            })
    }
    async team2(server) {
        return fetch(`${server}/team_2`, {
            method: "post",
            headers: {
                "Content-type": "application/json",
                "Accept": "application/json",
                "Accept-Charset": "utf-8"
            }
        })
            .then(response => response.json())
            .then(json => {
                let array = [];
                const long = json.data.players.length;
                for (let i = 0; i < long; i++) {
                    const result = json.data.players[i].score;
                    const result2 = json.data.players[i].kills;
                    const result3 = json.data.players[i].deaths;
                    const result4 = json.data.players[i].name;
                    array.push(result, result2, result3, result4)
                }
                return array;
            })
            .catch(error => {

            })
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

    async getNextIndex(server) {
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
                const index = json.data[1];
                return index;
            })
            .catch(error => {

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
        })
            .then(response => response.json())
            .then(json => {
                let arr = [];
                const data = json.data;
                for (let i = 0; i < data.length; i++) {
                    if (!isNaN(data[i])) {
                        continue;
                    }

                    const mapName = getMapObj(getVer(server))[data[i]];
                    const modeName = getModesObj(getVer(server))[data[i + 1]];

                    arr.push({ mapName: mapName, modeName: modeName });
                    i++;
                }

                return arr;
            })
            .catch(error => {

            })
    }

    async update(server) {
        try {
            let players = await this.team1(server);
            if (players == 0) return 'Empty'
            else return format(players);
        } catch (err) {

        }
    }

    async update2(server) {
        try {
            let players = await this.team2(server);
            if (players == 0) return 'Empty'
            else return format(players);
        } catch (err) {

        }
    }

    async getNext(server) {
        try {
            const maps = await this.getMapArray(server);
            const index = await this.getNextIndex(server);

            return { mapName: maps[index].mapName, modeName: maps[index].modeName };
        }
        catch (err) {
            console.log('error ', err);
        }
    }

    async createInfoEmbed(info, server) {
        const map = getMapObj(getVer(server))[info.MapName];
        const mode = getModesObj(getVer(server))[info.ModeName];
        const tickets1 = parseFloat(info.Scores.Team1).toFixed(0);
        const tickets2 = parseFloat(info.Scores.Team2).toFixed(0);
        const maxPlayers = info.MaxPlayers;
        const rtime = fTime(info.RoundUpTime);
        const playerCount = info.Players;
        const next = await this.getNext(server);

        const embed = new Discord.MessageEmbed()
            .setTitle(`Players: ${playerCount}/${maxPlayers} Tickets ${tickets1}:${tickets2} Time: ${rtime}\nMap: ${map} Mode: ${mode}\nNext Map: ${next.mapName} Mode: ${next.modeName}`)
            .setTimestamp()
            .setColor('GREEN')
            .setFooter('Author: Bartis')
            .setDescription(`Scores\tK\tD\tNames\`\`\`c\n${await this.update(server)}\n\n${await this.update2(server)}\`\`\``);

        return embed;
    }

    async sendEmbedWithInterval(bot, message, server) {
        try {
            const info = await this.getInfo(server);
            if (info === null) {
                return;
            }

            this.intervalIds[server] = {}; // reset on retry

            const embed = await this.createInfoEmbed(info, server);

            const msg = await message.channel.send(embed);

            this.scoreboardMessage[server] = msg.id;
            this.scoreboardChannelId[server] = message.channel.id;

            const channel = bot.channels.cache.get(this.scoreboardChannelId[server]);

            if (this.intervalIds[server] !== null) {
                this.intervalIds[server] = setInterval(async () => {
                    try {
                        if (!channel.messages.cache.has(this.scoreboardMessage[server])) { // deleted msg
                            console.log("Message not found in cache. Stopped interval.");
                            clearInterval(this.intervalIds[server]);
                            this.intervalIds[server] = null;
                            return;
                        }

                        const newInfo = await this.getInfo(server);
                        if (newInfo === null) {
                            return;
                        }

                        const newEmbed = await this.createInfoEmbed(newInfo, server);

                        const fetchedMsg = await channel.messages.fetch(this.scoreboardMessage[server]);
                        await fetchedMsg.edit(newEmbed);

                        this.consecutiveErrors[server] = 0;
                    } catch (error) {
                        console.error("Error editing message:", error);
                        clearInterval(this.intervalIds[server]);
                        this.intervalIds[server] = null;
                    }
                    // 30 seconds, below api errors critical handling
                }, 30_000);
            }
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