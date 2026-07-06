const {EmbedBuilder, ActionRowBuilder} = require("discord.js");
module.exports = async (Client, category, embeds, components = []) => {
    const colors = {
        server: '9bd2d2', // vert clair trèfle
        textual: '2986cc', // bleu
        moderation: '8B0000', // rouge ocre
        voice: 'ce7e00', // orange
        member: '008000' // vert
    }
    const mailGuild = await Client.guilds.cache.get(Client.settings.mainGuildID);
    if (mailGuild) {
        const logsChannel = await Client.channels.cache.get(Client.settings.logs[category]);
        if (logsChannel) {
            const embedArray = Array.isArray(embeds) ? embeds : [embeds];
            
            embedArray.forEach(embed => {
                if (!embed.data.color) {
                    embed.setColor(colors[category]);
                }
                if (!embed.data.timestamp) {
                    embed.setTimestamp();
                }
            });

            logsChannel.send({
                embeds: embedArray,
                components: components
            });
        }
    }
}