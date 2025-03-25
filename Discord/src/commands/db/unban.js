const { EmbedBuilder, SlashCommandBuilder, MessageFlags } = require('discord.js');
import { Helpers } from '../../helpers/helpers'
import DBHelper from '../../helpers/dbHelper';

class UnbanState {
    static NOT_BANNED = 0x1;
    static UNBANNED = 0x2;
    static OK = 0x3;
}

module.exports = class Unban {
    constructor() {
        this.name = 'unban';
        this.description = 'Unbans the player from DB';

        const cfg = DBHelper.getCfg();

        this.dbsConfig = cfg.cfg;
        this.dbNames = cfg.names;

        const dbChoices = Helpers.getChoices(this.dbNames, this.dbNames);

        this.slashCommand = new SlashCommandBuilder()
            .setName(this.name)
            .setDescription(this.description)
            .addStringOption(option =>
                option.setName("server")
                    .setDescription("Choose db server")
                    .setRequired(true)
                    .addChoices(...dbChoices)
            )
            .addStringOption(option =>
                option.setName("name")
                    .setDescription("Give name of player")
                    .setRequired(true)
            )
    }

    async getUnbanState(connection, playerName) {
        try {
            // should we do that?
            // ORDER BY r.record_time DESC
            // LIMIT 1;
            const query = `
            UPDATE adkats_bans AS b
            JOIN adkats_records_main AS r ON b.latest_record_id = r.record_id
            SET b.ban_status = CASE
                WHEN b.ban_status = 'Disabled' THEN 'Disabled'
                ELSE 'Disabled'
            END
            WHERE r.target_name = ?;
            `;

            const result = await DBHelper.query(connection, query, [playerName]);

            if (result.affectedRows === 0) {
                return UnbanState.NOT_BANNED;
            } else if (result.changedRows === 0) {
                return UnbanState.UNBANNED;
            } else {
                return UnbanState.OK;
            }
        } catch (error) {
            console.error('Database error:', error);
            return null;
        }
    }

    async runSlash(interaction) {
        if (!await Helpers.checkRoles(interaction, this))
            return;

        await interaction.deferReply();

        const server = interaction.options.getString("server");
        const serverDB = this.dbsConfig.find(db => db.database === server);
        const playerName = interaction.options.getString("name");

        const ubState = await DBHelper.processServer(serverDB, async (connection) => {
            return await this.getUnbanState(connection, playerName);
        });

        await interaction.editReply({ embeds: [await this.buildEmbed(interaction, serverDB, playerName, ubState)] });
    }

    async buildEmbed(messageOrInteraction, serverDB, playerName, state) {
        const user = Helpers.isCommand(messageOrInteraction) ? messageOrInteraction.user : messageOrInteraction.author;
        const embed = new EmbedBuilder()
            .setTimestamp()
            .setColor('Green')
            .setAuthor({ name: `Unban ${serverDB.database} DB`, iconURL: user.displayAvatarURL() });
        if (state === UnbanState.OK) {
            embed
                .addFields({ name: 'Issuer', value: user.username, inline: true })
                .addFields({ name: 'Target', value: `**${playerName}**`, inline: true })
        }
        else if (state === UnbanState.NOT_BANNED) {
            embed
                .setDescription(`Couldn't find any bans for ${playerName}`);
        }
        else if (state === UnbanState.UNBANNED) {
            embed
                .setDescription(`${playerName} is already unbanned`);
        }

        return embed;
    }
}