import { Client, GatewayIntentBits, Events } from 'discord.js';
import CommandHandler from './handler';
import BanAnnouncer from './misc/banAnouncer';

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
    clientId: process.env.DISCORD_CLIENT_ID,
    guildId: process.env.DISCORD_GUILD_ID || null,
    token: process.env.DISCORD_TOKEN,
});

const banAnnouncer = new BanAnnouncer();

client.once(Events.ClientReady, async () => {
    await commandHandler._loadFrom(commandHandler.folder);

    console.log(`Logged in as ${client.user.tag}!`);

    banAnnouncer.startBanAnnouncement(60_000, 60_000);
    await commandHandler.registerSlashCommands();
});

// running for legacy reasons, but these are far worse, slower
client.on(Events.MessageCreate, async (message) => {
    if (!message.guild || message.author.bot)
        return;

    await commandHandler.handleMessageCommand(client, message);
});

client.on(Events.InteractionCreate, async (interaction) => {
    await commandHandler.handleSlashCommand(interaction);
    await commandHandler.handleAutocomplete(interaction);
});

client.login(process.env.DISCORD_TOKEN);