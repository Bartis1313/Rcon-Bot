import { createPool } from 'mysql';
import fetch from 'node-fetch';

function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

module.exports = class BanAnnouncer {
    constructor() {
        this.dbsConfig = [];
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
                });
            }
        }

        this.webhookURLs = [];
        if (process.env.WEBHOOK_TOKENS) {
            this.webhookURLs = process.env.WEBHOOK_TOKENS.split(',');
        }

        this.lastProcessedBanIds = {};
        this.connections = this.dbsConfig.map((config, index) => {
            const pool = createPool(config);

            pool.getConnection((err, connection) => {
                if (err) {
                    console.error('Error getting MySQL connection from pool:', err);
                    connection.release();
                    return;
                }

                const query = `SELECT MAX(ban_id) AS last_ban_id FROM adkats_bans`

                connection.query(query, (error, results) => {
                    if (error) {
                        console.error('Error querying database:', error);
                        connection.release();
                        return;
                    }

                    // get correct last record id
                    this.lastProcessedBanIds[index] = results[0].last_ban_id || 0;

                    connection.release();
                });
            });

            return { pool, webhookURL: this.webhookURLs[index] };
        });
    }

    getRecentBans(pool, webhookURL, index) {
        pool.getConnection((err, connection) => {
            if (err) {
                console.error('Error getting MySQL connection from pool:', err);
                connection.release();
                return;
            }

            const lastProcessedBanId = this.lastProcessedBanIds[index];

            const query = `
            SELECT rcd.record_id, target_name, ban_startTime, ban_endTime, record_message, source_name, ServerName
            FROM adkats_bans AS ab
            INNER JOIN tbl_playerdata AS tp ON ab.player_id = tp.PlayerID
            INNER JOIN adkats_records_main AS rcd ON ab.latest_record_id = rcd.record_id
            INNER JOIN tbl_server AS s ON rcd.server_id = s.ServerID
            WHERE ab.ban_status = 'Active'
            AND ab.ban_startTime <= NOW()
            AND ab.ban_endTime > NOW()
            AND ab.ban_id > ${lastProcessedBanId}
            ORDER BY rcd.record_id DESC LIMIT 5;
            `;

            connection.query(query, (error, results) => {
                if (error) {
                    console.error('Error querying database:', error);
                    connection.release();
                    return;
                }

                const bans = results.map((row) => {
                    return {
                        ID: row.ban_id,
                        PlayerName: row.target_name,
                        Reason: row.record_message,
                        AdminName: row.source_name,
                        ServerName: row.ServerName,
                        StartTime: new Date(row.ban_startTime),
                        EndTime: new Date(row.ban_endTime),
                    };
                });

                if (bans.length > 0) {
                    this.lastProcessedBanIds[index] = bans[bans.length - 1].ID; // update the last processed ban ID, to prevent same data
                    this.sendBansToWebhook(webhookURL, bans);
                }

                connection.release();
            });
        });
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
        this.connections.forEach((connection, index) => {
            this.getRecentBans(connection.pool, connection.webhookURL, index);
        });
    }

    startBanAnnouncement(interval) {
        setInterval(() => this.checkForNewBans(), interval);
    }
}
