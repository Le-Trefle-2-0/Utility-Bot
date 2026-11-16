const { baseEmbed, emitLog, tsFull } = require('../../../Utility/logging/helpers');

/** Acceptation du règlement / fin du filtrage des membres (pending passe à false). */
module.exports = async (Client, oldMember, newMember) => {
    if (oldMember.partial || !(oldMember.pending && !newMember.pending)) return;
    emitLog(Client, 'member', baseEmbed({
        user: newMember.user,
        title: '✅ Règlement accepté',
        description: `<@${newMember.id}> (\`${newMember.id}\`) a terminé le filtrage des membres (arrivé ${tsFull(newMember.joinedTimestamp)}).`
    }));
};
