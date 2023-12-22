const Discord = require('discord.js');

module.exports = class help {
    constructor() {
        this.name = 'help';
        this.alias = ['helpme'];
        this.usage = `${process.env.DISCORD_COMMAND_PREFIX}${this.name}`;
    }

    async run(bot, message, args) {
        message.delete();

        const prefix = process.env.DISCORD_COMMAND_PREFIX;

        // yes, manually, too lazy to make some reader for it
        const desc = [
            `${prefix}ban - bans player from the server`,
            `${prefix}check - checks player information from DB`,
            `${prefix}kick - kicks player from the server`,
            `${prefix}kill - kills player`,
            `${prefix}link - links players with same IP, the name is NOT matched!`,
            `${prefix}list - lists players from the server, you better create seperate channel for it. The list is updated per 5 secs`,
            `${prefix}map - sets next map index, votemap might overwrite it!`,
            `${prefix}printbans - print all bans in the text file`,
            `${prefix}psay - say the message to the player`,
            `${prefix}say - say the message to the server`,
            `${prefix}fps - checks serverTickTime variable`,
            `${prefix}unban - unbans selected player`,
            `${prefix}vip - adds vip slot to the player`,
            `${prefix}custom - executes rcon command, use with caution!`,
        ];

        const embed = new Discord.MessageEmbed()
            .setTimestamp()
            .setColor("00FF00")
            .setAuthor('Help', message.author.avatarURL())
            .setFooter('Author: Bartis')
            .setDescription(desc.join('\n'));

        message.channel.send(embed);
    }

}
