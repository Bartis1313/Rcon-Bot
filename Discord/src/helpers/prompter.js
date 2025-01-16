//const { Message, TextChannel, DMChannel, MessageCollector, Collection, EmbedBuilder } = require('discord.js');

const _safeDelete = (msg) => {
    msg.delete().catch(error => { console.error("Error deleting message: ", error) });
};

module.exports = class Prompter {

    static async message(channel, { question, userId, max = 1, timeout = 60000 }) {
        const embed = question // TODO: checking, use some preexisting default embed

        const message = await channel.send({ embeds: [embed] });

        try {
            // Collect messages from the user
            const collected = await channel.awaitMessages({
                filter: (m) => m.author.id === userId,
                max,
                time: timeout,
                errors: ['time'],
            });

            const response = collected.first();
            await response.delete();
            await message.delete();

            return response.content;
        } catch {
            // Delete the question message if time runs out
            await message.delete().catch(() => null);
            return null; // No response
        }
    }

    static async reaction(channel, { question, userId, timeout }) {
        const message = await channel.send({ embeds: [question] });

        const reactions = { yes: '✅', no: '❌' };

        await message.react(reactions.yes);
        await message.react(reactions.no);

        const filter = (reaction, user) => {
            return [reactions.yes, reactions.no].includes(reaction.emoji.name) && user.id === userId;
        };

        // Wait for a reaction or timeout
        const collected = await message.awaitReactions({
            filter,
            max: 1,
            time: timeout,
            errors: ['time'],
        }).catch(() => null);

        // If no reaction was collected, return null
        if (!collected) {
            _safeDelete(message);
            return null;
        }

        const reaction = collected.first();

        if (reaction.emoji.name === reactions.yes) {
            _safeDelete(message);
            return 'yes';
        } else if (reaction.emoji.name === reactions.no) {
            _safeDelete(message);
            return 'no';
        }
    }
};
