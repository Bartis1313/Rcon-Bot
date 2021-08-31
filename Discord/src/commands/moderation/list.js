var config = require("config")
const fetch = require("node-fetch");
const Discord = require('discord.js');
import Helpers from '../../helpers/helpers';
import format from '../../format'

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
    }

    async run(bot, message, args) {
        if (!(message.member.roles.cache.has(process.env.DISCORD_RCON_ROLEID || config.rconRoleId) || message.member.roles.cache.has(process.env.DISCORD_RCON_ROLEID2 || config.rconRoleId2))) {
            message.reply("You don't have permission to use this command.")
            return
        }
        await message.delete()
        let server = await Helpers.selectServer(message)
        if (!server) {
            message.reply("Unknown error");
            message.delete({ timeout: 5000 });
            clearMessages();
            return;
        }

        function getCount() {
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

        function team1() {
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

        function team2() {
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

        function getMap() {
            const maps = {
                MP_Abandoned: 'Zavod 311',
                MP_Damage: 'Lancang Dam',
                MP_Flooded: 'Flood Zone',
                MP_Journey: 'Golmud Railway',
                MP_Naval: 'Paracel Storm',
                MP_Prison: 'Operation Locker',
                MP_Resort: 'Hainan Resort',
                MP_Siege: 'Siege of Shanghai',
                MP_TheDish: 'Rogue Transmission',
                MP_Tremors: 'Dawnbreaker',
                XP1_001: 'Silk Road',
                XP1_002: 'Altai Range',
                XP1_003: 'Guilin Peaks',
                XP1_004: 'Dragon Pass',
                XP0_Caspian: 'Caspian Border 2014',
                XP0_Firestorm: 'Operation Firestorm 2014',
                XP0_Metro: 'Operation Metro 2014',
                XP0_Oman: 'Gulf of Oman 2014',
                XP2_001: 'Lost Islands',
                XP2_002: 'Nansha Strike',
                XP2_003: 'Wavebreaker',
                XP2_004: 'Operation Mortar',
                XP3_MarketPl: 'Pearl Market',
                XP3_Prpganda: 'Propaganda',
                XP3_UrbanGdn: 'Lumpini Garden',
                XP3_WtrFront: 'Sunken Dragon',
                XP4_Arctic: 'Operation Whiteout',
                XP4_SubBase: 'Hammerhead',
                XP4_Titan: 'Hangar 21',
                XP4_WalkerFactory: 'Giants of Karelia',
                XP5_Night_01: 'Zavod: Graveyard Shift',
                XP6_CMP: 'Operation Outbreak',
                XP7_Valley: 'Dragon Valley 2015'
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
                    return maps[json.data[4]]
                })
                .catch(error => {
                    
                })
        }

        function getMode() {
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

        function getIndex() {
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

        function getMapArray() {
            const maps = {
                MP_Abandoned: 'Zavod 311',
                MP_Damage: 'Lancang Dam',
                MP_Flooded: 'Flood Zone',
                MP_Journey: 'Golmud Railway',
                MP_Naval: 'Paracel Storm',
                MP_Prison: 'Operation Locker',
                MP_Resort: 'Hainan Resort',
                MP_Siege: 'Siege of Shanghai',
                MP_TheDish: 'Rogue Transmission',
                MP_Tremors: 'Dawnbreaker',
                XP1_001: 'Silk Road',
                XP1_002: 'Altai Range',
                XP1_003: 'Guilin Peaks',
                XP1_004: 'Dragon Pass',
                XP0_Caspian: 'Caspian Border 2014',
                XP0_Firestorm: 'Operation Firestorm 2014',
                XP0_Metro: 'Operation Metro 2014',
                XP0_Oman: 'Gulf of Oman 2014',
                XP2_001: 'Lost Islands',
                XP2_002: 'Nansha Strike',
                XP2_003: 'Wavebreaker',
                XP2_004: 'Operation Mortar',
                XP3_MarketPl: 'Pearl Market',
                XP3_Prpganda: 'Propaganda',
                XP3_UrbanGdn: 'Lumpini Garden',
                XP3_WtrFront: 'Sunken Dragon',
                XP4_Arctic: 'Operation Whiteout',
                XP4_SubBase: 'Hammerhead',
                XP4_Titan: 'Hangar 21',
                XP4_WalkerFactory: 'Giants of Karelia',
                XP5_Night_01: 'Zavod: Graveyard Shift',
                XP6_CMP: 'Operation Outbreak',
                XP7_Valley: 'Dragon Valley 2015'
            };
    
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

        


        async function update() {
            try {
                let players = await team1();
                if (players == 0) return 'Empty'
                else return format(players);
                } catch(err) {
                    
                }
        }

        async function update2() {
            try {
            let players = await team2();
            if (players == 0) return 'Empty'
            else return format(players);
            } catch(err) {
                
            }
        }

        async function modeName() {
            let mode = await getMode();
            return mode;
        }

        async function mapName() {
            let map = await getMap();
            return map;
        }

        async function getNext() {
            try {
                let maps = await getMapArray()
                let index = await getIndex();
                return maps[index];
            }
            catch(err) {
                
            }
        }


        // TODO add some reading local urls method

        function getGoodUrl() {
            switch (server.toString()) {
                case "http://server1:3000":
                    return "https://battlelog.battlefield.com/bf4/servers/show/pc/f050ca6a-1538-445a-bbef-0db4f89d4c47/1-Freaky-Frikkers-l-Noobs-welcome/" 
                case "http://server2:3000":
                    return "https://battlelog.battlefield.com/bf4/servers/show/pc/f24f18ef-80aa-43f7-9e35-f2a6e232d421/1-NASA-Mixed-Modes-l-Votemap-l-Noobs-welcome/"
                case "http://server3:3000":
                        return "https://battlelog.battlefield.com/bf4/servers/show/pc/135a9ba4-51a2-4722-8066-462e24f44e34/2-NASA-Mixed-Modes-l-Votemap-l-Noobs-welcome/"       
                default:
                    return "https://battlelog.battlefield.com/bf4/servers/show/pc/f050ca6a-1538-445a-bbef-0db4f89d4c47/1-Freaky-Frikkers-l-Noobs-welcome/"
            }
        }

        async function Send() {
            let embed = new Discord.MessageEmbed()
                .setTitle(`There are ${await getCount()}/64 players\nMap: ${await mapName()} Mode: ${await modeName()}\nNext Map: ${await getNext()}`)
                .setTimestamp()
                .setColor('GREEN')
                .setFooter('Author: Bartis')
                .setDescription(`Scores    K   D    Names\`\`\`c\n${await update()}\n\n${await update2()}\`\`\``)
            message.channel.send(embed)
                .then(msg => {                    
                    setInterval(async () => {
                        let embedNew = new Discord.MessageEmbed()
                            .setTitle(`There are ${await getCount()}/64 players\nMap: ${await mapName()} Mode: ${await modeName()}\nNext Map: ${await getNext()}`)
                            .setTimestamp()
                            .setURL(getGoodUrl(server))
                            .setColor('GREEN')
                            .setFooter('Author: Bartis')
                            .setDescription(`Scores    K   D    Names\`\`\`c\n${await update()}\n\n${await update2()}\`\`\``)
                        msg.edit(embedNew)
                    }, 5000)
                })
                .catch(err => {
                    console.log("ERROR")
                })
        }
        try{
            Send()
        } catch(error) {
            console.log("ERROR")
        }
    }
    clearMessages() {
        for (const message of this.messagesToDelete) {
            message.delete();
        }
    }
}