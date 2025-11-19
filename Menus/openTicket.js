const { EmbedBuilder, PermissionsBitField, ActionRowBuilder, ButtonBuilder, MessageFlags } = require('discord.js');
const ticketsConfig = require('../config/ticketsConfig');
const ticketsPermissions = require('../Utility/ticketsPermissions');
const ticketsLogger = require('../Utility/ticketsLogger');

module.exports = async (Client, interaction) => {
    await interaction.deferUpdate({ flags: MessageFlags.Ephemeral });

    try {
        const teamName = interaction.values[0];

        // Vérifier que l'utilisateur n'a pas déjà un ticket ouvert
        let existingTicket = await Client.Tickets.findOne({ where: { userID: interaction.user.id } });
        if (existingTicket) {
            return interaction.editReply({
                content: `:x: | Vous avez déjà un ticket ouvert : <#${existingTicket.channelID}>`,
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
        });

        // Logger
        ticketsLogger.logTicketCreate(ticket.id, interaction.user.id, teamName, ticketChannel.id);

        // Créer l'embed de bienvenue
        const ticketEmbed = new EmbedBuilder()
            .setDescription(`Merci de détailler votre demande, un membre de l'équipe ${teamName} va vous répondre dans les plus brefs délais.`)
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

        // Mentionner tous les rôles de l'équipe
        const rolesMentions = roleIDs.map(id => `<@&${id}>`).join(' ');
        const message = await ticketChannel.send({
            content: `${rolesMentions} - <@${interaction.user.id}>`,
            embeds: [ticketEmbed],
            components: [row]
        });

        await message.pin();

        await interaction.editReply({
            content: `✅ | Ticket ouvert dans <#${ticketChannel.id}>`,
            components: []
        });

    } catch (error) {
        ticketsLogger.logError('openTicket', error);

        await interaction.editReply({
            content: `:x: | Erreur lors de la création du ticket: ${error.message}`,
            components: []
        }).catch(() => {});
    }
}