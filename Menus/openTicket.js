const { ChannelType, PermissionsBitField, EmbedBuilder, ActionRowBuilder, ButtonBuilder } = require('discord.js');

module.exports = async (Client, interaction) => {
    await interaction.deferUpdate({ ephemeral: true });
    let team = interaction.values;

    let ticket = await Client.Tickets.findOne({ where: { userID: interaction.user.id } });
    if (ticket) {
        return interaction.editReply({
            content: `:x: | Vous avez déjà un ticket ouvert : <#${ticket.channelID}>`,
            components: []
        });
    }

    let mainGuild = Client.guilds.cache.get(process.env.MAIN_GUILD_ID);
    if (mainGuild) {
        let role = await mainGuild.roles.fetch(team);
        let parent = await mainGuild.channels.fetch(Client.settings.tickets.categoryID);

        let ticketChannel = await mainGuild.channels.create({
            name: `ticket-${interaction.user.displayName}`,
            parent,
            permissionOverwrites: [
                {
                    id: interaction.user.id,
                    allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory],
                },
                {
                    id: mainGuild.id,
                    deny: [PermissionsBitField.Flags.ViewChannel],
                },
                {
                    id: role,
                    allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.ReadMessageHistory],
                    deny: [PermissionsBitField.Flags.SendMessages],
                }
            ]
        });

        await Client.Tickets.create({
            userID: interaction.user.id,
            channelID: ticketChannel.id,
            assignedRoleID: role.id,
        });

        let ticketEmbed = new EmbedBuilder()
            .setDescription(`Merci de détailler votre demande, un membre de l'équipe ${role.name} va vous répondre dans les plus brefs délais.`)
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

        let message = await ticketChannel.send({
            content: `<@&${role.id}> - <@${interaction.user.id}>`,
            embeds: [ticketEmbed], components: [row]
        });

        message.pin();

        interaction.editReply({
            content: `Ticket ouvert dans <#${ticketChannel.id}>`,
            components: []
        });
    }
}