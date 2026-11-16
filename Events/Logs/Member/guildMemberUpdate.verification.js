const { handleVerified } = require('../../../Utility/memberVerification');

/**
 * Règlement validé : rôle membre + message de bienvenue public.
 * Ne dépend pas de l'ancien état du membre (absent du cache quand la validation arrive plusieurs jours
 * après l'arrivée) : tout membre qui a validé sans avoir le rôle est pris en charge.
 */
module.exports = async (Client, oldMember, newMember) => {
    if (newMember.pending !== false) return;
    await handleVerified(Client, newMember, { transition: oldMember.pending === true });
};
