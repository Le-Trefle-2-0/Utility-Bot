/**
 * Ouverture d'un ticket par un membre pour l'équipe choisie.
 * Utilisé par le menu de sélection d'équipe et par le bouton « Contacter l'équipe recommandée ».
 */

const { EmbedBuilder, PermissionsBitField, MessageFlags } = require('discord.js');
const ticketsConfig = require('../config/ticketsConfig');
const ticketsLogger = require('./ticketsLogger');
const { ticketRow } = require('./ticketsComponents');

/**
 * @param {Interaction} interaction - bouton ou menu situé sur le message éphémère de choix de l'équipe
 * @param {string} teamName - nom de l'équipe choisie
 */
const openTicketForTeam = async (Client, interaction, teamName) => {
    await interaction.deferUpdate({ flags: MessageFlags.Ephemeral });

    try {
        // Vérifier que l'utilisateur n'a pas déjà un ticket ouvert
        let existingTicket = await Client.Tickets.findOne({ where: { userID: interaction.user.id } });
        if (existingTicket) {
            return interaction.editReply({
                content: `:x: | Vous avez déjà un ticket ouvert : <#${existingTicket.channelID}>`,
                embeds: [],
                components: []
            });
        }

        // Récupérer l'équipe
        const team = ticketsConfig.getAllTeams().find(t => t.name === teamName);
        if (!team) {
            throw new Error(`Team ${teamName} not found in configuration`);
        }

        // Récupérer le serveur principal
        const mainGuild = Client.guilds.cache.get(process.env.MAIN_GUILD_ID);
        if (!mainGuild) {
            throw new Error('Main guild not found');
        }

        // Valider que tous les rôles de l'équipe existent
        const roleIDs = [];
        for (const roleID of team.roleIDs) {
            try {
                const role = await mainGuild.roles.fetch(roleID);
                if (!role) {
                    throw new Error(`Role ${roleID} doesn't exist`);
                }
                roleIDs.push(roleID);
            } catch (error) {
                throw new Error(`Role ${roleID} not found on Discord`);
            }
        }

        // Récupérer la catégorie
        const categoryID = ticketsConfig.getCategoryID();
        if (!categoryID) {
            throw new Error('Tickets category ID not configured');
        }

        let parent;
        try {
            parent = await mainGuild.channels.fetch(categoryID);
        } catch (error) {
            throw new Error(`Tickets category ${categoryID} not found on Discord`);
        }

        if (!parent) {
            throw new Error(`Tickets category ${categoryID} doesn't exist`);
        }

        // Créer les permissions avec tous les rôles de l'équipe
        const permissions = [
            {
                id: interaction.user.id,
                allow: [
                    PermissionsBitField.Flags.ViewChannel,
                    PermissionsBitField.Flags.SendMessages,
                    PermissionsBitField.Flags.ReadMessageHistory
                ],
            },
            {
                id: mainGuild.id,
                deny: [PermissionsBitField.Flags.ViewChannel],
            }
        ];

        // Ajouter les permissions pour chaque rôle de l'équipe
        for (const roleID of roleIDs) {
            permissions.push({
                id: roleID,
                allow: [
                    PermissionsBitField.Flags.ViewChannel,
                    PermissionsBitField.Flags.ReadMessageHistory
                ],
                deny: [PermissionsBitField.Flags.SendMessages],
            });
        }

        const ticketChannel = await mainGuild.channels.create({
            name: `ticket-${interaction.user.displayName}`,
            parent,
            permissionOverwrites: permissions
        });

        // Enregistrer en base de données
        const ticket = await Client.Tickets.create({
            userID: interaction.user.id,
            channelID: ticketChannel.id,
            assignedTeam: teamName,
            waitingSince: new Date()
        });

        // Logger
        ticketsLogger.logTicketCreate(ticket.id, interaction.user.id, teamName, ticketChannel.id);

        // Créer l'embed de bienvenue
        const ticketEmbed = new EmbedBuilder()
            .setDescription(`Merci de détailler votre demande, un membre de l'équipe ${teamName} va vous répondre dans les plus brefs délais.`)
            .setColor('9bd2d2')
            .setTimestamp();

        // Mentionner tous les rôles de l'équipe
        const rolesMentions = roleIDs.map(id => `<@&${id}>`).join(' ');
        const message = await ticketChannel.send({
            content: `${rolesMentions} - <@${interaction.user.id}>`,
            embeds: [ticketEmbed],
            components: [ticketRow()]
        });

        await message.pin();

        await interaction.editReply({
            content: `✅ | Ticket ouvert dans <#${ticketChannel.id}>`,
            embeds: [],
            components: []
        });

    } catch (error) {
        ticketsLogger.logError('openTicket', error);

        await interaction.editReply({
            content: `:x: | Erreur lors de la création du ticket: ${error.message}`,
            embeds: [],
            components: []
        }).catch(() => {});
    }
};

module.exports = { openTicketForTeam };
