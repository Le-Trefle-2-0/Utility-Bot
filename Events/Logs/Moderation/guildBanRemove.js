const { baseEmbed, emitLog } = require('../../../Utility/logging/helpers');
const { resolveActor, executorText } = require('../../../Utility/logging/audit');

module.exports = async (Client, ban) => {
    const actor = await resolveActor(Client, ban.guild, 23, ban.user.id, 'unban'); // MemberBanRemove
    emitLog(Client, 'moderation', baseEmbed({
        user: ban.user,
        title: '♻️ Débannissement',
        description:
            `**Cible :** <@${ban.user.id}> (\`${ban.user.id}\`)\n**Modérateur :** ${executorText(actor, Client)}\n` +
            `**Raison :** ${actor.reason || ban.reason || '*aucune*'}`
    }).setColor('2e7d32'));
};
