const { EmbedBuilder } = require('discord.js');
const { emitLog, tsFull, clip } = require('../../../Utility/logging/helpers');
const { fetchEntry } = require('../../../Utility/logging/audit');

/**
 * Le bot est ajouté à un autre serveur : alerte de sécurité (qui l'a ajouté, quelles permissions).
 * Ignoré au démarrage (les serveurs déjà connus déclenchent aussi cet événement).
 */
module.exports = async (Client, guild) => {
    if (guild.id === Client.settings.mainGuildID) return;
    if (!Client.isReady() || Date.now() - (guild.joinedTimestamp || 0) > 60_000) return;

    const entry = await fetchEntry(guild, 28, { targetId: Client.user.id });
    const permissions = guild.members.me?.permissions.toArray().join(', ') || 'inconnues';
    emitLog(Client, 'server', new EmbedBuilder()
        .setTitle('🤖 Bot ajouté à un autre serveur')
        .setDescription(
            `**Serveur :** ${clip(guild.name, 100)} (\`${guild.id}\`)\n**Membres :** ${guild.memberCount}\n**Propriétaire :** <@${guild.ownerId}>\n` +
            `**Ajouté par :** ${entry?.executorId ? `<@${entry.executorId}>` : 'inconnu'}\n**Date :** ${tsFull(Date.now())}\n**Permissions accordées :** ${clip(permissions, 800)}`
        ).setColor('f0a132'));
};
