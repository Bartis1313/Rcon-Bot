const Discord = require('discord.js');
const client = new Discord.Client({ restRequestTimeout: 60_0000 });
const BanAnnouncer = require('./misc/banChecker.js');
const banAnnouncer = new BanAnnouncer();

const { CommandHandler } = require("djs-commands")
const CH = new CommandHandler({
    folder: __dirname + '/commands/',
    prefix: [`${process.env.DISCORD_COMMAND_PREFIX}`]
});


client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
    client.user.setActivity('Watching Servers');
    banAnnouncer.startBanAnnouncement(60_000, 60_000);
});

client.on('message', message => {
    if (message.channel.type === 'dm') return;
    if (message.author.type === 'bot') return;

    let args = message.content.split(" ");
    let command = args[0];
    let cmd = CH.getCommand(command);
    if (!cmd) return;

    try {
        cmd.run(client, message, args)
    } catch (e) {
        console.log(e)
    }
});

client.login(process.env.DISCORD_TOKEN);