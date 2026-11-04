const { EmbedBuilder } = require('discord.js');
const { emitLog, roleRef, permName, diffPermissions, MODERATION_PERMISSIONS, batch, yesNo, clip } = require('../../../Utility/logging/helpers');
const { fetchEntry, executorText } = require('../../../Utility/logging/audit');

module.exports = async (Client, oldRole, newRole) => {
    const lines = [];
    if (oldRole.name !== newRole.name) lines.push(`**Nom :** ${clip(oldRole.name, 100)} → ${clip(newRole.name, 100)}`);
    if (oldRole.hexColor !== newRole.hexColor) lines.push(`**Couleur :** ${oldRole.hexColor} → ${newRole.hexColor}`);
    if (oldRole.hoist !== newRole.hoist) lines.push(`**Affiché séparément :** ${yesNo(oldRole.hoist)} → ${yesNo(newRole.hoist)}`);
    if (oldRole.mentionable !== newRole.mentionable) lines.push(`**Mentionnable :** ${yesNo(oldRole.mentionable)} → ${yesNo(newRole.mentionable)}`);
    if (oldRole.icon !== newRole.icon) lines.push('**Icône :** modifiée');
    if (oldRole.unicodeEmoji !== newRole.unicodeEmoji) lines.push(`**Émoji :** ${oldRole.unicodeEmoji ?? '*aucun*'} → ${newRole.unicodeEmoji ?? '*aucun*'}`);

    const perms = diffPermissions(oldRole.permissions, newRole.permissions);
    if (perms.added.length) lines.push(`➕ **Permissions accordées :** ${perms.added.map(permName).join(', ')}`);
    if (perms.removed.length) lines.push(`➖ **Permissions retirées :** ${perms.removed.map(permName).join(', ')}`);

    // Hiérarchie : un déplacement décale tous les autres rôles, on regroupe en un seul message
    if (oldRole.position !== newRole.position && !lines.length) {
        batch(`rolepos:${newRole.guild.id}`, 3000, { role: newRole, from: oldRole.position, to: newRole.position }, async (items) => {
            const entry = await fetchEntry(newRole.guild, 31, { maxAge: 20000, delay: 0 });
            emitLog(Client, 'server', new EmbedBuilder()
                .setTitle('📶 Hiérarchie des rôles modifiée')
                .setDescription(
                    items.slice(0, 15).map(item => `${roleRef(item.role)} : position ${item.from} → ${item.to}`).join('\n') +
                    (items.length > 15 ? `\n… et ${items.length - 15} autre(s)` : '') +
                    `\n**Par :** ${executorText({ executorId: entry?.executorId }, Client)}`
                ));
        });
        return;
    }
    if (!lines.length) return;

    const entry = await fetchEntry(newRole.guild, 31, { targetId: newRole.id }); // RoleUpdate
    const actor = { executorId: entry?.executorId ?? null };
    emitLog(Client, 'server', new EmbedBuilder()
        .setTitle('🎭 Rôle modifié')
        .setDescription(`**Rôle :** ${roleRef(newRole)} (\`${newRole.id}\`)\n${lines.join('\n')}\n**Par :** ${executorText(actor, Client)}`));

    // Permissions de modération accordées / retirées
    const sensitiveAdded = perms.added.filter(flag => MODERATION_PERMISSIONS.includes(flag));
    const sensitiveRemoved = perms.removed.filter(flag => MODERATION_PERMISSIONS.includes(flag));
    if (sensitiveAdded.length || sensitiveRemoved.length) {
        emitLog(Client, 'moderation', new EmbedBuilder()
            .setTitle('🛡️ Permissions de modération d\'un rôle modifiées')
            .setDescription(
                `**Rôle :** ${roleRef(newRole)} (${newRole.members.size} membre(s))\n` +
                (sensitiveAdded.length ? `➕ ${sensitiveAdded.map(permName).join(', ')}\n` : '') +
                (sensitiveRemoved.length ? `➖ ${sensitiveRemoved.map(permName).join(', ')}\n` : '') +
                `**Par :** ${executorText(actor, Client)}`
            ).setColor('f0a132'));
    }
};
