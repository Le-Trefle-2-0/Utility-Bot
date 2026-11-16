const { baseEmbed, emitLog, tsFull, duration } = require('../../../Utility/logging/helpers');
const { resolveActor, executorText } = require('../../../Utility/logging/audit');
const { scheduleExpiry, cancelExpiry } = require('../../../Utility/logging/timeouts');

/** Début, prolongation ou retrait d'un timeout (communicationDisabledUntil). */
module.exports = async (Client, oldMember, newMember) => {
    if (oldMember.partial) return;
    const before = oldMember.communicationDisabledUntilTimestamp;
    const after = newMember.communicationDisabledUntilTimestamp;
    if (before === after) return;

    const wasActive = before && before > Date.now() - 2000;
    const isActive = after && after > Date.now();
    if (!isActive && !wasActive) return;

    const actor = await resolveActor(Client, newMember.guild, 24, newMember.id, isActive ? 'timeout' : 'untimeout', {
        match: e => e.changes?.some(c => c.key === 'communication_disabled_until')
    });

    if (isActive) {
        scheduleExpiry(Client, newMember);
        emitLog(Client, 'moderation', baseEmbed({
            user: newMember.user,
            title: wasActive ? '🔇 Timeout modifié' : '🔇 Timeout',
            description:
                `**Cible :** <@${newMember.id}> (\`${newMember.id}\`)\n` +
                `**Modérateur :** ${executorText(actor, Client)}\n` +
                `**Durée :** ${duration(after - Date.now())} (fin ${tsFull(after)})\n` +
                `**Raison :** ${actor.reason || '*aucune*'}`
        }));
    } else {
        cancelExpiry(newMember);
        emitLog(Client, 'moderation', baseEmbed({
            user: newMember.user,
            title: '🔊 Timeout retiré',
            description:
                `Le timeout de <@${newMember.id}> (\`${newMember.id}\`) a été levé avant son terme.\n` +
                `**Par :** ${executorText(actor, Client)}\n**Raison :** ${actor.reason || '*aucune*'}`
        }).setColor('2e7d32'));
    }
};
