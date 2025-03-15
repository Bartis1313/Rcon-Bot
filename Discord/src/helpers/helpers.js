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

    static checkRoles(messageOrInteraction, classObj) {
        const hasRole = messageOrInteraction.member?.roles.cache.has(process.env.DISCORD_RCON_ROLEID);
        if (!hasRole) {
            const mention = userMention(messageOrInteraction.user.id);
            const replyMessage = `${mention} You don't have permission to use this command (${classObj.name})`;
            messageOrInteraction.reply(replyMessage);
            return false;
        }
        return true;
    }
};

export { Helpers, ActionType, DiscordLimits };