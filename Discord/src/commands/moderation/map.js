const fetch = require("node-fetch");
const Discord = require('discord.js');
import Helpers from '../../helpers/helpers'
import getVer from '../../helpers/ver';
import getMapObj from '../../helpers/mapsObj'

module.exports = class map {
    constructor() {
        this.name = 'map';
        this.alias = ['mapindex'];
        this.usage = `${process.env.DISCORD_COMMAND_PREFIX}${this.name}`;
        this.messagesToDelete = [];
        this.lenMap;
        this.serverUrl;
        this.maplistArr = [];
        this.maplistRaw = [];
        this.embedDesc;
        this.indexNumber;
    }


    async run(bot, message, args) {
        if (!(message.member.roles.cache.has(process.env.DISCORD_RCON_ROLEID))) {
            message.reply("You don't have permission to use this command.")
            return
        }
        await message.delete()

        let server = await Helpers.selectServer(message)
        this.serverUrl = server;
        if (!server) {
            message.reply("Unknown error");
            message.delete({ timeout: 5000 });
            this.clearMessages();
            return;
        }

        let parameters = await this.getParameters(message, server)
            .then(parameters => {
                this.clearMessages();
                return parameters;
            })
            .catch(err => {
                console.log(err);
                this.clearMessages();
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
                //console.log(json)
                return message.channel.send({ embed: this.buildEmbed(message, parameters, json) })
            })
            .catch(error => {
                console.log(error)
                return false
            })
    }

    getMapArray() {
        const maps = getMapObj(getVer(this.serverUrl));

        let arr = []
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
                const len = json.data.length;
                for (let i = 2; i < len; i += 3) {
                    arr.push(json.data[i]);
                    this.maplistRaw.push(json.data[i])
                    this.maplistArr.push(maps[json.data[i]])
                }
                //console.log(arr)
                this.lenMap = arr.length;
                return arr;
            })
            .catch(error => {
                console.error(error)
                return false
            })
    }

    clearMessages() {
        for (const message of this.messagesToDelete) {
            message.delete();
        }
    }

    generateDesc() {
        const len = this.lenMap
        let ready_str = `\`\`\`c\n`;
        const content = this.maplistArr;
        for (let i = 0; i < len; i++) {
            ready_str += `Number: ${i} Name: "${content[i]}"` + '\n';
        }
        ready_str += `\`\`\``
        this.embedDesc = ready_str;
        //console.log(ready_str)
        return ready_str;
    }

    getParameters(message) {
        return new Promise(async (resolve, reject) => {
            let indexNum;
            this.indexNumber = indexNum;
            await this.getMapArray()
            this.generateDesc()

            this.generateDesc()

            const embed = new Discord.MessageEmbed()
                .setTimestamp()
                .setColor("00FF00")
                .setDescription(this.embedDesc)

            const msg = await message.channel.send(embed)

            askIndex: while (true) {
                indexNum = await Helpers.askIndex(message);
                if (!indexNum || isNaN(indexNum)) {
                    if (await Helpers.askTryAgain(message)) {
                        continue askIndex;
                    }
                    return reject(Error("Couldn't the index number"))
                }
                break;
            }

            msg.delete()

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
                return reject(Error("Map interrupted!"))
            }
        })
    }

    buildEmbed(message, parameters, response) {
        const valid = this.maplistArr
        const img = 'http://eaassets-a.akamaihd.net/bl-cdn/cdnprefix/production-5780-20210129/public/base/bf4/map_images/335x160/' + this.maplistRaw[parameters.indexNum].toLowerCase() + '.jpg'
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