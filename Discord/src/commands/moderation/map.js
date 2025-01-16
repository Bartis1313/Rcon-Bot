const fetch = require("node-fetch");
const { EmbedBuilder } = require("discord.js");
import { Helpers } from '../../helpers/helpers'

module.exports = class map {
    constructor() {
        this.name = 'map';
        this.alias = ['mapindex'];
        this.usage = `${process.env.DISCORD_COMMAND_PREFIX}${this.name}`;
    }

    async run(bot, message, args) {
        if (!(message.member.roles.cache.has(process.env.DISCORD_RCON_ROLEID))) {
            message.reply("You don't have permission to use this command.")
            return
        }

        let server = await Helpers.selectServer(message)
        this.serverUrl = server;
        if (!server) {
            message.delete().catch(console.error);
            return;
        }

        message.delete().catch(console.error);

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
            body: JSON.stringify(parameters.indexNum)
        })
            .then(response => response.json())
            .then(json => {
                return message.channel.send({ embeds: [this.buildEmbed(message, parameters, json)] })
            })
            .catch(error => {
                console.log(error)
                return false
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
                return json.data.maps;
            })
            .catch(error => {
                console.error("Error fetching map array:", error);
                return [];
            })
    }

    generateDesc(mapObj) {
        let readyString = `\`\`\`c\n`;

        mapObj.forEach((mapData, index) => {
            const map = mapData[0];    // Map name
            const mode = mapData[1];   // Mode
            const rounds = mapData[2]; // Rounds

            readyString += `[${index}] Map: "${map}" Mode: "${mode}" (${rounds})\n`;
        });

        readyString += `\`\`\``;

        return readyString;
    }

    getParameters(message, server) {
        return new Promise(async (resolve, reject) => {
            let indexNum;
            await this.getVer(server); // Ensure version is fetched
            const mapObj = await this.getMapArray(server);
            const desc = this.generateDesc(mapObj);

            const embed = new EmbedBuilder()
                .setTimestamp()
                .setColor('Green')
                .setDescription(desc);

            const msg = await message.channel.send({ embeds: [embed] });

            askIndex: while (true) {
                indexNum = await Helpers.askIndex(message);
                if (!indexNum || isNaN(indexNum)) {
                    if (await Helpers.askTryAgain(message)) {
                        continue askIndex;
                    }
                    return reject(console.error("Couldn't get the index number"));
                }
                break;
            }

            msg.delete().catch(err => console.log('Message already deleted or does not exist.'));

            const confirmEmbed = new EmbedBuilder()
                .setTimestamp()
                .setColor('Yellow')
                .setAuthor({
                    name: 'Are you sure to set this map as next?',
                    iconURL: message.author.displayAvatarURL(),
                })
                .addFields(
                    { name: 'Given index', value: `**${indexNum}**`, inline: false },
                    { name: 'Which is', value: `**${mapObj[indexNum]}**`, inline: false }
                );

            if (await Helpers.confirm(message, confirmEmbed)) {
                return resolve({
                    indexNum: indexNum,
                    selected: mapObj[indexNum],
                });
            } else {
                return reject(console.error("Map selection interrupted!"));
            }
        });
    }

    async getVer(server) {
        return fetch(`${server}/version`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json",
                "Accept-Charset": "utf-8",
            },
        })
            .then(response => response.json())
            .then(json => {
                this.version = json.data[0];
                return json.data[0];
            })
            .catch(error => {
                console.error("Error fetching map array:", error);
                return null;
            });
    }

    buildEmbed(message, parameters, response) {
        const urlPrefix = this.version === 'BF4'
            ? 'http://eaassets-a.akamaihd.net/bl-cdn/cdnprefix/production-5780-20210129/public/base/bf4/map_images/335x160/'
            : 'https://cdn.battlelog.com/bl-cdn/cdnprefix/3422397/public/base/bf3/map_images/146x79/';

        const img = urlPrefix + parameters.selected[0].toLowerCase() + '.jpg';
        const embed = new EmbedBuilder()
            .setTimestamp()
            .setColor(response.status === "OK" ? 'Green' : 'Red')
            .setFooter({
                text: 'Author: Bartis',
                iconURL: img,
            })
            .setAuthor({
                name: 'Next map:',
                iconURL: message.author.displayAvatarURL(),
            })
            .addFields(
                { name: 'Issuer', value: message.author.username, inline: true },
                { name: 'Status', value: response.status, inline: true },
                { name: 'Next map will be:', value: `${parameters.selected[0]}`, inline: false }
            )
            .setImage(img);

        if (response.status === "FAILED") {
            embed.addFields({ name: 'Reason for failing', value: response.error, inline: true });
        }
        embed.addFields({ name: 'Server', value: response.server, inline: false });

        return embed;
    }
}