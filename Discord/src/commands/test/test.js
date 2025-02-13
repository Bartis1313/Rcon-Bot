const { EmbedBuilder, SlashCommandBuilder } = require("discord.js");
import Fetch from "../../helpers/fetch";

module.exports = class Test {
    constructor() {
        this.name = 'test';
        this.description = 'Tests if the application is working properly';

        this.slashCommand = new SlashCommandBuilder()
            .setName(this.name)
            .setDescription(this.description);
    }

    async getBackendResponses() {
        const responses = [];
        const apiUrls = process.env.BATTLECON_API_URLS ? process.env.BATTLECON_API_URLS.split(',') : [];

        await Promise.all(apiUrls.map(async (apiUrl, index) => {
            try {
                const response = await Fetch.get(`${apiUrl}/isOkay`);

                responses.push(response);
            } catch (error) {
                console.error(`Error fetching from ${apiUrl}:`, error);
            }
        }));

        return responses;
    }

    buildEmbed(responses) {
        const embed = new EmbedBuilder()
            .setTitle(this.name)
            .setColor('DarkPurple');
        for (const response of responses) {
            embed.addFields({ name: response.status, value: response.server, inline: false });
        }

        return embed;
    }

    async runSlash(interaction) {
        await interaction.deferReply();

        const responses = await this.getBackendResponses();

        await interaction.editReply({ embeds: [this.buildEmbed(responses)] });
    }

    async run(bot, message, args) {
        const responses = await this.getBackendResponses();

        await message.channel.send({ embeds: [this.buildEmbed(responses)] });
    }
};
