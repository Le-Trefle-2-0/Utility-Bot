const { EmbedBuilder, MessageFlags } = require('discord.js');

// Menu déroulant de pagination : saut direct vers une page (voir Commands/top.js)
module.exports = async (Client, interaction) => {
    const pager = Client.pages?.[interaction.message.id];

    if (!pager) return interaction.reply({
        embeds: [
            new EmbedBuilder()
                .setColor('db3226')
                .setDescription(':x: | Ce navigateur a expiré, merci de recommencer.')
        ], flags: MessageFlags.Ephemeral
    });

    const page = parseInt(interaction.values[0], 10);
    if (!Number.isInteger(page) || page < 0 || page >= pager.pages.length) return interaction.deferUpdate();

    pager.pageNumber = page;
    interaction.update({ embeds: [pager.pages[page]] });
};
