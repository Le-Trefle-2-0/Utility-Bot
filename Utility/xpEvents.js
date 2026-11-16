const { Op } = require('sequelize');

const SERVER_WIDE = '*';

/**
 * Multiplicateur d'XP en vigueur pour un salon (1 s'il n'y a aucun évènement).
 * Un évènement sur tout le serveur et un évènement sur le salon ne se cumulent pas : on prend le plus élevé.
 */
async function getMultiplier(Client, guildID, channel) {
    const channelIDs = [SERVER_WIDE, channel.id];
    if (channel.parentId) channelIDs.push(channel.parentId); // fils : l'évènement du salon parent s'applique

    const events = await Client.XpEvents.findAll({
        where: { guildID, channelID: { [Op.in]: channelIDs }, endsAt: { [Op.gt]: new Date() } },
        raw: true
    });
    return events.reduce((max, e) => Math.max(max, e.multiplier), 1);
}

/** Supprime les évènements terminés (appelé à la consultation pour garder la table propre). */
function purgeExpired(Client) {
    return Client.XpEvents.destroy({ where: { endsAt: { [Op.lte]: new Date() } } });
}

module.exports = { SERVER_WIDE, getMultiplier, purgeExpired };
