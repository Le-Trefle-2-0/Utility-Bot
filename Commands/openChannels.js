const {MessageFlags} = require("discord.js");
module.exports = {
    guilds: [process.env.MAIN_GUILD_ID],
    run: async (Client, interaction) => {
        await Client.openChannels();
        interaction.reply({
            content: 'Channels opened',
            flags: MessageFlags.Ephemeral
        });
    }
}