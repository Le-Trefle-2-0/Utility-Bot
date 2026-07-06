const {MessageFlags} = require("discord.js");
module.exports = {
    guilds: ['mainGuildID'],
    run: async (Client, interaction) => {
        await Client.closeChannels();
        interaction.reply({
            content: 'Channels closed',
            flags: MessageFlags.Ephemeral
        });
    }
}