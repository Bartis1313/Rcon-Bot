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
                description: `**Name**: ${name}\n**Reason**: ${reason}`, // issuer will mostly show up in reason, regex '[]'
                fields: [
                    {
                        name: 'Server',
                        value: serverName,
                    },
                ],
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
            console.error('Error:', error);
        });
}

// I wish there would be a different way like #ifdef...
const webHookKickSenderBF3 = async (connection, name, text, subset) => {
    if (process.env.GAME !== 'BF3') return;
    if (name !== 'Server') return;

    let issuer = '';
    if (subset[0] === 'player') { // or even check squad? who does provide info like that?
        issuer = subset[1];
    }

    // don't log ping kicks
    if (text.includes("ping")) return;
    // don't log ChatManager
    if (text.includes("ChatManager")) return;

    const fixedText = issuer ? `${issuer} ${text}` : text;

    // we match first group as issuer, the issuer there won't have any tag. It's from subset
    const youKickedRegex = fixedText.match(/([A-Za-z0-9-]+): You KICKED (\[?[A-Za-z0-9-]*\]?[A-Za-z0-9-_]*).*?for (.+)/);
    // this will show in bans, therefore we'll log only rejoin attempts
    const kickedRegex = fixedText.match(/(\[?[A-Za-z0-9-]*\]?[A-Za-z0-9-_]+) KICKED by (\S+) for (.+)/);
    const enforceMatch = fixedText.match(/Enforcing (\S+(?: \(.+?\))? ban) on (\[?[A-Za-z0-9-]*\]?[A-Za-z0-9-_]+) for (.+)/);

    let kicker, kicked, reason;
    if (youKickedRegex) {
        [, kicker, kicked, reason] = youKickedRegex;
    }
    else if (kickedRegex) {
        [, kicked, kicker, reason] = kickedRegex;
    }
    else if (enforceMatch) {
        kicker = "Enforcer";
        kicked = enforceMatch[2];
        reason = `[${enforceMatch[1]}] ${enforceMatch[3]}`;
    }
    // BA bans
    // else if (text.startsWith("[Battle")) {
    //     const splited = text.split(' ');
    //     kicker = `${splited[0]} ${splited[1]}`.replace(/[\[\]]/g, '');
    //     kicked = splited[3].replace(/[\[\]]/g, '');
    //     reason = splited.slice(4).join(' ');
    // }
    // else if(text.startsWith("CheatDetector")) {
    //     const splited = text.split(' ');
    //     kicker = splited[0];
    //     kicked = splited[4];
    //     reason = `${splited[2]} ${splited[3]} ${splited.slice(5).join(' ')}`
    // }
    else {
        return;
    }

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
                description: `**Name**: ${kicked}\n**Reason**: ${reason}\n**Issuer**: ${kicker}`,
                fields: [
                    {
                        name: 'Server',
                        value: serverName,
                    },
                ],
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
            console.error('Error:', error);
        });
}

const webHookPB = async (connection, version, msg) => {
    if (version !== '3065862') return; // r40, luckily zlo using r38, so we won't log here PBSdk_DropCLient spam

    msg = msg.substring(msg.indexOf(": ") + 2);

    if (!msg.startsWith("Kick Command Issued (Player")) return; // catch only good message, ignore packet flows etc... !BC2 - manual

    const startIndex = msg.indexOf("(");
    const endIndex = msg.indexOf(")");

    const extractedText = msg.substring(startIndex + 1, endIndex);

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

    await getServerName();

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
                title: 'PB Kicked Player',
                description: `**Name**: ${kicked}\n**Reason**: ${reason}\n**Issuer**: ${kicker}`,
                fields: [
                    {
                        name: 'Server',
                        value: serverName,
                    },
                ],
                color: 0xFF0000, // RED
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
            console.error('Error:', error);
        });
}

export { webHookKickSenderBF4, webHookKickSenderBF3, webHookPB };