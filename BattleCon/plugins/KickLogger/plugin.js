module.exports = class KickLogger extends BasePlugin {
    constructor(bc) {
        super(bc, "KickLogger");

        this.waitingForBanned = false;
        this.pendingEnforceMatch = null;

        this.onChatHandler = this.onChatHandler.bind(this);
        this.onEvent("player.onChat", this.onChatHandler);

        this.onKickListener = this.onKickListener.bind(this);
        this.onEvent("player.onDisconnect", this.onKickListener);

        this.onPBListener = this.onPBListener.bind(this);
        this.onEvent("punkBuster.onMessage", this.onPBListener);
    }

    async onChatHandler([name, text, ...subset]) {
        if (process.env.GAME !== 'BF3') return;

        if (name !== 'Server') return;

        let playerNameSay = '';
        if (subset[0] === 'player') {
            playerNameSay = subset[1];
        }

        const fixedText = playerNameSay ? `${playerNameSay} ${text}` : text;

        const youKickedRegex = fixedText.match(/([A-Za-z0-9-]+): You KICKED (\[?[A-Za-z0-9-]*\]?[A-Za-z0-9-_]*).*?for (.+)/);
        const kickedRegex = fixedText.match(/(\[?[A-Za-z0-9-]*\]?[A-Za-z0-9-_]+) KICKED by (\S+) for (.+)/);
        const enforceMatch = fixedText.match(/Enforcing (\S+(?: \(.+?\))? ban) on (\[?[A-Za-z0-9-]*\]?[A-Za-z0-9-_]+) for (.+)/);
        const bannedMatch = fixedText.match(/(\S+) BANNED for (.+?) \[(perm|\d{1,2}[wdhms](?:\d{1,2}[wdhms]?)*)\](?:\[([^\]]+)\])/);

        let kicker, kicked, reason, duration;

        if (youKickedRegex) {
            [, kicker, kicked, reason] = youKickedRegex;
        }
        if (kickedRegex) {
            [, kicked, kicker, reason] = kickedRegex;
        }
        if (enforceMatch) {
            this.pendingEnforceMatch = enforceMatch;
            this.waitingForBanned = true;
            return;
        }

        if (this.waitingForBanned) {
            if (bannedMatch) {
                reason = this.pendingEnforceMatch[3];
                duration = bannedMatch[3];
                kicker = bannedMatch[4];
                kicked = playerNameSay;

                this.waitingForBanned = false;
                this.pendingEnforceMatch = null;
            }
        }

        if (!kicker || !kicked || !reason) return;

        const serverName = await this.getServerName();
        const randomUrl = this.getRandomUrl();

        const message = {
            embeds: [
                {
                    title: 'Kicked Player',
                    fields: [
                        { name: 'Name', value: kicked, inline: true },
                        { name: 'Issuer', value: kicker, inline: true },
                        { name: 'Reason', value: reason, inline: true },
                        { name: 'Duration', value: duration || "N/A", inline: true },
                        { name: 'Server', value: serverName || "Unknown", inline: true },
                    ],
                    color: 0x3498DB,
                    thumbnail: { url: randomUrl }
                }
            ]
        };

        const webhookUrl = process.env.WEBHOOK_TOKEN;
        fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(message)
        }).catch(error => console.error('Error:', error, message));
    }

    async onKickListener([name, reason]) {
        if (process.env.GAME !== 'BF4') return;

        const blazeReason = 'PLAYER_LEFT';

        if (reason === blazeReason) return;
        if (!reason) return; // blaze backend bug?

        const serverName = await this.getServerName();
        const randomUrl = this.getRandomUrl();

        const message = {
            embeds: [
                {
                    title: 'Kicked Player',
                    fields: [
                        { name: 'Name', value: name, inline: true },
                        { name: 'Reason', value: reason, inline: true },
                        { name: 'Server', value: serverName || "Unknown", inline: true },
                    ],
                    color: 0x3498DB,
                    thumbnail: { url: randomUrl }
                }
            ]
        };

        const webhookUrl = process.env.WEBHOOK_TOKEN;
        fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(message)
        }).catch(error => console.error('Error:', error, message));
    }

    async onPBListener([msg]) {
        const webhookBANUrl = process.env.WEBHOOK_BAN_TOKEN;
        if (!webhookBANUrl)
            return;

        if (msg.includes("VPN-VPN use blocked")) return; // ignore as requested

        msg = msg.substring(msg.indexOf(": ") + 2);

        if (!msg.startsWith("Kick Command Issued (Player")) return; // catch only good message, ignore packet flows etc... !BC2 - manual

        const startIndex = msg.indexOf("(");
        const endIndex = msg.indexOf("n])")

        const extractedText = msg.substring(startIndex + 1, endIndex + 2);

        const kicker = "PB";
        const kicked = extractedText.split(' ')[1];
        const reason = extractedText;

        const serverName = await this.getServerName();
        const randomUrl = this.getRandomUrl();

        const message = {
            embeds: [
                {
                    title: 'PB Banned player',
                    fields: [
                        { name: 'Name', value: kicked, inline: true },
                        { name: 'Issuer', value: kicker, inline: true },
                        { name: 'Reason', value: reason, inline: true },
                        { name: 'Server', value: serverName || "Unknown", inline: true },
                    ],
                    color: 0xFF0000,
                    thumbnail: { url: randomUrl }
                }
            ]
        };

        fetch(webhookBANUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(message)
        }).catch(error => console.error('Error:', error, message));
    }

    async getServerName() {
        try {
            const msg = await this.exec("serverInfo");
            return msg[0];
        } catch (error) {
            console.error('Error fetching server info:', error);
            return null;
        }
    }

    getRandomUrl() {
        const kickImgUrls = [
            "https://ep-team.ru/baner/ban6.gif",
            "https://ep-team.ru/baner/ban1.gif",
            "https://ep-team.ru/baner/ban2.gif",
            "https://ep-team.ru/baner/ban3.gif",
            "https://ep-team.ru/baner/ban4.gif",
            "https://ep-team.ru/baner/ban5.gif"
        ];
        return kickImgUrls[Math.floor(Math.random() * kickImgUrls.length)];
    }
};
