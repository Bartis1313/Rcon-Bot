const { createPool } = require('mysql2/promise');
const fetch = require('node-fetch');

function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

module.exports = class BanAnnouncer {
    constructor() {
        this.dbsConfig = [];
        this.lastBanIds = [];
        this.webhookURLs = [];
        this.lastProcessedTime = new Date();
        this.pools = [];

        if (process.env.DBS_NAME) {
            const sHosts = process.env.DBS_HOST.split(',');
            const sNames = process.env.DBS_NAME.split(',');
            const sUsers = process.env.DBS_USER.split(',');
            const sPasses = process.env.DBS_PASS.split(',');
            const sPorts = process.env.DBS_PORT.split(',');

            for (let i = 0; i < sPorts.length; i++) {
                this.dbsConfig.push({
                    host: sHosts[i],
                    user: sUsers[i],
                    password: sPasses[i],
                    database: sNames[i],
                    port: sPorts[i],
                    connectionLimit: 1000,
                    connectTimeout: 60 * 60 * 1000,
                    acquireTimeout: 60 * 60 * 1000,
                    waitForConnections: true,
                });
                this.lastBanIds.push(-1); // init
            }
        }

        if (process.env.WEBHOOK_TOKENS) {
            this.webhookURLs = process.env.WEBHOOK_TOKENS.split(',');
        }

        this.pools = this.dbsConfig.map((config, index) => ({
            pool: createPool(config),
            webhookURL: this.webhookURLs[index],
        }));
    }

    async getRecentBans(pool, webhookURL, index) {
        const query = `
            SELECT rcd.record_id, target_name, ban_startTime, ban_endTime, record_message, source_name, ServerName
            FROM adkats_bans AS ab
            INNER JOIN tbl_playerdata AS tp ON ab.player_id = tp.PlayerID
            INNER JOIN adkats_records_main AS rcd ON ab.latest_record_id = rcd.record_id
            INNER JOIN tbl_server AS s ON rcd.server_id = s.ServerID
            WHERE ab.ban_status = 'Active'
            AND ab.ban_startTime > ?
        `;

        try {
            const connection = await pool.getConnection();
            const [results] = await connection.query(query, [this.lastProcessedTime.toISOString()]);
            connection.release();

            const bans = results.map((row) => ({
                ID: row.record_id,
                PlayerName: row.target_name,
                Reason: row.record_message,
                AdminName: row.source_name,
                ServerName: row.ServerName,
                StartTime: new Date(row.ban_startTime),
                EndTime: new Date(row.ban_endTime),
            }));

            if (bans.length > 0) {
                const lastId = bans[bans.length - 1].ID;
                if (lastId > this.lastBanIds[index]) {
                    this.lastBanIds[index] = lastId;
                    this.lastProcessedTime = new Date();
                    await this.sendBansToWebhook(webhookURL, bans);
                }
            }
        } catch (error) {
            console.error('Error querying database:', error);
        }
    }

    async sendBansToWebhook(webhookURL, bans) {
        if (bans.length === 0) return;

        const banImgUrls = [
            "https://ep-team.ru/baner/ban6.gif",
            "https://ep-team.ru/baner/ban1.gif",
            "https://ep-team.ru/baner/ban2.gif",
            "https://ep-team.ru/baner/ban3.gif",
            "https://ep-team.ru/baner/ban4.gif",
            "https://ep-team.ru/baner/ban5.gif"
        ];

        const randomUrl = banImgUrls[getRandomInt(0, banImgUrls.length - 1)];

        const embeds = bans.map((ban) => ({
            title: 'New Ban',
            fields: [
                { name: 'Player', value: ban.PlayerName, inline: true },
                { name: 'Reason', value: ban.Reason, inline: true },
                { name: 'Admin', value: ban.AdminName, inline: true },
                { name: 'Start Time', value: ban.StartTime.toUTCString(), inline: true },
                { name: 'End Time', value: ban.EndTime.toUTCString(), inline: true },
                { name: 'Server', value: ban.ServerName, inline: true },
            ],
            color: 0xFF0000, // RED
            thumbnail: { url: randomUrl },
        }));

        const payload = { embeds };

        try {
            const response = await fetch(webhookURL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                console.error('Error sending bans to Discord webhook:', response.status, response.statusText);
            }
        } catch (error) {
            console.error('Error sending bans to Discord webhook:', error);
        }
    }

    async startBanAnnouncement(interval, delayBetweenConnections) {
        const processConnections = async () => {
            for (let i = 0; i < this.pools.length; i++) {
                await this.getRecentBans(this.pools[i].pool, this.pools[i].webhookURL, i);
                await new Promise((resolve) => setTimeout(resolve, delayBetweenConnections));
            }
        };

        setInterval(processConnections, interval);
    }
};