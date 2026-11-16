const { baseEmbed, emitLog, roleRef, permName, MODERATION_PERMISSIONS } = require('../../../Utility/logging/helpers');
const { fetchEntry, executorText } = require('../../../Utility/logging/audit');

module.exports = async (Client, oldMember, newMember) => {
    if (oldMember.partial) return;
    const added = newMember.roles.cache.filter(role => !oldMember.roles.cache.has(role.id));
    const removed = oldMember.roles.cache.filter(role => !newMember.roles.cache.has(role.id));
    if (!added.size && !removed.size) return;

    const ids = new Set([...added.keys(), ...removed.keys()]);
    const entry = await fetchEntry(newMember.guild, 25, { // MemberRoleUpdate
        targetId: newMember.id,
        match: e => e.changes?.some(c => (c.key === '$add' || c.key === '$remove') && c.new?.some(r => ids.has(r.id)))
    });
    const actor = { executorId: entry?.executorId ?? null, viaBot: false };

    emitLog(Client, 'member', baseEmbed({
        user: newMember.user,
        title: '🎭 Rôles modifiés',
        description:
            `👤 **Membre :** <@${newMember.id}> (\`${newMember.id}\`)\n` +
            (added.size ? `➕ **Ajouté(s) :** ${added.map(roleRef).join(' ')}\n` : '') +
            (removed.size ? `➖ **Retiré(s) :** ${removed.map(roleRef).join(' ')}\n` : '') +
            `🛡️ **Par :** ${executorText(actor, Client)}`
    }));

    // Rôles de modération attribués / retirés
    const sensitive = [...added.values(), ...removed.values()].filter(role =>
        MODERATION_PERMISSIONS.some(flag => role.permissions.has(flag)));
    if (sensitive.length) {
        const describe = (role) => `${roleRef(role)} (${MODERATION_PERMISSIONS.filter(flag => role.permissions.has(flag)).map(permName).join(', ')})`;
        emitLog(Client, 'moderation', baseEmbed({
            user: newMember.user,
            title: '🛡️ Rôle de modération modifié',
            description:
                `**Membre :** <@${newMember.id}> (\`${newMember.id}\`)\n` +
                sensitive.map(role => `${added.has(role.id) ? '➕' : '➖'} ${describe(role)}`).join('\n') +
                `\n**Par :** ${executorText(actor, Client)}`
        }).setColor('f0a132'));
    }
};
