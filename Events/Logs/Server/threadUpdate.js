const { EmbedBuilder, ChannelType } = require('discord.js');
const { emitLog, channelRef, isTicketChannel, clip, yesNo, isMainGuild, duration } = require('../../../Utility/logging/helpers');
const { fetchEntry, executorText } = require('../../../Utility/logging/audit');

module.exports = async (Client, oldThread, newThread) => {
    if (!isMainGuild(Client, newThread.guild) || newThread.type === ChannelType.PrivateThread || isTicketChannel(Client, newThread)) return;
    const lines = [];
    if (oldThread.name !== newThread.name) lines.push(`**Nom :** ${clip(oldThread.name, 100)} → ${clip(newThread.name, 100)}`);
    if (oldThread.archived !== newThread.archived) lines.push(`**Archivé :** ${yesNo(oldThread.archived)} → ${yesNo(newThread.archived)}`);
    if (oldThread.locked !== newThread.locked) lines.push(`**Verrouillé :** ${yesNo(oldThread.locked)} → ${yesNo(newThread.locked)}`);
    if (oldThread.autoArchiveDuration !== newThread.autoArchiveDuration) lines.push(`**Archivage automatique :** ${oldThread.autoArchiveDuration} min → ${newThread.autoArchiveDuration} min`);
    if (oldThread.rateLimitPerUser !== newThread.rateLimitPerUser) lines.push(`**Mode lent :** ${duration((oldThread.rateLimitPerUser || 0) * 1000)} → ${duration((newThread.rateLimitPerUser || 0) * 1000)}`);
    if (!lines.length) return;

    const entry = await fetchEntry(newThread.guild, 111, { targetId: newThread.id }); // ThreadUpdate
    emitLog(Client, 'server', new EmbedBuilder()
        .setTitle('🧵 Fil modifié')
        .setDescription(`**Fil :** ${channelRef(newThread)}\n${lines.join('\n')}\n**Par :** ${entry ? executorText({ executorId: entry.executorId }, Client) : 'inconnu (ou archivage automatique)'}`));
};
