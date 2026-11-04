const { baseEmbed, emitLog, clip } = require('../../../Utility/logging/helpers');
const { detectImpersonation } = require('../../../Utility/logging/memberIntel');

/** Nom d'utilisateur, nom d'affichage ou avatar global modifié (uniquement pour les membres du serveur). */
module.exports = async (Client, oldUser, newUser) => {
    const guild = Client.guilds.cache.get(Client.settings.mainGuildID);
    const member = guild?.members.cache.get(newUser.id);
    if (!member || oldUser.partial) return;

    const lines = [];
    if (oldUser.username !== newUser.username) lines.push(`🏷️ **Nom d'utilisateur :** ${clip(oldUser.username, 100)} → ${clip(newUser.username, 100)}`);
    if (oldUser.globalName !== newUser.globalName) lines.push(`📛 **Nom d'affichage :** ${clip(oldUser.globalName ?? '*aucun*', 100)} → ${clip(newUser.globalName ?? '*aucun*', 100)}`);
    if (oldUser.avatar !== newUser.avatar) lines.push(`🖼️ **Avatar :** ${oldUser.avatar ? `[ancien](${oldUser.displayAvatarURL({ size: 512 })})` : '*par défaut*'} → ${newUser.avatar ? `[nouveau](${newUser.displayAvatarURL({ size: 512 })})` : '*par défaut*'}`);
    if (!lines.length) return;

    const embed = baseEmbed({
        user: newUser,
        title: '👤 Profil global modifié',
        description: `<@${newUser.id}> (\`${newUser.id}\`)\n${lines.join('\n')}`
    });
    if (oldUser.avatar !== newUser.avatar && newUser.avatar) embed.setThumbnail(newUser.displayAvatarURL({ size: 512 }));
    emitLog(Client, 'member', embed);

    if (oldUser.username !== newUser.username || oldUser.globalName !== newUser.globalName) {
        const impersonation = detectImpersonation(member);
        if (impersonation) {
            emitLog(Client, 'member', baseEmbed({
                user: newUser,
                title: '🕵️ Nom suspect',
                description: `<@${newUser.id}> a changé de nom.\n• ${impersonation}`
            }).setColor('f0a132'));
        }
    }
};
