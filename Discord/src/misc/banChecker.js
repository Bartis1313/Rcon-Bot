import { createConnection } from 'mysql';
import fetch from 'node-fetch';

export default class BanAnnouncer {
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
            const connection = createConnection(config);

            connection.connect((err) => {
                if (err) {
                    console.error('Error connecting to MySQL:', err);
                    return;
                }

                const query = `
                SELECT MAX(record_id) AS maxRecordId
                FROM adkats_records_main;
                `;

                connection.query(query, (error, results) => {
                    if (error) {
                        console.error('Error querying database:', error);
                        return;
                    }

                    // get correct last record id, if not found just apply crazy
                    this.lastProcessedBanIds[index] = results[0].maxRecordId || 9999999;
                });

            });

            return { connection, webhookURL: this.webhookURLs[index] };
        });
    }

    getRecentBans(connection, webhookURL, index) {

        const lastProcessedBanId = this.lastProcessedBanIds[index];

        const query = `
        SELECT rcd.record_id, target_name, ban_startTime, ban_endTime, record_message, source_name
        FROM adkats_bans AS ab, tbl_playerdata AS tp, adkats_records_main AS rcd
        WHERE ab.ban_status = 'Active'
        AND ab.player_id = tp.PlayerID
        AND ab.ban_startTime <= NOW()
        AND ab.ban_endTime > NOW()
        AND ab.latest_record_id = rcd.record_id
        AND rcd.record_id > ${lastProcessedBanId}
        ORDER BY rcd.record_id DESC LIMIT 5;
        `;

        connection.query(query, (error, results) => {
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
                    StartTime: new Date(row.ban_startTime),
                    EndTime: new Date(row.ban_endTime),
                };
            });

            if (bans.length > 0) {
                this.lastProcessedBanIds[index] = bans[0].ID; // update the last processed ban ID, to prevent same data
                this.sendBansToWebhook(webhookURL, bans);
            }
        });
    }

    async sendBansToWebhook(webhookURL, bans) {
        if (bans.length === 0) return;

        const embeds = bans.map((ban) => {
            return {
                title: 'New Ban',
                fields: [
                    { name: 'Player', value: ban.PlayerName, inline: true },
                    { name: 'Reason', value: ban.Reason, inline: true },
                    { name: 'Admin', value: ban.AdminName, inline: true },
                    { name: 'Start Time', value: ban.StartTime.toString(), inline: true },
                    { name: 'End Time', value: ban.EndTime.toString(), inline: true },
                ],
                color: 0xFF0000, // RED
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
            this.getRecentBans(connection.connection, connection.webhookURL, index);
        });
    }

    startBanAnnouncement(interval) {
        setInterval(() => this.checkForNewBans(), interval);
        // init
        this.checkForNewBans();
    }
}
