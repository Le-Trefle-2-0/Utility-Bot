const {MessageFlags} = require("discord.js");
module.exports = {
    guilds: [process.env.MAIN_GUILD_ID],
    run: async (Client, interaction) => {
        await Client.closeChannels();
        interaction.reply({
            content: 'Channels closed',
            flags: MessageFlags.Ephemeral
        });
    }
}