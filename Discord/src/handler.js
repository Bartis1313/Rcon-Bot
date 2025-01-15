const path = require('path');
const fs = require('fs');

class CommandHandler {
    constructor(data = {}) {
        if (!data.folder) throw new Error('No folder specified.');
        this.folder = path.resolve(data.folder);
        if (!data.prefix) throw new Error('No prefix specified.');
        if (!Array.isArray(data.prefix)) data.prefix = [data.prefix];
        data.prefix.sort((a, b) => b.length - a.length);
        this.prefix = data.prefix;

        this.commands = new Map();
        this.aliases = new Map();

        this._loadFrom(this.folder);
    }

    _loadFrom(folder) {
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

                this.commands.set(cmd.name, cmd);

                console.log(`✅ Loaded command: '${cmd.name}' from '${file}'`);
                if (cmd.alias && Array.isArray(cmd.alias)) {
                    for (const alias of cmd.alias) {
                        this.aliases.set(alias, cmd.name);
                    }
                }
            } catch (error) {
                console.error(`❌ Error loading command file '${file}':`, error);
            }
        }

        console.log('✅ Done loading commands!\n');
    }

    _getAllFiles(folder) {
        let files = [];

        fs.readdirSync(folder, { withFileTypes: true }).forEach((entry) => {
            const entryPath = path.join(folder, entry.name);
            if (entry.isDirectory()) {
                files = files.concat(this._getAllFiles(entryPath));
            } else if (entry.isFile()) {
                files.push(entryPath);
            }
        });

        return files;
    }

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
        let cmd = this.commands.get(command);

        if (!cmd) {
            const alias = this.aliases.get(command);
            if (!alias) return null;
            cmd = this.commands.get(alias);
        }

        return cmd;
    }
}

module.exports = {
    CommandHandler,
};
