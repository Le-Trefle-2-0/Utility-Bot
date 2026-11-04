const { baseEmbed, emitLog, tsFull, duration } = require('../../../Utility/logging/helpers');

/** Début / fin d'un boost de serveur (premiumSince). */
module.exports = async (Client, oldMember, newMember) => {
    if (oldMember.partial || oldMember.premiumSinceTimestamp === newMember.premiumSinceTimestamp) return;

    const started = !oldMember.premiumSinceTimestamp && newMember.premiumSinceTimestamp;
    const ended = oldMember.premiumSinceTimestamp && !newMember.premiumSinceTimestamp;
    if (!started && !ended) return;

    emitLog(Client, 'member', baseEmbed({
        user: newMember.user,
        title: started ? '🚀 Nouveau boost du serveur' : '💔 Fin d\'un boost du serveur',
        description: started
            ? `<@${newMember.id}> (\`${newMember.id}\`) booste le serveur depuis ${tsFull(newMember.premiumSinceTimestamp)}.\n🏆 **Niveau actuel :** ${newMember.guild.premiumTier} — **boosts :** ${newMember.guild.premiumSubscriptionCount ?? 0}`
            : `<@${newMember.id}> (\`${newMember.id}\`) ne booste plus le serveur (boost expiré ou retiré).\n⏱️ **Durée du boost :** ${duration(Date.now() - oldMember.premiumSinceTimestamp)}\n🏆 **Niveau actuel :** ${newMember.guild.premiumTier} — **boosts :** ${newMember.guild.premiumSubscriptionCount ?? 0}`
    }).setColor(started ? 'f47fff' : '8a8a8a'));
};
