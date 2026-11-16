const { ModalBuilder, ActionRowBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const { generateQuestionTitle } = require('../Utility/questionTitle');

module.exports = {
    name: 'Répondre à la question',
    type: 'message',
    run: async (Client, interaction) => {
        const suggested = await generateQuestionTitle(Client, interaction.targetMessage.content || '');

        const questionInput = new TextInputBuilder()
            .setCustomId('question')
            .setLabel('Question')
            .setRequired(true)
            .setMaxLength(100)
            .setStyle(TextInputStyle.Short);
        if (suggested) questionInput.setValue(suggested);

        const modal = new ModalBuilder()
            .setCustomId(`replyQuestion_${interaction.targetMessage.id}`) // L'ID du message cible est porté par le customId (non modifiable par le modérateur)
            .setTitle('Répondre à la question')
            .addComponents(
                new ActionRowBuilder().addComponents(
                    questionInput
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('reply')
                        .setLabel('Réponse')
                        .setMaxLength(2000)
                        .setRequired(true)
                        .setStyle(TextInputStyle.Paragraph)
                )
            );

        await interaction.showModal(modal);
    }
}