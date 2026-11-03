const ticketsLogger = require('../Utility/ticketsLogger');
const { closeTicket } = require('../Utility/ticketsClose');
const { releaseTicket } = require('../Utility/ticketsMaintenance');

/**
 * Un membre quitte le serveur :
 *  - son ticket ouvert est fermé automatiquement ;
 *  - les tickets qu'il avait pris en charge retournent en attente de l'équipe.
 */
module.exports = async (Client, member) => {
    if (!Client.Tickets || !Client.TicketDeletions) return;

    try {
        const ownTicket = await Client.Tickets.findOne({ where: { userID: member.id } });
        if (ownTicket) {
            const channel = await member.guild.channels.fetch(ownTicket.channelID).catch(() => null);
            await closeTicket(Client, ownTicket, {
                guild: member.guild,
                channel,
                reason: 'le membre a quitté le serveur'
            });
        }

        const handledTickets = await Client.Tickets.findAll({ where: { takenBy: member.id } });
        for (const ticket of handledTickets) {
            const channel = await member.guild.channels.fetch(ticket.channelID).catch(() => null);
            await releaseTicket(Client, ticket, channel);
        }
    } catch (error) {
        ticketsLogger.logError('guildMemberRemove', error);
    }
};
