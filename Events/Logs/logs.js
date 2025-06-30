const {EmbedBuilder} = require("discord.js");
module.exports = async (Client, category, name, message, footer, image) => {
    console.log('New logs')
    const colors = {
        server: '9bd2d2', // vert clair trèfle
        textual: '2986cc', // bleu
        moderation: '8B0000', // rouge ocre
        voice: 'ce7e00', // orange
        member: '008000' // vert
    }
    const mailGuild = await Client.guilds.cache.get(process.env.MAIN_GUILD_ID);
    if (mailGuild) {
        const logsChannel = await Client.channels.cache.get(Client.settings.logs[category]);
        if (logsChannel) {
            logsChannel.send({
                embeds: [
                    new EmbedBuilder()
                        .setTitle(name)
                        .setColor(colors[category])
                        .setDescription(message)
                        .setImage(image || null)
                        .setFooter({ text: footer || category })
                        .setTimestamp()
                ]
            });
        }
    }
}