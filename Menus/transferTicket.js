const { ChannelType, PermissionsBitField, EmbedBuilder, ActionRowBuilder, ButtonBuilder } = require('discord.js');

module.exports = async (Client, interaction) => {
    await interaction.deferUpdate({ ephemeral: true });
    let team = interaction.values;

    let ticket = await Client.Tickets.findOne({ where: { userID: interaction.user.id } });
    if (!ticket) {
        return interaction.editReply({
            content: `:x: | Erreur lors du transfert, merci de le signaler`
        });
    }

    const oldRole = await interaction.guild.roles.fetch(ticket.assignedRoleID);
    const newRole = await interaction.guild.roles.fetch(team);
    await ticket.update({
        assignedRoleID: newRole.id,
    });

    interaction.channel.permissionOverwrites.delete(oldRole);
    interaction.channel.permissionOverwrites.edit(newRole, {
        ViewChannel: true,
        ReadMessageHistory: true,
        SendMessages: false
    });


    let ticketEmbed = new EmbedBuilder()
        .setDescription(`Demande de transfert du ticket en cours, pour valider la demande merci de le prendre en charge ci-dessous.`)
        .setColor('9bd2d2')
        .setTimestamp();

    let row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('takeTicket')
            .setLabel('Prendre en charge')
            .setStyle(2),

        new ButtonBuilder()
            .setCustomId('transferTicket')
            .setLabel('Transférer')
            .setStyle(2),

        new ButtonBuilder()
            .setCustomId('closeTicket')
            .setLabel('Fermer le ticket')
            .setStyle(4),
    );

    let message = await interaction.channel.send({
        content: `<@&${newRole.id}>`,
        embeds: [ticketEmbed], components: [row]
    });

    const pins = await interaction.channel.messages.fetchPinned();
    pins.forEach((pin) => {
        pin.edit({
            components: [],
        });
        pin.unpin();
    });

    message.pin();

    interaction.editReply({
        embeds: [
            new EmbedBuilder()
                .setDescription(':white_check_mark: | Demande de transfert exécutée.')
        ], components: []
    });
}