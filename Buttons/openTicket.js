const { ModalBuilder, ActionRowBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');

module.exports = async (Client, interaction) => {
    const modal = new ModalBuilder()
            .setCustomId('openTicket')
            .setTitle('Ouvrir un ticket')
            .addComponents(
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('question')
                        .setLabel('Expliquez en quelques mots votre demande.')
                        .setRequired(true)
                        .setMaxLength(70)
                        .setStyle(TextInputStyle.Short)
                )
            );

        await interaction.showModal(modal);
}