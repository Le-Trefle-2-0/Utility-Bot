const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, MessageFlags } = require('discord.js');
const ticketsConfig = require('../config/ticketsConfig');
const ticketsPermissions = require('../Utility/ticketsPermissions');
const ticketsLogger = require('../Utility/ticketsLogger');

module.exports = async (Client, interaction) => {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
        // Vérifier que c'est un ticket valide
        const ticket = await Client.Tickets.findOne({
            where: { channelID: interaction.channel.id }
        });

        if (!ticket) {
            return interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setDescription(':x: | Il semblerait que ce salon ne soit pas un ticket.')
                        .setColor('Red')
                ]
            });
        }

        // Vérifier que l'utilisateur a un rôle de l'équipe assignée
        const teamRoles = ticketsConfig.getTeamRoles(ticket.assignedTeam);
        const hasTeamRole = teamRoles.some(roleID => interaction.member.roles.cache.has(roleID));

        if (!hasTeamRole) {
            return interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setDescription(`:x: | Vous n'avez pas les rôles requis pour cette équipe (${ticket.assignedTeam}).`)
                        .setColor('Red')
                ]
            });
        }

        // Retirer les permissions d'envoi de tous les rôles de l'équipe
        for (const roleID of teamRoles) {
            const role = interaction.guild.roles.cache.get(roleID);
            if (role) {
                await ticketsPermissions.removeRoleSendPermissions(interaction.channel, role);
            }
        }

        // Ajouter les permissions au staff
        await ticketsPermissions.addStaffPermissions(interaction.channel, interaction.member);

        // Envoyer le message de notification
        await interaction.channel.send({
            embeds: [
                new EmbedBuilder()
                    .setDescription(`ℹ️ - Ce ticket est maintenant pris en charge par <@${interaction.user.id}>`)
                    .setColor('9bd2d2')
            ]
        });

        // Logger
        ticketsLogger.logTicketTake(ticket.id, interaction.user.id, ticket.assignedTeam);

        // Mettre à jour les boutons
        const row = new ActionRowBuilder().addComponents(
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
                .setStyle(4)
        );

        await interaction.message.edit({ components: [row] });
        await interaction.editReply({
            embeds: [
                new EmbedBuilder()
                    .setDescription(':white_check_mark: | La prise en charge a bien été validée.')
                    .setColor('9bd2d2')
            ]
        });

    } catch (error) {
        ticketsLogger.logError('takeTicket', error);

        await interaction.editReply({
            embeds: [
                new EmbedBuilder()
                    .setDescription(`:x: | Erreur lors de la prise en charge: ${error.message}`)
                    .setColor('Red')
            ]
        });
    }
}