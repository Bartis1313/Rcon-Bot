import Prompter from "discordjs-prompter"
import fetch from "node-fetch";
import Discord from 'discord.js';

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
            console.log(error);
            return false;
        }
    }

    static selectServer(msg) {
        let promises = []
        let apiUrls = [];
        if (process.env.BATTLECON_API_URLS) { // Should probs add some validation here
            apiUrls = process.env.BATTLECON_API_URLS.split(',')
        }

        for (let apiUrl of apiUrls) {
            promises.push(
                fetch(`${apiUrl}/serverName`, {
                    method: "get",
                    headers: {
                        "Accept": "application/json",
                        "Accept-Charset": "utf-8"
                    }
                })
                    .then(response => response.json())
                    .catch(error => {
                        console.log(error)
                        return false
                    })
            )
        }

        // TODO: Add checks for if there are more than 10 servers? Though who has that many?
        const choices = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟']
        return Promise.all(promises)
            .then(async (responses) => {
                if (!responses.some((response) => response.status === "OK")) {
                    return null
                }

                const embed = new Discord.MessageEmbed()
                    .setTimestamp()
                    .setColor("00FF00")
                    .setAuthor('Server Select', msg.author.avatarURL())

                let index = 0;
                responses.forEach((response) => {
                    if (response) {
                        embed.addField(choices[index], `**${response.server}**`, false)
                    }
                    index++;
                })

                const possibleChoices = choices.slice(0, index);
                const message = await msg.channel.send(embed);
                // React with possible choices
                for (const choice of possibleChoices) {
                    await message.react(choice);
                }

                const filter = (reaction, user) => {
                    return possibleChoices.includes(reaction.emoji.name) && user.id === msg.author.id;
                };

                return message.awaitReactions(filter, { max: 1, time: 60 * 1000, errors: ['time'] })
                    .then(collected => {
                        const reaction = collected.first();
                        const index = possibleChoices.findIndex(x => x === reaction.emoji.name);
                        message.delete();

                        if (index >= 0) {
                            return apiUrls[index];
                        }

                        return null;
                    })
                    .catch(async collected => {
                        message.delete();
                        const m = await msg.reply(`Command timed out`);
                        m.delete({ timeout: 5000 });
                        return null;
                    });
            })
            .catch((err) => {
                console.log(err)
            });
    }

    static async selectDBServer(msg, dbs) {
        // TODO: Add checks for if there are more than 10 servers? Though who has that many?
        const choices = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟']

        const embed = new Discord.MessageEmbed()
            .setTimestamp()
            .setColor("00FF00")
            .setAuthor('Select DB Server', msg.author.avatarURL())

        const len = dbs.length;

        for (let index = 0; index < len; index++) {
            embed.addField(choices[index], `**${dbs[index].database}**`, false)
        }

        const message = await msg.channel.send(embed);
        for (let index = 0; index < len; index++) {
            await message.react(choices[index]);
        }

        const filter = (reaction, user) => {
            return choices.includes(reaction.emoji.name) && user.id === msg.author.id;
        };

        return message.awaitReactions(filter, { max: 1, time: 60 * 1000, errors: ['time'] })
            .then(collected => {
                const reaction = collected.first();
                message.delete();

                const index = choices.findIndex(x => x === reaction.emoji.name);
                if (index >= 0) {
                    return dbs[index];
                }

                return null;
            })
            .catch(async collected => {
                message.delete();
                const m = await msg.reply(`Command timed out`);
                m.delete({ timeout: 5000 });
                return null;
            });
    }

    static async selectPlayerName(msg, players) {
        const choices = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟']
        const embed = new Discord.MessageEmbed()
            .setTimestamp()
            .setColor("00FF00")
            .setAuthor('Select player', msg.author.avatarURL())

        let index = 0;
        players.forEach((player) => {
            embed.addField(choices[index], `**${player}**`, false)

            index++;
        })
        // Add "not in the list" entry
        embed.addField('❌', `The player is not in the list`, false)

        const possibleChoices = choices.slice(0, index);
        possibleChoices.push('❌');
        const message = await msg.channel.send(embed);
        // React with possible choices
        for (const choice of possibleChoices) {
            await message.react(choice);
        }

        const filter = (reaction, user) => {
            return possibleChoices.includes(reaction.emoji.name) && user.id === msg.author.id;
        };

        return message.awaitReactions(filter, { max: 1, time: 60 * 1000, errors: ['time'] })
            .then(collected => {
                const reaction = collected.first();
                message.delete();

                if (reaction.emoji.name === '❌') {
                    return null;
                }

                const index = possibleChoices.findIndex(x => x === reaction.emoji.name);
                if (index >= 0) {
                    return players[index];
                }

                return null;
            })
            .catch(async collected => {
                message.delete();
                const m = await msg.reply(`Command timed out`);
                m.delete({ timeout: 5000 });
                return null;
            });
    }

    static askTryAgain(msg, title, description) {
        const embed = new Discord.MessageEmbed()
            .setTimestamp()
            .setColor("00FF00")
            .setAuthor(title || 'Command timed out', msg.author.avatarURL())
            .setDescription(description || 'Do you want to try again?')

        return Prompter.reaction(msg.channel, {
            question: embed,
            userId: msg.author.id,
            timeout: 60 * 1000,
        }).then(async response => {
            // If no responses, the time ran out
            if (!response) {
                msg.delete();
                return null
            }

            if (response === 'yes') return true;
            if (response === 'no') return false;
        });
    }

    static confirm(msg, question) {
        const embed = new Discord.MessageEmbed()
            .setTimestamp()
            .setColor("00FF00")
            .setAuthor('Confirm', msg.author.avatarURL())
            .setDescription('Do you want to continue?')

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

    static askPlayerName(msg) {
        const embed = new Discord.MessageEmbed()
            .setTimestamp()
            .setColor("00FF00")
            .setAuthor('Playername', msg.author.avatarURL())
            .setDescription('Give the player name')

        return Prompter.message(msg.channel, {
            question: embed,
            userId: msg.author.id,
            max: 1,
            timeout: 60 * 1000,
        }).then(async responses => {
            // If no responses, the time ran out
            if (!responses.size) {
                return null
            }

            // Gets the first message in the collection
            const response = responses.first();
            const content = response.content;
            response.delete();

            return content;
        });
    }

    static askReason(msg) {
        const embed = new Discord.MessageEmbed()
            .setTimestamp()
            .setColor("00FF00")
            .setAuthor('Reason', msg.author.avatarURL())
            .setDescription('What\'s the reason for issuing this command?')

        return Prompter.message(msg.channel, {
            question: embed,
            userId: msg.author.id,
            max: 1,
            timeout: 60 * 1000,
        }).then(async responses => {
            // If no responses, the time ran out
            if (!responses.size) {
                return null
            }

            // Gets the first message in the collection
            const response = responses.first();
            const content = response.content;
            response.delete();

            return content;
        });
    }

    static async askbanType(msg) {
        const namedChoices = ['name', 'ip', 'guid'];
        const choices = ['1️⃣', '2️⃣', '3️⃣'];
        const embed = new Discord.MessageEmbed()
            .setTimestamp()
            .setColor("00FF00")
            .setAuthor('Type of the ban', msg.author.avatarURL());
        for (let index = 0; index < namedChoices.length; index++) {
            embed.addField(choices[index], `**${namedChoices[index]}**`, false)
        }
        const message = await msg.channel.send(embed);

        for (const choice of choices) {
            await message.react(choice);
        }

        const filter = (reaction, user) => {
            return choices.includes(reaction.emoji.name) && user.id === msg.author.id;
        };

        return message.awaitReactions(filter, { max: 1, time: 60 * 1000, errors: ['time'] })
            .then(collected => {
                const reaction = collected.first();
                message.delete();

                const index = choices.findIndex(x => x === reaction.emoji.name);
                if (index >= 0) {
                    return namedChoices[index];
                }

                return null;
            })
            .catch(async collected => {
                message.delete();
                const m = await msg.reply(`Command timed out`);
                m.delete({ timeout: 5000 });
                return null;
            });
    }

    static async asktimeout(msg) {
        const namedChoices = ['perm', 'seconds', 'rounds'];
        const choices = ['1️⃣', '2️⃣', '3️⃣'];
        const embed = new Discord.MessageEmbed()
            .setTimestamp()
            .setColor("00FF00")
            .setAuthor('Timeout of the ban', msg.author.avatarURL());
        for (let index = 0; index < namedChoices.length; index++) {
            embed.addField(choices[index], `**${namedChoices[index]}**`, false)
        }
        const message = await msg.channel.send(embed);

        for (const choice of choices) {
            await message.react(choice);
        }

        const filter = (reaction, user) => {
            return choices.includes(reaction.emoji.name) && user.id === msg.author.id;
        };

        return message.awaitReactions(filter, { max: 1, time: 60 * 1000, errors: ['time'] })
            .then(collected => {
                const reaction = collected.first();
                message.delete();

                const index = choices.findIndex(x => x === reaction.emoji.name);
                if (index >= 0) {
                    return namedChoices[index];
                }

                return null;
            })
            .catch(async collected => {
                message.delete();
                const m = await msg.reply(`Command timed out`);
                m.delete({ timeout: 5000 });
                return null;
            });
    }

    static askString(name, desc, msg) {
        const embed = new Discord.MessageEmbed()
            .setTimestamp()
            .setColor("00FF00")
            .setAuthor(name, msg.author.avatarURL())
            .setDescription(desc)

        return Prompter.message(msg.channel, {
            question: embed,
            userId: msg.author.id,
            max: 1,
            timeout: 60 * 1000,
        }).then(async responses => {
            // If no responses, the time ran out
            if (!responses.size) {
                return null
            }

            // Gets the first message in the collection
            const response = responses.first();
            const content = response.content;
            response.delete();

            return content;
        });
    }

    static askbanReason(msg) {
        const embed = new Discord.MessageEmbed()
            .setTimestamp()
            .setColor("00FF00")
            .setAuthor('Reason', msg.author.avatarURL())
            .setDescription('Give the ban reason')

        return Prompter.message(msg.channel, {
            question: embed,
            userId: msg.author.id,
            max: 1,
            timeout: 60 * 1000,
        }).then(async responses => {
            // If no responses, the time ran out
            if (!responses.size) {
                return null
            }

            // Gets the first message in the collection
            const response = responses.first();
            const content = response.content;

            response.delete();
            return content;
        });
    }

    static askIndex(msg) {
        const embed = new Discord.MessageEmbed()
            .setTimestamp()
            .setColor("00FF00")
            .setAuthor('Map index', msg.author.avatarURL())
            .setDescription('Give the map index number')

        return Prompter.message(msg.channel, {
            question: embed,
            userId: msg.author.id,
            max: 1,
            timeout: 60 * 1000,
        }).then(async responses => {
            // If no responses, the time ran out
            if (!responses.size) {
                return null
            }

            // Gets the first message in the collection
            const response = responses.first();
            const content = response.content;
            response.delete();

            return content;
        });
    }

    static askMessage(msg) {
        const embed = new Discord.MessageEmbed()
            .setTimestamp()
            .setColor("00FF00")
            .setAuthor('Message content', msg.author.avatarURL())
            .setDescription('Type message to say')

        return Prompter.message(msg.channel, {
            question: embed,
            userId: msg.author.id,
            max: 1,
            timeout: 60 * 1000,
        }).then(async responses => {
            // If no responses, the time ran out
            if (!responses.size) {
                return null
            }

            // Gets the first message in the collection
            const response = responses.first();
            const content = response.content;
            response.delete();

            return content;
        });
    }

    static askNameSay(msg) {
        const embed = new Discord.MessageEmbed()
            .setTimestamp()
            .setColor("00FF00")
            .setAuthor('Player Name', msg.author.avatarURL())
            .setDescription('Type playerName\n(all is global server message)')

        return Prompter.message(msg.channel, {
            question: embed,
            userId: msg.author.id,
            max: 1,
            timeout: 60 * 1000,
        }).then(async responses => {
            // If no responses, the time ran out
            if (!responses.size) {
                return null
            }

            // Gets the first message in the collection
            const response = responses.first();
            const content = response.content;
            response.delete();

            return content;
        });
    }

    static async sendDisconnectInfo(actionType, server, parameters, delay) {
        const sleep = (ms) => {
            return new Promise(resolve => setTimeout(resolve, ms));
        };

        const callbackYell = async () => {
            const params = {
                what: `YOU ARE ${actionType} for ${parameters.reason}`,
                duration: delay / 1000,
                playerName: parameters.playerName
            };

            await fetch(`${server}/admin/pyell`, {
                method: "post",
                headers: {
                    "Content-type": "application/json",
                    "Accept": "application/json",
                    "Accept-Charset": "utf-8"
                },
                body: JSON.stringify(params)
            })
                .then(response => response.json())
                .catch(error => {
                    console.log(error)
                    return false
                })
        }

        const callbackSend = async () => {
            const params = {
                what: `Rcon-Bot ${actionType} ${parameters.playerName} by Rcon-Bot for ${parameters.reason}` // try to send smth like other plugins
            };

            await fetch(`${server}/admin/sayall`, {
                method: "post",
                headers: {
                    "Content-type": "application/json",
                    "Accept": "application/json",
                    "Accept-Charset": "utf-8"
                },
                body: JSON.stringify(params)
            })
                .then(response => response.json())
                .catch(error => {
                    console.log(error)
                    return false
                })
        }

        await callbackYell();
        await callbackSend();
        await sleep(delay);
    }
};

export { Helpers, ActionType };