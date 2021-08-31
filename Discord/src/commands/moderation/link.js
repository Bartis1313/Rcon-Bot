import config from "config";
import Discord from 'discord.js';
import { createConnection } from 'mysql';
import geoip from 'geoip-country';

module.exports = class link {
    constructor() {
        this.name = 'link',
            this.alias = ['linksoldier'],
            this.usage = '?link'
            this.usage = `${process.env.DISCORD_COMMAND_PREFIX || config.commandPrefix}${this.name}`
            this.pass = "";
            this.address = ""
            this.db = ""
            this.login = ""
    }

    async run(bot, message, args) {
        if (!(message.member.roles.cache.has(process.env.DISCORD_RCON_ROLEID || config.rconRoleId))) {
            message.reply("You don't have permission to use this command.")
            message.delete()
            return
        }
        message.channel.send(`Command used by: ${message.author.username} *!link*`)
        message.delete()
        args = args.slice(1);
        var plid = args.join(" ");

        var addrs = this.address
        var con = createConnection({
            multipleStatements: true,
            host: addrs,
            user: this.login,
            password: this.pass,
            database: this.db
        });
        (async () => {
            con.connect();
            const answear = await getInfo(plid);
            if (typeof (answear) == "string") {
                const ipis = await checkIP(plid);
                const newip = ipis.split(".").slice(0, 3);
                var cutip = newip.join(".");
                con.query("SELECT PlayerID, SoldierName, IP_Address FROM tbl_playerdata WHERE IP_Address LIKE '%" + cutip + "%'", async function (err, result) {
                    if (err) throw err;
                    const embed = new Discord.MessageEmbed()
                        .setTitle("Searching SQL Database")
                        .setColor(3066993)
                        .setDescription("Searching for linked account to player with ID: " + plid)
                    message.channel.send(embed);
                    if (result[0].IP_Address === '') {
                        const qqq = new MessageEmbed()
                            .addField("Info", "Can't find IP address of a player")
                        message.channel.send(qqq);
                    }
                    else {
                        for (var q = 0; q < result.length; q++) {
                            var geo = await checkLoc(result[q].IP_Address);
                            const qqq = new Discord.MessageEmbed()
                                .addField("PlayerID: " + result[q].PlayerID + "\nNickname: " + result[q].SoldierName, "IP: " + result[q].IP_Address + " Location: " + geo.country)
                            message.channel.send(qqq);
                        }
                    }
                });

            }
            else {
                const embed = new MessageEmbed()
                    .addField("Error", "Invalid player ID")
                message.channel.send(embed);
            }
            con.end();
        })();

        function getInfo(asd) {

            return new Promise((resolve, reject) => {
                con.query("SELECT PlayerID, SoldierName FROM tbl_playerdata WHERE PlayerID = '" + asd + "'", (err, resp) => {
                    let result = resp[0];
                    return err ? reject(err) : resolve(result ? result.SoldierName : 0);
                }
                );
            });
        }

        function checkIP(playerid) {
            return new Promise((resolve, reject) => {
                con.query("SELECT PlayerID, SoldierName,IP_Address FROM tbl_playerdata WHERE PlayerID = '" + playerid + "'", (err, req) => {
                    let result = req[0];
                    return err ? reject(err) : resolve(result ? result.IP_Address : 0);
                });
            });
        }

        function checkLoc(ip) {
            var geo = geoip.lookup(ip);
            return new Promise((resolve, reject) => {
                return resolve(geo);
                ;
            });
        }
    };
}