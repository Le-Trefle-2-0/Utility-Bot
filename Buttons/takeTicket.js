const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, MessageFlags} = require('discord.js');

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
                .setDescription(':x: | Erreur lors de la prise en charge, merci de le signaler.')
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

    interaction.channel.permissionOverwrites.edit(assignedRole, {
        SendMessages: false,
    });

    interaction.channel.permissionOverwrites.create(interaction.member, {
        ViewChannel: true,
        SendMessages: true,
        ReadMessageHistory: true,
    });

    interaction.channel.send({
        embeds: [
            new EmbedBuilder()
                .setDescription(`ℹ️ - Ce ticket est maintenant pris en charge par <@${interaction.user.id}>`)
                .setColor('9bd2d2')
        ]
    });

    let row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('takeTicket')
            .setLabel('Prendre en charge')
            .setStyle(2)
            .setDisabled(true),

        new ButtonBuilder()
            .setCustomId('transferTicket')
            .setLabel('Transférer')
            .setStyle(2),

        new ButtonBuilder()
            .setCustomId('closeTicket')
            .setLabel('Fermer le ticket')
            .setStyle(4),
    );

    interaction.message.edit({ components: [row] });
    interaction.editReply({
        embeds: [
            new EmbedBuilder()
                .setDescription(':white_check_mark: | La prise en charge à bien été validée.')
                .setColor('9bd2d2')
        ]
    })
}