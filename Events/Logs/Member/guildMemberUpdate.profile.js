const { baseEmbed, emitLog } = require('../../../Utility/logging/helpers');

/** Avatar ou bannière propres au serveur. */
module.exports = async (Client, oldMember, newMember) => {
    if (oldMember.partial) return;
    const lines = [];
    let image = null;

    if (oldMember.avatar !== newMember.avatar) {
        lines.push(`🖼️ **Avatar du serveur :** ${oldMember.avatar ? `[ancien](${oldMember.avatarURL({ size: 512 })})` : '*aucun*'} → ${newMember.avatar ? `[nouveau](${newMember.avatarURL({ size: 512 })})` : '*retiré*'}`);
        image = newMember.avatar ? newMember.avatarURL({ size: 512 }) : null;
    }
    if (oldMember.banner !== newMember.banner) {
        const bannerURL = (member) => member.bannerURL?.({ size: 512 });
        lines.push(`🏞️ **Bannière du serveur :** ${oldMember.banner ? `[ancienne](${bannerURL(oldMember)})` : '*aucune*'} → ${newMember.banner ? `[nouvelle](${bannerURL(newMember)})` : '*retirée*'}`);
        image = image || (newMember.banner ? bannerURL(newMember) : null);
    }
    if (!lines.length) return;

    const embed = baseEmbed({
        user: newMember.user,
        title: '🖼️ Profil de serveur modifié',
        description: `👤 **Membre :** <@${newMember.id}> (\`${newMember.id}\`)\n${lines.join('\n')}`
    });
    if (image) embed.setThumbnail(image);
    emitLog(Client, 'member', embed);
};
