const { openTicketForTeam } = require('../Utility/ticketsOpen');

// Bouton « Contacter l'équipe X » : l'identifiant est `openTicketTeam_<nom de l'équipe encodé>`
module.exports = (Client, interaction) => {
    const teamName = decodeURIComponent(interaction.customId.slice('openTicketTeam_'.length));
    return openTicketForTeam(Client, interaction, teamName);
};
