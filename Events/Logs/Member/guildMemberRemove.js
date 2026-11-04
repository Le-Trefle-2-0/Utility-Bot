const { baseEmbed, emitLog, tsFull, duration, roleRef, ts } = require('../../../Utility/logging/helpers');
const { fetchEntry } = require('../../../Utility/logging/audit');
const { getHistory, recordLeave } = require('../../../Utility/logging/memberIntel');

const KICK = 20;
const BAN = 22;

module.exports = async (Client, member) => {
    // Rôles : cache du membre, sinon derniers rôles connus
    let roleIDs = member.partial ? [] : member.roles.cache.filter(role => role.id !== member.guild.id).sort((a, b) => b.position - a.position).map(role => role.id);
    if (!roleIDs.length) {
        const history = await getHistory(Client, member.id, member.guild.id);
        try { roleIDs = JSON.parse(history?.lastRoles || '[]'); } catch { roleIDs = []; }
    }
    const joinedAt = member.joinedTimestamp ?? (await getHistory(Client, member.id, member.guild.id))?.lastJoinedAt?.getTime?.();

    const entry = await fetchEntry(member.guild, undefined, { targetId: member.id, maxAge: 10000, match: e => e.action === KICK || e.action === BAN });
    const kicked = entry?.action === KICK;
    const banned = entry?.action === BAN;

    const user = member.user;
    emitLog(Client, 'member', baseEmbed({
        user,
        title: banned ? '🔨 Membre banni (départ)' : kicked ? '👢 Membre expulsé (départ)' : '📤 Membre parti',
        description:
            `👤 **Membre :** <@${member.id}> (\`${member.id}\`)\n` +
            `⏱️ **Temps passé sur le serveur :** ${joinedAt ? `${duration(Date.now() - joinedAt)} (arrivé ${ts(joinedAt, 'f')})` : 'inconnu'}\n` +
            `🎭 **Rôles :** ${roleIDs.length ? roleIDs.map(roleRef).join(' ') : 'aucun'}` +
            (entry ? `\n🛡️ **Par :** <@${entry.executorId}>${entry.reason ? `\n📝 **Raison :** ${entry.reason}` : ''}` : '')
    }).setColor(banned || kicked ? 'c1121f' : 'b30000'));

    // Expulsion : dans le journal de modération (aucun événement dédié chez Discord)
    if (kicked) {
        emitLog(Client, 'moderation', baseEmbed({
            user,
            title: '👢 Expulsion',
            description:
                `**Cible :** <@${member.id}> (\`${member.id}\`)\n` +
                `**Modérateur :** <@${entry.executorId}> (\`${entry.executorId}\`)\n` +
                `**Raison :** ${entry.reason || '*aucune*'}`
        }));
    }

    await recordLeave(Client, member).catch(() => null);
};
