const { baseEmbed, emitLog } = require('../../../Utility/logging/helpers');
const { resolveActor, executorText } = require('../../../Utility/logging/audit');
const { trackSensitive } = require('../../../Utility/logging/tracker');

module.exports = async (Client, ban) => {
    const actor = await resolveActor(Client, ban.guild, 22, ban.user.id, 'ban'); // MemberBanAdd
    const reason = ban.reason ?? actor.reason;
    trackSensitive(Client, ban.guild, actor.executorId, 'ban', `Ban de ${ban.user.tag}`);
    emitLog(Client, 'moderation', baseEmbed({
        user: ban.user,
        title: '🔨 Bannissement',
        description:
            `**Cible :** <@${ban.user.id}> (\`${ban.user.id}\`)\n**Modérateur :** ${executorText(actor, Client)}\n` +
            `**Raison :** ${reason || '*aucune*'}\n` +
            (actor.context?.deleteMessageSeconds ? `**Messages supprimés :** dernières ${actor.context.deleteMessageSeconds / 3600} h\n` : '') +
            `**Compte créé :** <t:${Math.floor(ban.user.createdTimestamp / 1000)}:R>`
    }).setColor('c1121f'));
};
