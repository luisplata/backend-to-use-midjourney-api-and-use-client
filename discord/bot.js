const Discord = require('discord.js');
const DiscordClient = Discord.Client;
const Events = Discord.Events;
const GatewayIntentBits = Discord.GatewayIntentBits;
const dotenv = require('dotenv');
dotenv.config();

function initializeDiscordBot() {
    
    bot.on(Events.InteractionCreate, async interaction => {
        if (!interaction.isChatInputCommand()) return;

        if (interaction.commandName === 'ping') {
            await interaction.reply({ content: 'Secret Pong!', ephemeral: false });
        }
    });

    bot.once(Events.ClientReady, readyClient => {
        console.log(`Ready! Logged in as ${bot.user.tag}`);
        bot.channels.cache.get(process.env.CHANNEL_ID_FACE).send("Boy Bot Ready!");
    });

    bot.login(process.env.BOT_TOKEN);
}

const bot = new DiscordClient({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
    ],
});

module.exports = { initializeDiscordBot, bot };