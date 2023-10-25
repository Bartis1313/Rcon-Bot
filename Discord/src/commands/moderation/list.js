var config = require("config")
const fetch = require("node-fetch");
const Discord = require('discord.js');
import Helpers from '../../helpers/helpers';
import format from '../../format'
import getVer from '../../helpers/ver';
import getMapObj from '../../helpers/mapsObj'

// all of this code could be done better, to split functions to other files
// same goes to retry in the functions for server information, could be done way better

module.exports = class list {
    constructor() {
        this.name = 'list';
        this.alias = ['listplayers'];
        this.usage = `${process.env.DISCORD_COMMAND_PREFIX || config.commandPrefix}${this.name}`;
        this.clearMessages = [];
        this.maplistRaw = [];
        this.maplistArr = [];
        this.messagesToDelete = [];
    }

    async getCount(server) {
        return fetch(`${server}/count`, {
            method: "post",
            headers: {
                "Content-type": "application/json",
                "Accept": "application/json",
                "Accept-Charset": "utf-8"
            }
        })
            .then(response => response.json())
            .then(json => {
                const long = json.data.players.length
                return long;
            })
            .catch(error => {

            })
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
    async getMap(server) {
        const maps = getMapObj(getVer(server));

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
                return maps[json.data[4]]
            })
            .catch(error => {

            })
    }

    async getMode(server) {
        const modes = {
            ConquestLarge0: 'Conquest Large',
            ConquestSmall0: 'Conquest Small',
            Domination0: 'Domination',
            Elimination0: 'Defuse',
            Obliteration: 'Obliteration',
            RushLarge0: 'Rush',
            SquadDeathMatch0: 'Squad Deathmatch',
            TeamDeathMatch0: 'Team Deathmatch',
            SquadObliteration0: 'Squad Obliteration',
            GunMaster0: 'Gun Master',
        };

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
                return modes[json.data[3]]
            })
            .catch(error => {

            })
    }

    async getIndex(server) {
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
        const maps = getMapObj(getVer(server));

        let arr = []
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
                const len = json.data.length;
                for (let i = 2; i < len; i += 3) {
                    arr.push(maps[json.data[i]]);
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

    async modeName(server) {
        let mode = await this.getMode(server);
        return mode;
    }

    async mapName(server) {
        let map = await this.getMap(server);
        return map;
    }

    async getNext(server) {
        try {
            let maps = await this.getMapArray(server)
            //console.log(maps);
            let index = await this.getIndex(server);
            //console.log(index);
            return maps[index];
        }
        catch (err) {
            console.log('error ', err);
        }
    }

    async run(bot, message, args) {
        if (!(message.member.roles.cache.has(process.env.DISCORD_RCON_ROLEID || config.rconRoleId))) {
            message.reply("You don't have permission to use this command.")
            return
        }
        await message.delete()
        let server = await Helpers.selectServer(message)
        if (!server) {
            message.reply("Unknown error");
            message.delete({ timeout: 5000 });
            this.clearMessages();
            return;
        }

        try {
            let embed = new Discord.MessageEmbed()
                .setTitle(`There are ${await this.getCount(server)}/64 players\nMap: ${await this.mapName(server)} Mode: ${await this.modeName(server)}\nNext Map: ${await this.getNext(server)}`)
                .setTimestamp()
                .setColor('GREEN')
                .setFooter('Author: Bartis')
                .setDescription(`Scores    K   D    Names\`\`\`c\n${await this.update(server)}\n\n${await this.update2(server)}\`\`\``)
            message.channel.send(embed)
                .then(msg => {
                    setInterval(async () => {
                        let embedNew = new Discord.MessageEmbed()
                            .setTitle(`There are ${await this.getCount(server)}/64 players\nMap: ${await this.mapName(server)} Mode: ${await this.modeName(server)}\nNext Map: ${await this.getNext(server)}`)
                            .setTimestamp()
                            .setColor('GREEN')
                            .setFooter('Author: Bartis')
                            .setDescription(`Scores    K   D    Names\`\`\`c\n${await this.update(server)}\n\n${await this.update2(server)}\`\`\``)
                        msg.edit(embedNew)
                    }, 5000)
                })
        } catch (error) {
            console.log("ERROR", error)
        }
    }
    clearMessages() {
        for (const message of this.messagesToDelete) {
            message.delete();
        }
    }
}
