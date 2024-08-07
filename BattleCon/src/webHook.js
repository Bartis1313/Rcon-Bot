const fetch = require('node-fetch');

const webhookUrl = process.env.WEBHOOK_TOKEN;
const webhookBANUrl = process.env.WEBHOOK_BAN_TOKEN;

function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

const webHookKickSenderBF4 = async (connection, name, reason) => {
    if (process.env.GAME !== 'BF4') return;

    const blazeReason = 'PLAYER_LEFT';

    if (reason === blazeReason) return;
    if (!reason) return; // blaze backend bug?

    // don't log ping kicks
    if (reason.includes("ping")) return;
    // don't log ChatManager
    if (reason.includes("ChatManager")) return;

    const kickImgUrls = [
        "https://ep-team.ru/baner/ban6.gif",
        "https://ep-team.ru/baner/ban1.gif",
        "https://ep-team.ru/baner/ban2.gif",
        "https://ep-team.ru/baner/ban3.gif",
        "https://ep-team.ru/baner/ban4.gif",
        "https://ep-team.ru/baner/ban5.gif"
    ];

    const randomUrl = kickImgUrls[getRandomInt(0, kickImgUrls.length - 1)];

    let serverName = 'Unknown';
    const getServerName = () => {
        return new Promise((resolve, reject) => {
            connection.exec("serverInfo", (err, msg) => {
                if (err) {
                    console.error(err);
                    reject(err);
                } else {
                    serverName = msg[0];
                    resolve();
                }
            });
        });
    };

    await getServerName();

    const message = {
        embeds: [
            {
                title: 'Kicked Player',
                fields: [
                    {
                        name: 'Name',
                        value: name,
                        inline: true,
                    },
                    {
                        name: 'Reason',
                        value: reason,
                        inline: true,
                    },
                    {
                        name: 'Server',
                        value: serverName,
                        inline: true,
                    },
                ].filter(field => field !== null), // Filter out null fields
                color: 0x3498DB, // Light blue
                thumbnail: { url: randomUrl }
            }
        ]
    };

    fetch(webhookUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(message)
    })
        .then((response) => {
            if (!response.ok) {
                console.error('Failed to send message to the webhook:', response.status, response.statusText);
            }
        })
        .catch((error) => {
            console.error('Error:', error, message);
        });
}

// "static" behaviour
let pendingEnforceMatch = null;
let waitingForBanned = false;

const webHookKickSenderBF3 = async (connection, name, text, subset, map) => {
    if (process.env.GAME !== 'BF3') return;
    if (name !== 'Server') return;

    let playerNameSay = '';
    if (subset[0] === 'player') { // or even check squad? who does provide info like that?
        playerNameSay = subset[1];
    }

    const fixedText = playerNameSay ? `${playerNameSay} ${text}` : text;

    // don't log ping kicks
    if (text.includes("ping")) return;
    // don't log ChatManager
    if (text.includes("ChatManager")) return;
    if (text.includes("PlayerMuteSystem")) return;
    if (text.includes("Challenge P")) return;
    if (text.includes("/AdKatsInstanceCheck")) return;

    const sayAll = (str) => {
        return new Promise((resolve, reject) => {
            connection.exec(["admin.say", str, "all"], (err, msg) => {
                if (err) {
                    console.error(err);
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    };


    let kicker, kicked, reason, link;

    let ba = false;

    if (fixedText.startsWith("[Battlefield Agency] [Kick]")) {

        const splited = fixedText.split(' ');
        const reason_ = splited.splice(4).join(' ');

        if (!reason_.toLowerCase().includes("vpn")) {
            const name = splited[3].replace(/\[|\]/g, '');

            kicker = "BA";
            kicked = name;
            reason = reason_;
            link = `https://battlefield.agency/player/by-guid/${map.get(name)}`;

            ba = true;
        }
    }

    // we match first group as issuer, the issuer there won't have any tag. It's from subset
    const youKickedRegex = fixedText.match(/([A-Za-z0-9-]+): You KICKED (\[?[A-Za-z0-9-]*\]?[A-Za-z0-9-_]*).*?for (.+)/);
    // this will show in bans, therefore we'll log only rejoin attempts
    const kickedRegex = fixedText.match(/(\[?[A-Za-z0-9-]*\]?[A-Za-z0-9-_]+) KICKED by (\S+) for (.+)/);
    const enforceMatch = fixedText.match(/Enforcing (\S+(?: \(.+?\))? ban) on (\[?[A-Za-z0-9-]*\]?[A-Za-z0-9-_]+) for (.+)/);

    // special case
    if (enforceMatch) {

        // temp temp
        console.log("enforematch text: ", fixedText);

        pendingEnforceMatch = enforceMatch;
        waitingForBanned = true;
        return; // stop there, we dont have issuer yet
    }


    if (waitingForBanned) {

        // temp temp
        console.log("waiting for banned text: ", fixedText);

        // now can grab the issuer
        const bannedMatch = fixedText.match(/BANNED for (.+?) \[([^\]]+)\]\[([^\]]+)\]/);
        if (bannedMatch) { // we are doing it that way, because the bannedMatch will be executed many times, the enforce not
            let duration;
            [, reason, duration, kicker] = bannedMatch;
            kicked = playerNameSay;

            reason = `[${duration}] ${reason}`;

            if (fixedText.includes("AutoBan")) {
                kicked = playerNameSay;
                kicker = bannedMatch[2];
                reason = pendingEnforceMatch[3];
            }

            waitingForBanned = false;
            pendingEnforceMatch = null;
        }
    } else if (youKickedRegex) {
        [, kicker, kicked, reason] = youKickedRegex;

    } else if (kickedRegex) {
        [, kicked, kicker, reason] = kickedRegex;
    } else if (ba) {

    }
    else {
        return;
    }

    if (!kicker || !kicked || !reason) return;

    const kickImgUrls = [
        "https://ep-team.ru/baner/ban6.gif",
        "https://ep-team.ru/baner/ban1.gif",
        "https://ep-team.ru/baner/ban2.gif",
        "https://ep-team.ru/baner/ban3.gif",
        "https://ep-team.ru/baner/ban4.gif",
        "https://ep-team.ru/baner/ban5.gif"
    ];

    const randomUrl = kickImgUrls[getRandomInt(0, kickImgUrls.length - 1)];

    let serverName = 'Unknown';
    const getServerName = () => {
        return new Promise((resolve, reject) => {
            connection.exec("serverInfo", function (err, msg) {
                if (err) {
                    console.error(err);
                    reject(err);
                } else {
                    serverName = msg[0];
                    resolve();
                }
            });
        });
    };

    await getServerName();

    const message = {
        embeds: [
            {
                title: 'Kicked Player',
                fields: [
                    {
                        name: 'Name',
                        value: kicked,
                        inline: true,
                    },
                    {
                        name: 'Reason',
                        value: reason,
                        inline: true,
                    },
                    {
                        name: 'Issuer',
                        value: kicker,
                        inline: true,
                    },
                    link ? {
                        name: 'Link',
                        value: link,
                        inline: true,
                    } : null,
                    {
                        name: 'Server',
                        value: serverName,
                        inline: true,
                    },
                ].filter(field => field !== null), // Filter out null fields
                color: 0x3498DB, // Light blue
                thumbnail: { url: randomUrl }
            }
        ]
    };

    fetch(webhookUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(message)
    })
        .then((response) => {
            if (!response.ok) {
                console.error('Failed to send message to the webhook:', response.status, response.statusText);
            }
        })
        .catch((error) => {
            console.error('Error:', error, message);
        });
}

const webHookPB = async (connection, version, msg) => {
    if (version !== '3065862') return; // r40, luckily zlo using r38, so we won't log here PBSdk_DropCLient spam

    if (msg.includes("VPN-VPN use blocked")) return; // ignore as requested

    msg = msg.substring(msg.indexOf(": ") + 2);

    if (!msg.startsWith("Kick Command Issued (Player")) return; // catch only good message, ignore packet flows etc... !BC2 - manual

    const startIndex = msg.indexOf("(");
    const endIndex = msg.indexOf("n])")

    const extractedText = msg.substring(startIndex + 1, endIndex + 2);

    const kicker = "PB";
    const kicked = extractedText.split(' ')[1];
    const reason = extractedText;

    let serverName = 'Unknown';
    const getServerName = () => {
        return new Promise((resolve, reject) => {
            connection.exec("serverInfo", function (err, msg) {
                if (err) {
                    console.error(err);
                    reject(err);
                } else {
                    serverName = msg[0];
                    resolve();
                }
            });
        });
    };

    const sayAll = (str) => {
        return new Promise((resolve, reject) => {
            connection.exec(["admin.say", str, "all"], (err, msg) => {
                if (err) {
                    console.error(err);
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    };

    await getServerName();
    //await sayAll(`/ban ${kicked} ${reason}`);

    const kickImgUrls = [
        "https://ep-team.ru/baner/ban6.gif",
        "https://ep-team.ru/baner/ban1.gif",
        "https://ep-team.ru/baner/ban2.gif",
        "https://ep-team.ru/baner/ban3.gif",
        "https://ep-team.ru/baner/ban4.gif",
        "https://ep-team.ru/baner/ban5.gif"
    ];

    const randomUrl = kickImgUrls[getRandomInt(0, kickImgUrls.length - 1)];

    const message = {
        embeds: [
            {
                title: 'PB banned player',
                fields: [
                    {
                        name: 'Name',
                        value: kicked,
                        inline: true,
                    },
                    {
                        name: 'Reason',
                        value: reason,
                        inline: true,
                    },
                    {
                        name: 'Issuer',
                        value: kicker,
                        inline: true,
                    },
                    {
                        name: 'Server',
                        value: serverName,
                        inline: true,
                    },
                ].filter(field => field !== null),
                color: 0xFF0000, // Red
                thumbnail: { url: randomUrl }
            }
        ]
    };


    fetch(webhookBANUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(message)
    })
        .then((response) => {
            if (!response.ok) {
                console.error('Failed to send message to the webhook:', response.status, response.statusText);
            }
        })
        .catch((error) => {
            console.error('Error:', error, message);
        });
}

export { webHookKickSenderBF4, webHookKickSenderBF3, webHookPB };