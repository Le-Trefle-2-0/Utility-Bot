const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder,
    MessageFlags
} = require('discord.js');

module.exports = async (Client, interaction) => {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const ticket = await Client.Tickets.findOne({
        where: {
            channelID: interaction.channel.id
        }
    });

    if (!ticket) return interaction.editReply({
        embeds: [
            new EmbedBuilder()
                .setDescription(':x: | Il semblerait que ce salon ne soit pas un ticket.')
        ]
    });

    let assignedRole = interaction.guild.roles.cache.get(ticket.assignedRoleID);

    if (!assignedRole) return interaction.editReply({
        embeds: [
            new EmbedBuilder()
                .setDescription(':x: | Erreur lors de la demande de transfert, merci de le signaler.')
                .setColor('Red')
        ]
    });

    if (!interaction.member.roles.cache.has(ticket.assignedRoleID)) return interaction.editReply({
        embeds: [
            new EmbedBuilder()
                .setDescription(':x: | Votre rôle ne permet pas d\'effectuer cette action.')
                .setColor('Red')
        ]
    });

    let selector = new StringSelectMenuBuilder()
        .setCustomId('transferTicket')
        .setPlaceholder('Sélectionnez une option');

    let options = [];
    for (let role of Client.settings.tickets.roles) {
        if (role.roleID !== ticket.assignedRoleID) {
            options.push(
                new StringSelectMenuOptionBuilder()
                    .setLabel(role.name)
                    .setValue(role.roleID)
                    .setDescription(`Transférer à l'équipe de ${role.name}`)
                    .setEmoji(role.emojiID)
            )
        }
    }

    selector.addOptions(options);

    let row = new ActionRowBuilder().addComponents(selector)

    interaction.editReply({
        embeds: [
            new EmbedBuilder()
                .setDescription('📨 | Vers quelle équipe souhaitez-vous transférer ce ticket ?')
                .setColor('9bd2d2')
        ], components: [row]
    })
}