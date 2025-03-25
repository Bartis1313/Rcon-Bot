import { resolve, join } from 'path';
import { readdirSync } from 'fs';
import { REST, Routes, MessageFlags } from 'discord.js';

class CommandHandler {
    constructor(data = {}) {
        if (!data.folder) throw new Error('No folder specified.');
        this.folder = resolve(data.folder);
        if (!data.prefix) throw new Error('No prefix specified.');
        if (!Array.isArray(data.prefix)) data.prefix = [data.prefix];
        data.prefix.sort((a, b) => b.length - a.length);
        this.prefix = data.prefix;

        this.commands = new Map(); // all commands
        this.slashCommands = new Map(); // just slash commands
        this.slashCommandsGuild = new Map(); // just slash commands
        this.globalSlashCommands = new Map(); // slash registered globally

        this.clientId = data.clientId; // needed
        this.guildId = data.guildId; // optional
        this.token = data.token; // needed
    }

    // load everything from folder
    async _loadFrom(folder) {
        const files = this._getAllFiles(folder);
        const jsFiles = files.filter((file) => file.endsWith('.js'));

        if (jsFiles.length === 0) throw new Error('No commands to load!');

        console.log(`Found ${jsFiles.length} files to load!\n`);

        for (const file of jsFiles) {
            try {
                const CommandClass = require(file);
                const cmd = new CommandClass();

                if (!cmd.name) {
                    console.warn(`⚠️ Skipping ${file}: Missing 'name' property.`);
                    continue;
                }
                // optional
                // if (!cmd.description) {
                //     console.warn(`⚠️ Skipping ${file}: Missing 'description' property.`);
                //     continue;
                // }

                // all commands
                this.commands.set(cmd.name, cmd);

                // fill classes with inits 
                if (typeof cmd.init === "function") {
                    await cmd.init();
                }
                console.log(`✅ Loaded command: '${cmd.name}' from '${file}' ${typeof cmd.init === "function" ? 'Loaded with init()' : ''}`);

                // alternative names to command
                if (cmd.alias && Array.isArray(cmd.alias)) {
                    for (const alias of cmd.alias) {
                        this.commands.set(alias, cmd); // load to commands to reduce confusion
                    }
                }

                // slash commands better be loaded seperately to not reuse same code
                if (typeof cmd.runSlash === "function" && cmd.slashCommand) {
                    if (cmd.globalCommand) {
                        this.globalSlashCommands.set(cmd.name, cmd);
                    }
                    else {
                        this.slashCommandsGuild.set(cmd.name, cmd);
                    }
                    this.slashCommands.set(cmd.name, cmd);
                }

            } catch (error) {
                console.error(`❌ Error loading command file '${file}':`, error);
            }
        }
        console.log('✅ Done loading commands!\n');
    }

    // register slash commands with Discord
    async _registerSlashCommands() {
        const guildCommands = Array.from(this.slashCommandsGuild.values()).map(cmd => cmd.slashCommand.toJSON());
        const globalCommands = Array.from(this.globalSlashCommands.values()).map(cmd => cmd.slashCommand.toJSON());

        const rest = new REST({ version: '10' }).setToken(this.token);
        try {
            if (guildCommands.length > 0) {
                console.log(`⏳ Registering ${guildCommands.length} guild-specific slash commands...`);
                await rest.put(Routes.applicationGuildCommands(this.clientId, this.guildId), { body: guildCommands });
                console.log('✅ Successfully registered guild slash commands!');
            }

            if (globalCommands.length > 0) {
                console.log(`⏳ Registering ${globalCommands.length} global slash commands...`);
                await rest.put(Routes.applicationCommands(this.clientId), { body: globalCommands });
                console.log('✅ Successfully registered global slash commands!');
            }
        } catch (error) {
            console.error('❌ Error registering slash commands:', error);
        }
    }

    // handle slash commands
    async handleSlashCommand(interaction) {
        if (!interaction.isCommand()) return;

        const cmd = this.slashCommands.get(interaction.commandName);
        if (!cmd) return;

        try {
            await cmd.runSlash(interaction);
        } catch (error) {
            console.error(`Error executing slash command '${cmd.name}':`, error);
            if (interaction.deferred || interaction.replied) {
                await interaction.editReply({ content: 'There was an error executing this command.', flags: MessageFlags.Ephemeral });
            }
            else {
                await interaction.reply({ content: 'There was an error executing this command.', flags: MessageFlags.Ephemeral });
            }
        }
    }

    // handle autocomplete for slash commands
    async handleAutocomplete(interaction) {
        if (!interaction.isAutocomplete()) return;

        const cmd = this.slashCommands.get(interaction.commandName);
        if (!cmd || !cmd.handleAutocomplete) return;

        try {
            await cmd.handleAutocomplete(interaction);
        } catch (error) {
            console.error(`Error handling autocomplete for command '${cmd.name}':`, error);
            await interaction.respond([]);
        }
    }

    // handle normal (message-based) commands
    async handleMessageCommand(client, message) {
        const cmd = this.getCommand(message.content);
        if (!cmd) return;
        if (!cmd.run) return;

        try {
            const args = message.content.split(' ').slice(1);
            await cmd.run(client, message, args);
        } catch (error) {
            console.error(`Error executing command '${cmd.name}':`, error);
            await message.reply('There was an error executing this command.');
        }
    }

    // like init(), but do it when everything is loaded...
    async handleOnReady(client) {
        try {
            await this._registerSlashCommands();

            for (const [name, cmd] of this.commands) {
                if (typeof cmd.onReady === "function") {
                    await cmd.onReady(client);
                }
            }

        } catch (error) {
            console.error(`Error in ready:`, error);
        }
    }

    // recursively get all files in a folder
    _getAllFiles(folder) {
        let files = [];

        readdirSync(folder, { withFileTypes: true }).forEach((entry) => {
            const entryPath = join(folder, entry.name);
            if (entry.isDirectory()) {
                files = files.concat(this._getAllFiles(entryPath));
            } else if (entry.isFile()) {
                files.push(entryPath);
            }
        });

        return files;
    }

    // get any command by name, for message.content
    getCommand(string) {
        if (!string) return null;

        let prefix = '';
        let prefixExists = false;

        for (const x of this.prefix) {
            if (string.startsWith(x)) {
                prefix = x;
                prefixExists = true;
                break;
            }
        }

        if (!prefixExists) return null;

        const command = string.substring(prefix.length).trim();
        const cmd = this.commands.get(command);

        return cmd;
    }
}

export default CommandHandler;