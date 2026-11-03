const ticketsLogger = require('../Utility/ticketsLogger');
const ticketsConfig = require('../config/ticketsConfig');
const { closeTicket } = require('../Utility/ticketsClose');

module.exports = async (Client, interaction) => {
    await interaction.deferReply();

    try {
        // Vérifier que c'est un ticket valide
        const ticket = await Client.Tickets.findOne({ where: { channelID: interaction.channel.id } });
        if (!ticket) {
            return interaction.editReply({
                content: `:x: | Ce salon n'est pas un ticket.`
            });
        }

        // Vérifier les permissions
        const teamRoles = ticketsConfig.getTeamRoles(ticket.assignedTeam);
        const hasTeamRole = teamRoles.some(roleID => interaction.member.roles.cache.has(roleID));
        const hasPermission = hasTeamRole || ticket.userID === interaction.user.id;

        if (!hasPermission) {
            return interaction.editReply({
                content: ':x: | Vous n\'avez pas les permissions pour fermer ce ticket.'
            });
        }

        await closeTicket(Client, ticket, {
            guild: interaction.guild,
            channel: interaction.channel,
            closedBy: interaction.user.id,
            // Répondre dès que le salon est verrouillé, sans attendre le transcript
            onLocked: ({ deleteAt }) => interaction.editReply({
                content: `:white_check_mark: | Ticket fermé et verrouillé. Le salon sera supprimé <t:${Math.floor(deleteAt.getTime() / 1000)}:R>.`
            })
        });
    } catch (error) {
        ticketsLogger.logError('closeTicket', error);

        try {
            await interaction.editReply({
                content: `:x: | Erreur lors de la fermeture du ticket: ${error.message}`
            });
        } catch (replyError) {
            console.error('Failed to send error reply:', replyError);
        }
    }
}
