const { ActionRowBuilder, ButtonBuilder } = require('discord.js');

/**
 * Boutons d'un ticket (prise en charge, transfert, fermeture)
 * @param {boolean} takeDisabled - true lorsque le ticket est déjà pris en charge
 */
const ticketRow = ({ takeDisabled = false } = {}) => new ActionRowBuilder().addComponents(
    new ButtonBuilder()
        .setCustomId('takeTicket')
        .setLabel('Prendre en charge')
        .setStyle(2)
        .setDisabled(takeDisabled),
    new ButtonBuilder()
        .setCustomId('transferTicket')
        .setLabel('Transférer')
        .setStyle(2),
    new ButtonBuilder()
        .setCustomId('closeTicket')
        .setLabel('Fermer le ticket')
        .setStyle(4)
);

module.exports = { ticketRow };
