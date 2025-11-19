const { ModalBuilder, ActionRowBuilder, TextInputBuilder, TextInputStyle, MessageFlags, PermissionsBitField } = require('discord.js');

module.exports = {
    name: '📝 Ajouter une note',
    type: 'user',
    run: async (Client, interaction) => {
        try {
            if (!interaction.member.permissions.has(PermissionsBitField.Flags.KickMembers)) {
                return interaction.reply({ content: ':x: | Vous n\'avez pas la permission de faire cela.', flags: MessageFlags.Ephemeral });
            }

            const targetMember = await interaction.guild.members.fetch(interaction.targetUser.id).catch(() => null);
            if (!targetMember) {
                return interaction.reply({ content: ':x: | Utilisateur introuvable sur ce serveur.', flags: MessageFlags.Ephemeral });
            }

            if (interaction.user.id === targetMember.id) {
                return interaction.reply({ content: ':x: | Vous ne pouvez pas ajouter une note pour vous-même.', flags: MessageFlags.Ephemeral });
            }

            if (interaction.guild.ownerId === targetMember.id) {
                return interaction.reply({ content: ':x: | Vous ne pouvez pas agir sur le propriétaire du serveur.', flags: MessageFlags.Ephemeral });
            }

            const position = interaction.member.roles.highest.comparePositionTo(targetMember.roles.highest);
            if (position <= 0 && interaction.guild.ownerId !== interaction.user.id) {
                return interaction.reply({ content: ':x: | Vous ne pouvez pas agir sur un utilisateur ayant un rôle supérieur ou égal au vôtre.', flags: MessageFlags.Ephemeral });
            }

            const modal = new ModalBuilder()
                .setCustomId('addNote')
                .setTitle('Ajouter une note de modération')
                .addComponents(
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId('note')
                            .setLabel('Contenu de la note')
                            .setRequired(true)
                            .setStyle(TextInputStyle.Paragraph)
                    ),
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId('userId')
                            .setLabel('NE PAS MODIFIER')
                            .setMinLength(18)
                            .setMaxLength(19)
                            .setRequired(true)
                            .setValue(interaction.targetUser.id)
                            .setStyle(TextInputStyle.Short)
                    )
                );

            await interaction.showModal(modal);
        } catch (e) {
            Client.log.error(e);
            return interaction.reply({ content: ':x: | Une erreur est survenue.', flags: MessageFlags.Ephemeral }).catch(() => {});
        }
    }
}
