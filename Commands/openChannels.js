const {MessageFlags} = require("discord.js");
module.exports = {
    guilds: ['mainGuildID'],
    run: async (Client, interaction) => {
        await Client.openChannels();
        interaction.reply({
            content: 'Channels opened',
            flags: MessageFlags.Ephemeral
        });
    }
}