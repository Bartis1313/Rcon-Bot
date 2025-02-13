import Fetch from "./fetch";
import Prompter from "./prompter";

const { EmbedBuilder, userMention } = require('discord.js');
const { InteractionType } = require('discord-api-types/v10');

class ActionType {
    static BAN = 'BANNED';
    static KICK = 'KICKED';
    static KILL = 'KILLED';
    static UNKNOWN = 'UNKNOWN';
}

class DiscordLimits {
    static maxFieldLength = 1024;
    static maxDescriptionLength = 4096;
    static maxFieldsPerEmbed = 25;
    static accountsPerField = 10;
    static maxChoices = 25;
}

let serverChoices = [];

class Helpers {

    static async getPlayers(apiUrl) {
        try {
            const response = await Fetch.get(`${apiUrl}/players`)
            return response;
        }
        catch (error) {
            console.error(error);
            return false;
        }
    }

    // for something that doesn't need selection
    static selectFirstServer() {
        const servers = process.env.BATTLECON_API_URLS.split(',');
        return servers && servers.length ? servers[0] : null;
    }

    static async getServerChoices() {
        if (!serverChoices.length) {
            const apiUrls = process.env.BATTLECON_API_URLS ? process.env.BATTLECON_API_URLS.split(',') : [];

            await Promise.all(apiUrls.map(async (apiUrl, index) => {
                try {
                    const response = await Fetch.get(`${apiUrl}/serverName`);
                    if (response) {
                        serverChoices.push({ name: response.server, value: apiUrls[index] });
                    }
                } catch (error) {
                    console.error(`Error fetching from ${apiUrl}:`, error);
                }
            }));
        }

        return serverChoices;
    }

    // arr -> values
    // arrNames -> names
    static getChoices(arr, arrNames) {
        const a = [];
        arr.forEach((n, index) => {
            a.push({ name: arrNames[index], value: n });
        });

        return a;
    }

    static truncateString(str, maxLength) {
        if (str.length > maxLength) {
            return str.substring(0, maxLength - 3) + '...';
        }
        return str;
    }

    static isCommand(messageOrInteraction) {
        return messageOrInteraction.type == InteractionType.ApplicationCommand;
    }

    static checkRoles(messageOrInteraction, classObj) {
        if (!messageOrInteraction.member.roles.cache.has(process.env.DISCORD_RCON_ROLEID)) {
            const mention = userMention(messageOrInteraction.user.id);
            if (this.isCommand()) {
                messageOrInteraction.reply(`${mention} You don't have permission to use this command (${classObj.name})`);
            }
            else {
                messageOrInteraction.reply(`${mention} You don't have permission to use this command (${classObj.name})`);
            }
            return false;
        }

        return true;
    }

    static async selectServer(msg) {
        const apiUrls = process.env.BATTLECON_API_URLS ? process.env.BATTLECON_API_URLS.split(',') : [];

        const promises = apiUrls.map((apiUrl, index) => {
            return Fetch.get(`${apiUrl}/serverName`)
                .then(response => {
                    return response;
                })
                .catch(error => {
                    console.error(`Error fetching from ${apiUrl}:`, error);
                    return null;
                });
        });

        const choices = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];

        try {
            const responses = (await Promise.all(promises)).filter(
                response => response && response.status === 'OK'
            );

            if (!responses.length) {
                console.warn('No valid responses received.');
                return null;
            }

            const embed = new EmbedBuilder()
                .setTimestamp()
                .setColor(0x00ff00)
                .setAuthor({ name: 'Server Select', iconURL: msg.author.displayAvatarURL() });

            responses.forEach((response, index) => {
                embed.addFields({ name: choices[index], value: `**${response.server}**`, inline: false });
            });

            const possibleChoices = choices.slice(0, responses.length);

            const message = await msg.channel.send({ embeds: [embed] });

            // React with possible choices
            for (const choice of possibleChoices) {
                try {
                    await message.react(choice);
                } catch (err) {
                    console.error(`Failed to react with ${choice}:`, err);
                }
            }

            const filter = (reaction, user) => {
                return possibleChoices.includes(reaction.emoji.name) && user.id === msg.author.id;
            };

            try {
                const collected = await message.awaitReactions({
                    filter,
                    max: 1,
                    time: 60000,
                    errors: ['time'],
                });

                const reaction = collected.first();
                const selectedIndex = possibleChoices.indexOf(reaction.emoji.name);

                await message.delete().catch(deleteError => {
                    console.error('Failed to delete the message:', deleteError);
                });

                if (selectedIndex >= 0) {
                    return apiUrls[selectedIndex];
                }

                console.warn('No valid selection made.');
                return null;
            } catch (collected) {
                console.warn('No reaction collected or timeout occurred.');
                await message.delete().catch(deleteError => {
                    console.error('Failed to delete the message after timeout:', deleteError);
                });
                const timeoutMessage = await msg.reply('Command timed out');
                setTimeout(() => timeoutMessage.delete().catch(console.error), 5000);
                return null;
            }
        } catch (err) {
            console.error('Error in selectServer:', err);
            return null;
        }
    }

    static async selectArray(msg, arr, arrNames, desc = null) {
        const choices = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
        const embed = new EmbedBuilder()
            .setTimestamp()
            .setColor(0x00FF00)
            .setAuthor({ name: "Selection", iconURL: msg.author.displayAvatarURL() })
            .setDescription(desc ? desc : 'Select choice');

        if (arr.length > 0 && arrNames.length > 0) {
            arr.forEach((a, index) => {
                embed.addFields({ name: choices[index], value: `**${arrNames[index]}**`, inline: false });
            });
        } else {
            embed.addFields({ name: 'No Choices Available', value: 'There are no choices available at the moment.', inline: false });
        }

        const message = await msg.channel.send({ embeds: [embed] }).catch(sendError => {
            console.error('Error while sending embed:', sendError);
            return null;
        });


        const possibleChoices = choices.slice(0, arr.length);
        // React with possible choices
        for (const choice of possibleChoices) {
            try {
                await message.react(choice);
            } catch (err) {
                console.error(`Failed to react with ${choice}:`, err);
            }
        }

        const filter = (reaction, user) => {
            return possibleChoices.includes(reaction.emoji.name) && user.id === msg.author.id;
        };

        try {
            const collected = await message.awaitReactions({
                filter,
                max: 1,
                time: 60000,
                errors: ['time'],
            });

            const reaction = collected.first();
            const selectedIndex = possibleChoices.indexOf(reaction.emoji.name);

            await message.delete().catch(deleteError => {
                console.error('Failed to delete the message:', deleteError);
            });

            if (selectedIndex >= 0) {
                return arr[selectedIndex];
            }

            console.warn('No valid selection made.');
            return null;
        } catch (collected) {
            console.warn('No reaction collected or timeout occurred.');
            await message.delete().catch(deleteError => {
                console.error('Failed to delete the message after timeout:', deleteError);
            });
            const timeoutMessage = await msg.reply('Command timed out');
            setTimeout(() => timeoutMessage.delete().catch(console.error), 5000);
            return null;
        }
    }

    static async selectFromEmoteList(msg, arrNames) {
        const choices = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
        const embed = new EmbedBuilder()
            .setTimestamp()
            .setColor(0x00FF00)
            .setAuthor({ name: 'Select', iconURL: msg.author.displayAvatarURL() });

        let index = 0;
        arrNames.forEach(a => {
            embed.addFields({ name: choices[index], value: `**${a}**`, inline: false });
            index++;
        });

        // Add "not in the list" entry
        embed.addFields({ name: '❌', value: 'is not in the list', inline: false });

        const possibleChoices = choices.slice(0, index);
        possibleChoices.push('❌');

        const message = await msg.channel.send({ embeds: [embed] }).catch(sendError => {
            console.error('Error while sending embed:', sendError);
            return null;
        });

        if (!message) return null;

        const reactPromises = possibleChoices.map(choice =>
            message.react(choice).catch(reactError => {
                console.error(`Failed to react with ${choice}:`, reactError);
            })
        );

        await Promise.all(reactPromises);

        const filter = (reaction, user) => {
            return (choices.includes(reaction.emoji.name) || reaction.emoji.name === '❌') && user.id === msg.author.id;
        };

        try {
            const collected = await message.awaitReactions({ filter, max: 1, time: 60 * 1000, errors: ['time'] });
            const reaction = collected.first();

            await message.delete().catch(deleteError => {
                console.error('Failed to delete the message:', deleteError);
            });

            if (reaction.emoji.name === '❌') {
                return null;
            }

            const index = choices.findIndex(x => x === reaction.emoji.name);

            if (index >= 0) {
                return arrNames[index];
            }

            return null;
        } catch (collected) {
            console.error('Error while waiting for reactions:', collected);

            await msg.channel.send('Command timed out').then(m => {
                setTimeout(() => m.delete().catch(console.error), 5000);
            }).catch(sendError => {
                console.error('Failed to send timeout message:', sendError);
            });

            await message.delete().catch(deleteError => {
                console.error('Failed to delete the message after timeout:', deleteError);
            });

            return null;
        }
    }

    static async askTryAgain(msg, title, description) {
        const embed = new EmbedBuilder()
            .setTimestamp()
            .setColor(0x00FF00)
            .setAuthor({ name: title || 'Command timed out', iconURL: msg.author.displayAvatarURL() })
            .setDescription(description || 'Do you want to try again?');

        return Prompter.reaction(msg.channel, {
            question: embed,
            userId: msg.author.id,
            timeout: 60 * 1000,
        }).then(async response => {
            // If no responses, the time ran out
            if (!response) {
                return null
            }

            if (response === 'yes') {
                return true;
            }
            if (response === 'no') {
                return false;
            }
        });
    }

    static async confirm(msg, question) {
        const embed = new EmbedBuilder()
            .setTimestamp()
            .setColor(0x00ff00)
            .setAuthor({ name: 'Confirm', iconURL: msg.author.displayAvatarURL() })
            .setDescription('Do you want to continue?');

        return Prompter.reaction(msg.channel, {
            question: question || embed,
            userId: msg.author.id,
            timeout: 60 * 1000,
        }).then(async response => {
            // If no responses, the time ran out
            if (!response) {
                return null
            }

            if (response === 'yes') {
                return true;
            }
            if (response === 'no') {
                return false;
            }
        });
    }

    static ask(msg, name, desc) {
        const embed = new EmbedBuilder()
            .setTimestamp()
            .setColor(0x00FF00)
            .setAuthor({ name: name, iconURL: msg.author.displayAvatarURL() })
            .setDescription(desc);

        return Prompter.message(msg.channel, {
            question: embed,
            userId: msg.author.id,
            max: 1,
            timeout: 60 * 1000,
        }).then(async response => {
            // see if it makes sense to auto delete these too...
            if (response === null) {
                return null;
            }
            return response;
        });
    }

    static async askByArray(msg, namedChoices, desc) {

        const choices = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];

        const embed = new EmbedBuilder()
            .setTimestamp()
            .setColor(0x00FF00)
            .setAuthor({ name: 'Type', iconURL: msg.author.displayAvatarURL() })
            .setDescription(desc);

        for (let index = 0; index < namedChoices.length; index++) {
            embed.addFields({ name: choices[index], value: `**${namedChoices[index]}**`, inline: false });
        }

        const message = await msg.channel.send({ embeds: [embed] }).catch(sendError => {
            console.error('Error while sending embed:', sendError);
            return null;
        });

        if (!message) return null;

        const reactPromises = choices.map(choice => message.react(choice).catch(reactError => {
            console.error(`Failed to react with ${choice}:`, reactError);
        }));

        await Promise.all(reactPromises);

        const filter = (reaction, user) => {
            return choices.includes(reaction.emoji.name) && user.id === msg.author.id;
        };

        try {
            const collected = await message.awaitReactions({ filter, max: 1, time: 60 * 1000, errors: ['time'] });
            const reaction = collected.first();
            const index = choices.findIndex(x => x === reaction.emoji.name);

            await message.delete().catch(deleteError => {
                console.error('Failed to delete the message:', deleteError);
            });

            if (index >= 0) {
                return namedChoices[index];
            }

            return null;
        } catch (collected) {
            console.error('Error while waiting for reactions:', collected);

            await msg.channel.send('Command timed out').then(m => {
                setTimeout(() => m.delete().catch(console.error), 5000);
            }).catch(sendError => {
                console.error('Failed to send timeout message:', sendError);
            });

            await message.delete().catch(deleteError => {
                console.error('Failed to delete the message after timeout:', deleteError);
            });

            return null;
        }
    }
};

export { Helpers, ActionType, DiscordLimits };