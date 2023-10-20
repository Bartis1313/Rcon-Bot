import config from "config";
import { MessageEmbed } from 'discord.js';
import { createConnection } from 'mysql';

module.exports = class check {
    constructor() {
        this.name = 'check',
            this.alias = ['checksoldier'],
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
        args = message.content.split(" ").slice(1);
        var nicknanme = args.join(" ");
        message.channel.send(`Command used by: ${message.author.username} *!check*`)
        message.delete()
        
        var addrs = this.address
        var con = createConnection({
            multipleStatements: true,
            host: addrs,
            user: this.login,
            password: this.pass,
            database: this.db
        });
        if (!nicknanme.trim().length) {
            message.reply("You can't provide null nickname!");
            message.delete()
        }
        else {
            (async () => {
                con.connect();

                const chkplname = await getchkname(nicknanme);
                if (chkplname != null) {
                    var querychk1 = ("SELECT tbl_playerdata.PlayerID, tbl_playerdata.SoldierName, tbl_playerdata.PBGUID, tbl_playerdata.EAGUID, tbl_playerdata.IP_Address, adkats_bans.ban_status FROM tbl_playerdata LEFT JOIN adkats_bans ON tbl_playerdata.PlayerID=adkats_bans.player_id WHERE Soldiername LIKE '%" + nicknanme + "%'");
                    con.query(querychk1, function (err, result) {
                        if (err) console.log(err)
                        const embed = new MessageEmbed()
                            .setTitle("Searching SQL Database")
                            .setColor(3066993)
                            .setDescription("Searching for player with: " + nicknanme)
                        message.channel.send(embed);
                        for (var q = 0; q < result.length; q++) {
                            if (result[q].ban_status === null) {
                                const qqq = new MessageEmbed()
                                    .addField("PlayerID: " + result[q].PlayerID + "\nNickname: " + result[q].SoldierName + "\nPBGUID: " + result[q].PBGUID + "\nEAGUID: " + result[q].EAGUID + "\nIP: " + result[q].IP_Address, "Player is not banned in SQL Database")
                                message.channel.send(qqq);
                            }
                            else {
                                const qqq = new MessageEmbed()
                                    .addField("PlayerID: " + result[q].PlayerID + "\nNickname: " + result[q].SoldierName + "\nPBGUID: " + result[q].PBGUID + "\nEAGUID: " + result[q].EAGUID + "\nIP: " + result[q].IP_Address, "Ban: " + result[q].ban_status)
                                message.channel.send(qqq);
                            }
                        }
                    });
                }
                else {
                    const embed = new MessageEmbed()
                        .addField("Error", "Unknown player in database")
                    message.channel.send(embed);
                }
                con.end();
            })();
            function getchkname(playerid) {
                return new Promise((resolve, reject) => {
                    con.query("SELECT PlayerID, SoldierName FROM tbl_playerdata WHERE Soldiername LIKE '%" + playerid + "%'", (err, req) => {
                        let result = req[0];
                        return err ? reject(err) : resolve(result ? result.SoldierName : null);
                    });
                });
            }
        }
    }
}