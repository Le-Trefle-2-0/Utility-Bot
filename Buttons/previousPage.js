const { EmbedBuilder, MessageFlags } = require('discord.js');

module.exports = async (Client, interaction) => {
    if (!Client.pages) return interaction.reply({
        embeds: [
            new EmbedBuilder()
                .setColor('db3226')
                .setDescription(':x: | Ce navigateur a expiré, merci de recommencer.')
        ], flags: MessageFlags.Ephemeral
    });

    let pager = Client.pages[interaction.message.id];

    if (!pager) return interaction.reply({
        embeds: [
            new EmbedBuilder()
                .setColor('db3226')
                .setDescription(':x: | Ce navigateur a expiré, merci de recommencer.')
        ], flags: MessageFlags.Ephemeral
    });

    pager.pageNumber--;
    if (pager.pageNumber < 0) pager.pageNumber = pager.pages.length - 1;
    interaction.update({ embeds: [pager.pages[pager.pageNumber]]});
}