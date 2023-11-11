const fetch = require('node-fetch');
const webhookUrl = process.env.WEBHOOK_TOKEN;

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

    const fixedText = issuer ? `${issuer} ${text}` : text;

    const match = fixedText.match(/([A-Za-z0-9-]+)(?:.*?KICKED(?: by)?|: You KICKED) ([A-Za-z0-9-]+).*?for (.+)/);
    let kicker, kicked, reason;
    if (match) {
        [, kicker, kicked, reason] = match;
    }
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

export { webHookKickSenderBF4, webHookKickSenderBF3 }