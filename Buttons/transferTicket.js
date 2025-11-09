const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, MessageFlags } = require('discord.js');
const ticketsConfig = require('../config/ticketsConfig');

module.exports = async (Client, interaction) => {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
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
        const currentTeamRoles = ticketsConfig.getTeamRoles(ticket.assignedTeam);
        const hasTeamRole = currentTeamRoles.some(roleID => interaction.member.roles.cache.has(roleID));

        if (!hasTeamRole) {
            return interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setDescription(`:x: | Vous n'avez pas les rôles requis pour transférer ce ticket.`)
                        .setColor('Red')
                ]
            });
        }

        // Créer le menu de sélection des équipes (sauf celle actuelle)
        const selector = new StringSelectMenuBuilder()
            .setCustomId('transferTicket')
            .setPlaceholder('Sélectionnez l\'équipe de destination');

        const options = [];
        const allTeams = ticketsConfig.getAllTeams();

        for (const team of allTeams) {
            if (team.name !== ticket.assignedTeam) {
                const option = new StringSelectMenuOptionBuilder()
                    .setLabel(team.name)
                    .setValue(team.name)
                    .setDescription(`Transférer à l'équipe de ${team.name}`);

                if (team.emojiID) {
                    option.setEmoji(team.emojiID);
                }

                options.push(option);
            }
        }

        if (options.length === 0) {
            return interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setDescription(':x: | Aucune autre équipe disponible pour le transfert.')
                        .setColor('Red')
                ]
            });
        }

        selector.addOptions(options);
        const row = new ActionRowBuilder().addComponents(selector);

        interaction.editReply({
            embeds: [
                new EmbedBuilder()
                    .setDescription('📨 | Vers quelle équipe souhaitez-vous transférer ce ticket ?')
                    .setColor('9bd2d2')
            ],
            components: [row]
        });

    } catch (error) {
        console.error('Error in transferTicket button:', error);
        interaction.editReply({
            embeds: [
                new EmbedBuilder()
                    .setDescription(`:x: | Erreur: ${error.message}`)
                    .setColor('Red')
            ]
        });
    }
}