import fetch from "node-fetch";
import Prompter from "./prompter";

const { EmbedBuilder } = require('@discordjs/builders');
const { PermissionsBitField } = require('discord.js');

class ActionType {
    static BAN = 'BANNED';
    static KICK = 'KICKED';
    static KILL = 'KILLED';
    static UNKNOWN = 'UNKNOWN';
};

class Helpers {
    static async getPlayers(apiUrl) {
        try {
            const response = await fetch(`${apiUrl}/players`, {
                method: "get",
                headers: {
                    "Accept": "application/json",
                    "Accept-Charset": "utf-8"
                }
            });
            return await response.json();
        }
        catch (error) {
            console.error(error);
            return false;
        }
    }

    static async selectServer(msg) {
        const apiUrls = process.env.BATTLECON_API_URLS ? process.env.BATTLECON_API_URLS.split(',') : [];

        const promises = apiUrls.map((apiUrl, index) => {
            return fetch(`${apiUrl}/serverName`, {
                method: 'get',
                headers: {
                    'Accept': 'application/json',
                    'Accept-Charset': 'utf-8',
                },
                timeout: 10000, // test timeout
            })
                .then(response => {
                    return response.json();
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

    static async selectArray(msg, arr, desc = null) {
        const choices = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
        const embed = new EmbedBuilder()
            .setTimestamp()
            .setColor(0x00FF00)
            .setAuthor({ name: desc ? desc : 'Select choice', iconURL: msg.author.displayAvatarURL() });

        arr.forEach((a, index) => {
            embed.addFields(choices[index], `**${a}**`, false);
        });

        const message = await msg.channel.send(embed).catch(sendError => {
            console.error('Error while sending embed:', sendError);
            return null;
        });

        if (!message) return null;

        const reactPromises = choices.slice(0, arr.length).map(choice => {
            return message.react(choice).catch(reactError => {
                console.error(`Failed to react with ${choice}:`, reactError);
            });
        });

        await Promise.all(reactPromises);

        const filter = (reaction, user) => {
            return choices.includes(reaction.emoji.name) && user.id === msg.author.id;
        };

        return message.awaitReactions(filter, { max: 1, time: 60 * 1000, errors: ['time'] })
            .then(collected => {
                const reaction = collected.first();
                const index = choices.findIndex(x => x === reaction.emoji.name);

                message.delete().catch(deleteError => {
                    console.error('Failed to delete the message:', deleteError);
                });

                if (index >= 0) {
                    return dbs[index];
                }

                return null;
            })
            .catch(collected => {
                message.delete().catch(deleteError => {
                    console.error('Failed to delete the message after timeout:', deleteError);
                });

                msg.reply('Command timed out').then(m => {
                    setTimeout(() => m.delete().catch(console.error), 5000);
                }).catch(sendError => {
                    console.error('Failed to send timeout message:', sendError);
                });

                return null;
            });
    }

    static async selectPlayerName(msg, players) {
        const choices = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
        const embed = new EmbedBuilder()
            .setTimestamp()
            .setColor(0x00FF00)
            .setAuthor({ name: 'Select player', iconURL: msg.author.displayAvatarURL() });

        let index = 0;
        players.forEach(player => {
            embed.addFields(choices[index], `**${player}**`, false);
            index++;
        });

        // Add "not in the list" entry
        embed.addFields('❌', `The player is not in the list`, false);

        const possibleChoices = choices.slice(0, index);
        possibleChoices.push('❌');

        const message = await msg.channel.send(embed).catch(sendError => {
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

        const filter = (reaction, user) =>
            possibleChoices.includes(reaction.emoji.name) && user.id === msg.author.id;

        return message.awaitReactions(filter, { max: 1, time: 60 * 1000, errors: ['time'] })
            .then(collected => {
                const reaction = collected.first();

                message.delete().catch(deleteError => {
                    console.error('Failed to delete the message:', deleteError);
                });

                if (reaction.emoji.name === '❌') {
                    return null;
                }

                const selectedIndex = possibleChoices.findIndex(x => x === reaction.emoji.name);
                if (selectedIndex >= 0) {
                    return players[selectedIndex];
                }

                return null;
            })
            .catch(collected => {
                message.delete().catch(deleteError => {
                    console.error('Failed to delete the message after timeout:', deleteError);
                });

                msg.reply('Command timed out').then(m => {
                    setTimeout(() => m.delete().catch(console.error), 5000);
                }).catch(sendError => {
                    console.error('Failed to send timeout message:', sendError);
                });

                return null;
            });
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
                msg.delete().catch(deleteError => {
                    console.error('Failed to delete the message:', deleteError);
                });
                return null
            }

            if (response === 'yes') return true;
            if (response === 'no') return false;
        });
    }

    static async confirm(msg, question) {
        const embed = new EmbedBuilder()
            .setTimestamp()
            .setColor(0x00ff00) // Use hex for color
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

            if (response === 'yes') return true;
            if (response === 'no') return false;
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

            if (response === null) {
                return null;
            }
            return response;
        });
    }

    static async askByArray(msg, namedChoices) {

        const choices = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];

        const embed = new EmbedBuilder()
            .setTimestamp()
            .setColor(0x00FF00)
            .setAuthor({ name: 'Type', iconURL: msg.author.avatarURL() });

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

            await msg.reply('Command timed out').then(m => {
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

export { Helpers, ActionType };