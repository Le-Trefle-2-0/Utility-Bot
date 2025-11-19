const { MessageFlags, PermissionsBitField, EmbedBuilder } = require('discord.js');

module.exports = async (Client, interaction) => {
    try {
        // Security: ensure only the intended modal is handled here
        if (interaction.customId !== 'addNote') return;

        const note = interaction.fields.getTextInputValue('note');
        const userId = interaction.fields.getTextInputValue('userId');

        if (!interaction.member.permissions.has(PermissionsBitField.Flags.KickMembers)) {
            return interaction.reply({ content: ':x: | Vous n\'avez pas la permission de faire cela.', flags: MessageFlags.Ephemeral });
        }

        const targetMember = await interaction.guild.members.fetch(userId).catch(() => null);
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

        const reason = (note || '').trim();
        if (!reason) {
            return interaction.reply({ content: ':x: | Merci d\'indiquer une raison/description pour la note.', flags: MessageFlags.Ephemeral });
        }

        await Client.ModLogs.create({
            userID: targetMember.id,
            guildID: interaction.guild.id,
            moderatorID: interaction.user.id,
            reason: reason.slice(0, 1000),
            timestamp: Date.now(),
            type: 'Note'
        });

        return interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor('9bd2d2')
                    .setDescription(`:white_check_mark: Note de modération ajoutée pour ${targetMember}.`)
            ],
            flags: MessageFlags.Ephemeral
        });
    } catch (e) {
        Client.log.error(e);
        return interaction.reply({ content: ':x: | Une erreur est survenue.', flags: MessageFlags.Ephemeral }).catch(() => {});
    }
}
