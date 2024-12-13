const { EmbedBuilder } = require('discord.js');

module.exports = {
    description: 'Display the bot status',
    options: [],
    run: (Client, interaction) => {
        interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor('#0099ff')
                    .setDescription(`🛰️ | Latence avec Discord : \`${Client.ws.ping}\`
                    🚀 | En ligne depuis : <t:${Math.round((Date.now()-Client.uptime)/1000)}:R>`)
            ]
        })
    }
}