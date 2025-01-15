const { Client, GatewayIntentBits } = require('discord.js');
const { CommandHandler } = require('./handler');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageReactions
    ],
});

const commandHandler = new CommandHandler({
    folder: __dirname + '/commands/',
    prefix: process.env.DISCORD_COMMAND_PREFIX || '!',
});

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on('messageCreate', (message) => {
    if (!message.guild || message.author.bot) return;

    const args = message.content.split(/\s+/);
    const command = commandHandler.getCommand(args[0]);

    if (command) {
        try {
            command.run(client, message, args.slice(1));
        } catch (error) {
            console.error(`Error executing command '${command.name}':`, error);
            message.reply('There was an error while executing this command.');
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
