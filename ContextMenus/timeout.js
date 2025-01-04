const { ModalBuilder, ActionRowBuilder, TextInputBuilder, TextInputStyle, MessageFlags } = require('discord.js');

module.exports = {
    name: '🔇 Timeout',
    type: 'user',
    run: async (Client, interaction) => {
        let previousTimeout = await Client.Timeouts.findOne({ where: { userID: interaction.targetUser.id, guildID: interaction.guild.id } });
        if (previousTimeout) return interaction.reply({ content: ':x: Cet utilisateur est déjà exclu temporairement', flags: MessageFlags.Ephemeral });
        const modal = new ModalBuilder()
            .setCustomId('timeout')
            .setTitle('Exclusion temporaire')
            .addComponents(
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('reason')
                        .setLabel('Motif d\'exclusion')
                        .setRequired(true)
                        .setStyle(TextInputStyle.Short)
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('duration')
                        .setLabel('Durée (format: 1d2h3m4s)')
                        .setMaxLength(9)
                        .setRequired(true)
                        .setStyle(TextInputStyle.Short)
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('userId')
                        .setLabel('NE PAS MODIFIER')
                        .setMinLength(18)
                        .setMaxLength(18)
                        .setRequired(true)
                        .setValue(interaction.targetUser.id)
                        .setStyle(TextInputStyle.Short)
                )
            );

        await interaction.showModal(modal);
    }
}