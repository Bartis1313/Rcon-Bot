import Prompter from "discordjs-prompter"
import config from "config"
import fetch from "node-fetch";
import Discord from 'discord.js';


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
        let apiUrls = config.bconApiUrls
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
                        const message = await msg.reply(`Command timed out`);
                        message.delete({ timeout: 5000 });
                        return null;
                    });
            })
            .catch((err) => {
                console.log(err)
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
            message.react(choice);
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
                const message = await msg.reply(`Command timed out`);
                message.delete({ timeout: 5000 });
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

    static askbanType(msg) {
        const embed = new Discord.MessageEmbed()
            .setTimestamp()
            .setColor("00FF00")
            .setAuthor('Type of the ban', msg.author.avatarURL())
            .setDescription('**Give banId**\nname - soldierName\
            \nip - number \nguid - EA_<number>')

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

    static asktimeout(msg) {
        const embed = new Discord.MessageEmbed()
            .setTimestamp()
            .setColor("00FF00")
            .setAuthor('Timeout', msg.author.avatarURL())
            .setDescription('give the timeout amount\nperm\nrounds\nseconds')

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
}

export default Helpers