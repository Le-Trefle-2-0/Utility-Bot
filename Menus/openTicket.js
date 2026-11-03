const { openTicketForTeam } = require('../Utility/ticketsOpen');

module.exports = (Client, interaction) => openTicketForTeam(Client, interaction, interaction.values[0]);
