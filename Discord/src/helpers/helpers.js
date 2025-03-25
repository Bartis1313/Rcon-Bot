import Fetch from "./fetch";
const { userMention } = require('discord.js');
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

class Helpers {
    static async getPlayers(apiUrl) {
        return Fetch.get(`${apiUrl}/players`)
            .then(response => response)
            .catch(error => {
                console.error('Failed to fetch players:', error);
                return false;
            });
    }

    static selectFirstServer() {
        const servers = process.env.BATTLECON_API_URLS?.split(',');
        return servers?.length ? servers[0] : null;
    }

    static async getServerChoices(refresh = false) {
        const apiUrls = process.env.BATTLECON_API_URLS?.split(',') || [];

        const serverChoices = [];
        await Promise.all(apiUrls.map(async (apiUrl, index) => {
            return Fetch.get(`${apiUrl}/serverName`)
                .then(response => {
                    if (response) {
                        serverChoices.push({ name: response.server, value: apiUrls[index] });
                    }
                })
                .catch(error => {
                    console.error(`Error fetching server name from ${apiUrl}:`, error);
                });
        }));

        return serverChoices;
    }

    static getChoices(arr, arrNames) {
        return arr.map((value, index) => ({
            name: arrNames[index],
            value
        }));
    }

    static truncateString(str, maxLength) {
        return str.length > maxLength ? str.substring(0, maxLength - 3) + '...' : str;
    }

    static isCommand(messageOrInteraction) {
        return messageOrInteraction.type === InteractionType.ApplicationCommand;
    }

    static async checkRoles(messageOrInteraction, classObj) {
        const user = messageOrInteraction.user ?? messageOrInteraction.author;
        let pass = false;

        let channel = messageOrInteraction.channel;
        if (!channel && messageOrInteraction.channelId) {
            channel = await messageOrInteraction.client.channels.fetch(messageOrInteraction.channelId).catch(() => null);
        }

        if (classObj.globalCommand && channel?.isDMBased()) {
            const userids = process.env.DISCORD_IDS.split(",");
            pass = userids.includes(user.id);
        }

        if (messageOrInteraction.member) {
            pass |= messageOrInteraction.member.roles.cache.has(process.env.DISCORD_RCON_ROLEID);
        }

        if (pass == false) {
            const mention = userMention(user.id);
            const replyMessage = `${mention} You don't have permission to use this command (${classObj.name})`;
            
            messageOrInteraction.reply(replyMessage);
        }

        return pass;
    }

    static async sendInChunks(interaction, embeds, ignoreFirst = false) {
        if (embeds.length === 0) return;

        // discord limits
        const MAX_TOTAL_CHARACTERS = 6000;
        const MAX_EMBEDS_PER_MESSAGE = 10;
        const RATE_LIMIT_DELAY = 1000;

        const chunks = [];
        let currentChunk = [];
        let currentChunkLength = 0;

        for (const embed of embeds) {
            if (currentChunk.length >= MAX_EMBEDS_PER_MESSAGE ||
                currentChunkLength + embed.length > MAX_TOTAL_CHARACTERS) {
                chunks.push(currentChunk);
                currentChunk = [embed];
                currentChunkLength = embed.length;
            } else {
                currentChunk.push(embed);
                currentChunkLength += embed.length;
            }
        }

        if (currentChunk.length > 0) {
            chunks.push(currentChunk);
        }

        for (let i = 0; i < chunks.length; i++) {
            try {
                if (i === 0 && !ignoreFirst) {
                    await interaction.editReply({ embeds: chunks[i] });
                } else {
                    await interaction.followUp({ embeds: chunks[i] });
                }

                if (i < chunks.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));
                }
            } catch (error) {
                console.error(`Error sending chunk ${i}:`, error);
                if (i > 0) {
                    try {
                        await interaction.followUp({
                            content: `Error: Could not display all results. Some data may be missing.`
                        });
                    } catch (e) {
                        console.error('Failed to send error notification:', e);
                    }
                }
                break;
            }
        }
    }
};

export { Helpers, ActionType, DiscordLimits };