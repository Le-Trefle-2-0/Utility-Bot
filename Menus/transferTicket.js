const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, MessageFlags } = require('discord.js');
const ticketsConfig = require('../config/ticketsConfig');
const ticketsPermissions = require('../Utility/ticketsPermissions');
const ticketsLogger = require('../Utility/ticketsLogger');

module.exports = async (Client, interaction) => {
    await interaction.deferUpdate({ flags: MessageFlags.Ephemeral });

    try {
        const newTeamName = interaction.values[0];

        const ticket = await Client.Tickets.findOne({ where: { channelID: interaction.channel.id } });
        if (!ticket) {
            return interaction.editReply({
                content: `:x: | Erreur lors du transfert, merci de le signaler`
            });
        }

        // Récupérer les équipes
        const oldTeam = ticketsConfig.getAllTeams().find(t => t.name === ticket.assignedTeam);
        const newTeam = ticketsConfig.getAllTeams().find(t => t.name === newTeamName);

        if (!oldTeam || !newTeam) {
            throw new Error('Team not found in configuration');
        }

        // Supprimer les permissions de l'ancienne équipe
        for (const oldRoleID of oldTeam.roleIDs) {
            const oldRole = await interaction.guild.roles.fetch(oldRoleID);
            if (oldRole) {
                await interaction.channel.permissionOverwrites.delete(oldRole);
            }
        }

        // Ajouter les permissions de la nouvelle équipe
        for (const newRoleID of newTeam.roleIDs) {
            const newRole = await interaction.guild.roles.fetch(newRoleID);
            if (newRole) {
                await interaction.channel.permissionOverwrites.create(newRole, {
                    allow: [
                        require('discord.js').PermissionsBitField.Flags.ViewChannel,
                        require('discord.js').PermissionsBitField.Flags.ReadMessageHistory
                    ],
                    deny: [require('discord.js').PermissionsBitField.Flags.SendMessages]
                });
            }
        }

        // Mettre à jour la BD
        await ticket.update({
            assignedTeam: newTeamName,
        });

        // Logger
        ticketsLogger.logTicketTransfer(ticket.id, ticket.assignedTeam, newTeamName, interaction.user.id);

        // Créer le message de notification
        const ticketEmbed = new EmbedBuilder()
            .setDescription(`Demande de transfert du ticket en cours, pour valider la demande merci de le prendre en charge ci-dessous.`)
            .setColor('9bd2d2')
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
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
                .setStyle(4)
        );

        // Mentionner tous les rôles de la nouvelle équipe
        const rolesMentions = newTeam.roleIDs.map(id => `<@&${id}>`).join(' ');
        const message = await interaction.channel.send({
            content: `${rolesMentions}`,
            embeds: [ticketEmbed],
            components: [row]
        });

        // Supprimer l'ancien message épinglé
        const pins = await interaction.channel.messages.fetchPinned();
        for (const pin of pins.values()) {
            await pin.edit({
                components: [],
            });
            await pin.unpin();
        }

        // Épingler le nouveau message
        await message.pin();

        await interaction.editReply({
            embeds: [
                new EmbedBuilder()
                    .setDescription(':white_check_mark: | Demande de transfert exécutée.')
            ],
            components: []
        });

    } catch (error) {
        ticketsLogger.logError('transferTicket', error);

        await interaction.editReply({
            content: `:x: | Erreur lors du transfert: ${error.message}`
        }).catch(() => {});
    }
}