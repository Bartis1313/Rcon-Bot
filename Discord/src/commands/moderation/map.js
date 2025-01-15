const fetch = require("node-fetch");
const Discord = require('discord.js');
import { Helpers } from '../../helpers/helpers'
import getVer from '../../helpers/ver.js';
import { getMapObj, getModesObj } from '../../helpers/mapsObj.js'

// TODO
module.exports = class map {
    constructor() {
        this.name = 'map';
        this.alias = ['mapindex'];
        this.usage = `${process.env.DISCORD_COMMAND_PREFIX}${this.name}`;
        this.maplistArr = [];
        this.modelistArr = [];
        this.maplistRaw = [];
        this.lenMap;
        this.serverUrl;
    }


    async run(bot, message, args) {
        if (!(message.member.roles.cache.has(process.env.DISCORD_RCON_ROLEID))) {
            message.reply("You don't have permission to use this command.")
            return
        }       

        let server = await Helpers.selectServer(message)
        this.serverUrl = server;
        if (!server) {
            message.delete({ timeout: 5000 });
            return;
        }

        message.delete()

        let parameters = await this.getParameters(message, server)
            .then(parameters => {
                return parameters;
            })
            .catch(err => {
                console.log(err);
                return null;
            })

        if (!parameters) {
            return
        }

        return fetch(`${server}/setMapIndex`, {
            method: "post",
            headers: {
                "Content-type": "application/json",
                "Accept": "application/json",
                "Accept-Charset": "utf-8"
            },
            body: JSON.stringify(parameters)
        })
            .then(response => response.json())
            .then(json => {
                return message.channel.send({ embed: this.buildEmbed(message, parameters, json) })
            })
            .catch(error => {
                console.log(error)
                return false
            })
    }

    getMapArray() {
        const maps = getMapObj(getVer(this.serverUrl));
        const modes = getModesObj(getVer(this.serverUrl));
        this.maplistArr = [];
        this.modelistArr = [];
        this.maplistRaw = [];

        return fetch(`${this.serverUrl}/listOfMaps`, {
            method: "post",
            headers: {
                "Content-type": "application/json",
                "Accept": "application/json",
                "Accept-Charset": "utf-8"
            },
        })
            .then(response => response.json())
            .then(json => {
                const array = json.data;

                for (let i = 2; i < array.length; i += 3) {
                    const mapCode = array[i];
                    const mapMode = array[i + 1];

                    this.maplistRaw.push(mapCode);
                    this.maplistArr.push(maps[mapCode]);
                    this.modelistArr.push(modes[mapMode]);
                }

                this.lenMap = this.maplistRaw.length;
                return true;
            })
            .catch(error => {
                console.error(error)
                return false
            })
    }

    generateDesc() {
        const len = this.lenMap
        let ready_str = `\`\`\`c\n`;
        const mapname = this.maplistArr;
        const modename = this.modelistArr;

        for (let i = 0; i < len; i++) {
            ready_str += `Number: ${i} Name: "${mapname[i]}" Mode "${modename[i]}"` + '\n';
        }

        ready_str += `\`\`\``
        return ready_str;
    }

    getParameters(message) {
        return new Promise(async (resolve, reject) => {
            let indexNum;
            await this.getMapArray()
            const desc = this.generateDesc()

            const embed = new Discord.MessageEmbed()
                .setTimestamp()
                .setColor("00FF00")
                .setDescription(desc)

            const msg = await message.channel.send(embed)

            askIndex: while (true) {
                indexNum = await Helpers.askIndex(message);
                if (!indexNum || isNaN(indexNum)) {
                    if (await Helpers.askTryAgain(message)) {
                        continue askIndex;
                    }
                    return reject(console.error("Couldn't get the index number"))
                }
                break;
            }

            msg.delete().catch(err => console.log('Message already deleted or does not exist.'));

            const content = this.maplistArr;
            const confirmEmbed = new Discord.MessageEmbed()
                .setTimestamp()
                .setColor("00FF00")
                .setAuthor('Are you sure to set this map as next?', message.author.avatarURL());

            confirmEmbed.addField('Given index', `**${indexNum}**`, false);
            confirmEmbed.addField('Which is', `**${content[indexNum]}**`, false);

            if (await Helpers.confirm(message, confirmEmbed)) {
                return resolve({
                    indexNum: indexNum
                });
            }
            else {
                return reject(console.error("Map interrupted!"))
            }
        })
    }

    buildEmbed(message, parameters, response) {
        const valid = this.maplistArr;
        const urlPrefix = getVer(this.serverUrl) === 'BF4' 
        ? 'http://eaassets-a.akamaihd.net/bl-cdn/cdnprefix/production-5780-20210129/public/base/bf4/map_images/335x160/'
        : 'https://cdn.battlelog.com/bl-cdn/cdnprefix/3422397/public/base/bf3/map_images/146x79/'

        const img = urlPrefix + this.maplistRaw[parameters.indexNum].toLowerCase() + '.jpg'
        const embed = new Discord.MessageEmbed()
            .setTimestamp()
            .setColor(response.status === "OK" ? "00FF00" : "FF0000")
            .setFooter('Author: Bartis', img)
            .setAuthor('Next map: ', message.author.avatarURL())
            .addField('Issuer', message.author.username, true)
            .addField('Status', response.status, true)
            .addField('Next map will be: ', `${valid[parameters.indexNum]}`)
            .setImage(img)
        if (response.status === "FAILED") {
            embed.addField('Reason for failing', response.error, true)
        }
        embed.addField('Server', response.server, false)

        return embed
    }
}