const { MessageFlags, PermissionsBitField, EmbedBuilder } = require('discord.js');

module.exports = {
    description: 'Ajouter une note de modération à un utilisateur',
    options: [
        {
            name: 'utilisateur',
            description: 'Utilisateur',
            type: 'user',
            required: true
        },
        {
            name: 'raison',
            description: 'Contenu de la note',
            type: 'string',
            required: true
        }
    ],
    guilds: [process.env.MAIN_GUILD_ID],
    run: async (Client, interaction) => {
        try {
            let member = interaction.options.getMember('utilisateur');
            let reason = interaction.options.getString('raison');

            if (!interaction.member.permissions.has(PermissionsBitField.Flags.KickMembers)) {
                return interaction.reply({ content: ':x: | Vous n\'avez pas la permission de faire cela.', flags: MessageFlags.Ephemeral });
            }

            if (!member) {
                return interaction.reply({ content: ':x: | Utilisateur introuvable sur ce serveur.', flags: MessageFlags.Ephemeral });
            }

            if (member.id === interaction.user.id) {
                return interaction.reply({ content: ':x: | Vous ne pouvez pas ajouter une note pour vous-même.', flags: MessageFlags.Ephemeral });
            }

            if (interaction.guild.ownerId === member.id) {
                return interaction.reply({ content: ':x: | Vous ne pouvez pas agir sur le propriétaire du serveur.', flags: MessageFlags.Ephemeral });
            }

            const position = interaction.member.roles.highest.comparePositionTo(member.roles.highest);
            if (position <= 0 && interaction.guild.ownerId !== interaction.user.id) {
                return interaction.reply({ content: ':x: | Vous ne pouvez pas agir sur un utilisateur ayant un rôle supérieur ou égal au vôtre.', flags: MessageFlags.Ephemeral });
            }

            if (!reason || reason.trim().length === 0) {
                return interaction.reply({ content: ':x: | Merci d\'indiquer une raison/description pour la note.', flags: MessageFlags.Ephemeral });
            }

            await Client.ModLogs.create({
                userID: member.id,
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
                        .setDescription(`:white_check_mark: Note de modération ajoutée pour ${member}.`)
                ],
                flags: MessageFlags.Ephemeral
            });
        } catch (e) {
            Client.log.error(e);
            return interaction.reply({ content: ':x: | Une erreur est survenue.', flags: MessageFlags.Ephemeral }).catch(() => {});
        }
    }
}
