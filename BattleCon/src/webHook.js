const fetch = require('node-fetch');
const webhookUrl = process.env.WEBHOOK_TOKEN;

const webHookSender = (name, reason) => {
    const blazeReason = 'PLAYER_LEFT';

    if (reason === blazeReason) return;

    const message = {
        embeds: [
            {
                title: 'Kicked Player',
                description: `**Name**: ${name}\n**Reason**: ${reason}`,
                color: 0x3498DB, // Light blue
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

export default webHookSender