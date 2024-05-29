import mysql from 'mysql';
import fetch from 'node-fetch';

function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

module.exports = class BanAnnouncer {
    constructor() {
        this.dbsConfig = [];
        this.lastBanIds = [];
        if (process.env.DBS_NAME) {
            const sHosts = process.env.DBS_HOST.split(',');
            const sNames = process.env.DBS_NAME.split(',');
            const sUsers = process.env.DBS_USER.split(',');
            const sPasses = process.env.DBS_PASS.split(',');
            const sPorts = process.env.DBS_PORT.split(',');
            const len = sPorts.length;

            for (let i = 0; i < len; i++) {
                this.dbsConfig.push({
                    host: sHosts[i],
                    user: sUsers[i],
                    password: sPasses[i],
                    database: sNames[i],
                    port: sPorts[i],
                    connectionLimit: 1000,
                    connectTimeout: 60 * 60 * 1000,
                    acquireTimeout: 60 * 60 * 1000,
                    timeout: 60 * 60 * 1000,
                    waitForConnections: true
                });
            }
        }

        this.webhookURLs = [];
        if (process.env.WEBHOOK_TOKENS) {
            this.webhookURLs = process.env.WEBHOOK_TOKENS.split(',');
        }

        this.lastProcessedTime = new Date();
        this.pools = this.dbsConfig.map((config, index) => {
            this.lastBanIds[index] = -1;

            return { pool: mysql.createPool(config), webhookURL: this.webhookURLs[index] };
        });
    }

    async getRecentBans(pool, webhookURL, index) {

        const query = `
            SELECT rcd.record_id, target_name, ban_startTime, ban_endTime, record_message, source_name, ServerName
            FROM adkats_bans AS ab
            INNER JOIN tbl_playerdata AS tp ON ab.player_id = tp.PlayerID
            INNER JOIN adkats_records_main AS rcd ON ab.latest_record_id = rcd.record_id
            INNER JOIN tbl_server AS s ON rcd.server_id = s.ServerID
            WHERE ab.ban_status = 'Active'
            AND ab.ban_startTime > '${this.lastProcessedTime.toISOString()}'
            `;

        pool.getConnection((err, connection) => {
            if (err) {
                console.error("Error getting database connection: ", err);
                return;
            }

            connection.query(query, (error, results) => {
                connection.release();

                if (error) {
                    console.error('Error querying database:', error);
                    return;
                }

                const bans = results.map((row) => {

                    return {
                        ID: row.record_id,
                        PlayerName: row.target_name,
                        Reason: row.record_message,
                        AdminName: row.source_name,
                        ServerName: row.ServerName,
                        StartTime: new Date(row.ban_startTime),
                        EndTime: new Date(row.ban_endTime),
                    };
                });

                if (bans.length > 0) {
                    const lastid = Number(bans[bans.length - 1].ID);
                    if (lastid > this.lastBanIds[index]) {
                        this.lastBanIds[index] = lastid;

                        this.lastProcessedTime = new Date();
                        this.sendBansToWebhook(webhookURL, bans);
                    }
                }
            });
        })
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

        const embeds = bans.map((ban) => {
            return {
                title: 'New Ban',
                fields: [
                    { name: 'Player', value: ban.PlayerName, inline: true },
                    { name: 'Reason', value: ban.Reason, inline: true },
                    { name: 'Admin', value: ban.AdminName, inline: true },
                    { name: 'Start Time', value: ban.StartTime.toString(), inline: true },
                    { name: 'End Time', value: ban.EndTime.toString(), inline: true },
                    { name: 'Server', value: ban.ServerName, inline: true },
                ],
                color: 0xFF0000, // RED,
                thumbnail: { url: randomUrl }
            };
        });

        const payload = {
            embeds,
        };

        fetch(webhookURL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        })
            .then((response) => {
                if (!response.ok) {
                    console.error('Error sending bans to Discord webhook:', response.status, response.statusText);
                }
            })
            .catch((error) => {
                console.error('Error sending bans to Discord webhook:', error);
            });
    }

    checkForNewBans() {
        this.pools.forEach((poolObj, index) => {
            this.getRecentBans(poolObj.pool, poolObj.webhookURL, index);
        });
    }

    async startBanAnnouncement(interval, delayBetweenConnections) {
        const processConnections = async () => {
            await Promise.all(this.pools.map(async (poolObj, index) => {
                await this.getRecentBans(poolObj.pool, poolObj.webhookURL, index);
                await new Promise((resolve) => setTimeout(resolve, delayBetweenConnections));
            }));
        };

        setInterval(processConnections, interval);
    }
}
