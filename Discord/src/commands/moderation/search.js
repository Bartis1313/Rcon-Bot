import { commandPrefix, rconRoleId } from "config";
const fetch = require("node-fetch");
const Discord = require("discord.js");

module.exports =  class search {
    constructor() {
        this.name = 'search',
            this.alias = ['searchsoldier'],
            this.usage = `${process.env.DISCORD_COMMAND_PREFIX || commandPrefix}${this.name}`
    }

    async run(bot, message, args) {
        args = message.content.split(" ").slice(1);
        const sitesource = args.join(" ");
        let jsonBL = ('https://battlelog.battlefield.com/bf4/user/' + sitesource + '/')
        let google = ('https://www.google.com/search?q=' + sitesource)
        let bf4cr = ('https://bf4cheatreport.com/?pid=&uid=' + sitesource + '&cnt=200&startdate=')
        message.delete();
        return fetch(jsonBL, {
            method: "post",
            headers: {
                "X-AjaxNavigation": 1,
                "X-Requested-With": "XMLHttpRequest"
            },
        })
            .then(response => response.json())
            .then(json => {
                let persona;
                for (let profilePersona of json.context.profilePersonas) {
                    if (profilePersona.namespace === 'cem_ea_id') {
                        persona = profilePersona.personaId;
                        break;
                    }
                }
                const gravatar = json.context.profileCommon.user.gravatarMd5
                const result = [gravatar, persona]
                return result;
            }).then(function ([gravatar, persona]) {
                const jsonBL2 = ('https://battlelog.battlefield.com/bf4/warsawdetailedstatspopulate/' + persona + '/1/')
                return fetch(jsonBL2, {
                    method: "post",
                    headers: {
                        "X-Requested-With": "XMLHttpRequest"
                    },
                })
                    .then(response => response.json())
                    .then(json => {
                        let gravatar2 = 'https://secure.gravatar.com/avatar/' + gravatar + 's=220' // had to do this bad way instead of if(!something...) gravatar seems to be buggy
                        if (gravatar2 === 'https://secure.gravatar.com/avatar/nulls=220') {
                            gravatar2 = 'http://eaassets-a.akamaihd.net/battlelog/defaultavatars/default-avatar-204.png'
                        }
                        let skill = json.data.generalStats.skill
                        let quits = Math.round(json.data.generalStats.quitPercentage * 100) / 100
                        let kd = json.data.generalStats.kdRatio
                        let accuracy = Math.round(json.data.generalStats.accuracy * 100) / 100
                        let rank = json.data.generalStats.rank
                        let time_played = Math.round((json.data.generalStats.timePlayed / 3600) * 100) / 100
                        let hs = (json.data.generalStats.headshots) * 100
                        let kills = json.data.generalStats.kills
                        let deaths = json.data.generalStats.deaths
                        let kpm = json.data.generalStats.killsPerMinute

                        const embed = new Discord.MessageEmbed()
                            .setTitle("Quick Player Search")
                            .setColor(Math.random().toString(16).slice(2, 8).toUpperCase())
                            .setAuthor("Profile: " + sitesource)
                            .setDescription("This is a simple searching tool for searching players")
                            .setThumbnail(gravatar2)
                            .addField("K/D: ", kd, true)
                            .addField("Kills: ", kills, true)
                            .addField("Deaths: ", deaths, true)
                            .addField("Accuracy: ", accuracy + ("%"), true)
                            .addField("Skill: ", skill, true)
                            .addField("Rank: ", rank, true)
                            .addField("General KPM: ", kpm)
                            .addField("Not reseted KD: ", (Math.round(kills / deaths * 100) / 100), true)
                            .addField("General HSK: ", (Math.round(hs / kills * 100) / 100) + " %", true)
                            .addField("Time in BF4: ", time_played + "h")
                            .addField("Quits : ", quits + " %")
                            .addField("BL:", jsonBL, true)
                            .addField("Google: ", google, true)
                            .addField("Bf4cr:", bf4cr, true)
                        message.channel.send({ embed });
                    })
                    .catch(error => message.channel.send(error));
            })
            .catch(err => message.channel.send(err));
    };
}