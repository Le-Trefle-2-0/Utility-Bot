const { baseEmbed, emitLog, clip } = require('../../../Utility/logging/helpers');
const { fetchEntry } = require('../../../Utility/logging/audit');
const { detectImpersonation } = require('../../../Utility/logging/memberIntel');

module.exports = async (Client, oldMember, newMember) => {
    if (oldMember.partial || oldMember.nickname === newMember.nickname) return;

    const entry = await fetchEntry(newMember.guild, 24, { // MemberUpdate
        targetId: newMember.id,
        match: e => e.changes?.some(c => c.key === 'nick')
    });
    const forced = entry && entry.executorId !== newMember.id;
    const byBot = forced && entry.executorId === Client.user.id;

    const embed = baseEmbed({
        user: newMember.user,
        title: forced ? (byBot ? '✏️ Pseudo modifié automatiquement' : '✏️ Pseudo modifié par un modérateur') : '✏️ Pseudo modifié',
        description:
            `👤 **Membre :** <@${newMember.id}> (\`${newMember.id}\`)\n` +
            `❌ **Ancien pseudo :** ${clip(oldMember.nickname ?? '*aucun (nom d\'utilisateur)*', 200)}\n` +
            `✅ **Nouveau pseudo :** ${clip(newMember.nickname ?? '*aucun (nom d\'utilisateur)*', 200)}` +
            (forced ? `\n🛡️ **Modifié par :** <@${entry.executorId}>${entry.reason ? `\n📝 **Raison :** ${entry.reason}` : ''}` : '')
    });
    emitLog(Client, 'member', embed);

    // Changement imposé par un modérateur (ou nettoyage automatique) : aussi dans la modération
    if (forced) {
        emitLog(Client, 'moderation', baseEmbed({
            user: newMember.user,
            title: byBot ? '🧹 Nettoyage automatique de pseudo' : '✏️ Changement de pseudo forcé',
            description:
                `**Cible :** <@${newMember.id}>\n**Par :** <@${entry.executorId}>\n` +
                `**Avant :** ${clip(oldMember.nickname ?? '*aucun*', 200)} → **Après :** ${clip(newMember.nickname ?? '*aucun*', 200)}`
        }));
    }

    const impersonation = newMember.nickname && detectImpersonation(newMember);
    if (impersonation) {
        emitLog(Client, 'member', baseEmbed({
            user: newMember.user,
            title: '🕵️ Pseudo suspect',
            description: `<@${newMember.id}> a pris le pseudo **${clip(newMember.nickname, 100)}**.\n• ${impersonation}`
        }).setColor('f0a132'));
    }
};
