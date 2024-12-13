const { ModalBuilder, ActionRowBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');

module.exports = {
    name: 'Répondre à la question',
    type: 'message',
    run: async (Client, interaction) => {
        const modal = new ModalBuilder()
            .setCustomId('replyQuestion')
            .setTitle('Répondre à la question')
            .addComponents(
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('question')
                        .setLabel('Question')
                        .setRequired(true)
                        .setStyle(TextInputStyle.Short)
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('reply')
                        .setLabel('Réponse')
                        .setMaxLength(2000)
                        .setRequired(true)
                        .setStyle(TextInputStyle.Paragraph)
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('msgId')
                        .setLabel('NE PAS MODIFIER')
                        .setMinLength(19)
                        .setMaxLength(19)
                        .setRequired(true)
                        .setValue(interaction.targetMessage.id)
                        .setStyle(TextInputStyle.Short)
                )
            );

        await interaction.showModal(modal);
    }
}