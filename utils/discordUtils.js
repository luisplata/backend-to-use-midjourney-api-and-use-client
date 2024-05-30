const fetch = import('node-fetch');
const Buffer = require('buffer').Buffer;
const { bot } = require('../discord/bot.js');

async function retrieveMessages(limit = 50, SalaiToken, ChannelId, DiscordBaseUrl) {
    const headers = {
        "Content-Type": "application/json",
        Authorization: SalaiToken,
    };
    const response = await fetch(
        `${DiscordBaseUrl}/api/v10/channels/${ChannelId}/messages?limit=${limit}`,
        { headers }
    );
    if (!response.ok) {
        console.log(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
}

async function sendPictureToDiscord(channelId, imageBase64, textMessage = null) {
    if (!imageBase64) {
        throw new Error('No image provided');
    }

    const buffer = Buffer.from(imageBase64, 'base64');
    if (buffer.length > 8 * 1024 * 1024) { // 8 MiB is the max size for files in Discord
        throw new Error('Image is too large');
    }

    const channel = bot.channels.cache.get(channelId);
    if (!channel) {
        throw new Error(`Channel with ID ${channelId} not found`);
    }

    try {
        let message;
        if (textMessage) {
            message = await channel.send({
                content: textMessage,
                files: [{ attachment: buffer, name: 'image.png' }]
            });
        } else {
            message = await channel.send({
                files: [{ attachment: buffer, name: 'image.png' }]
            });
        }

        if (!message.attachments.first()) {
            throw new Error('No attachments in the message');
        }

        return message.attachments.first().url;
    } catch (err) {
        throw new Error(`Failed to send picture to Discord: ${err.message}`);
    }
}

module.exports = { retrieveMessages, sendPictureToDiscord };