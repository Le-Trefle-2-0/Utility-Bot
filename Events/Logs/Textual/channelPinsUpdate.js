const { EmbedBuilder } = require('discord.js');
const { emitLog, isPublicChannel, channelRef, clip } = require('../../../Utility/logging/helpers');
const { fetchEntry } = require('../../../Utility/logging/audit');

module.exports = async (Client, channel) => {
    if (!channel.guild || !isPublicChannel(Client, channel)) return;
    const entry = await fetchEntry(channel.guild, undefined, { maxAge: 10000, match: e => (e.action === 74 || e.action === 75) && e.extra?.channel?.id === channel.id });
    const pinned = entry ? entry.action === 74 : null;
    const message = entry?.extra?.messageId ? await channel.messages.fetch(entry.extra.messageId).catch(() => null) : null;

    emitLog(Client, 'textual', new EmbedBuilder()
        .setTitle(pinned === null ? '📌 Messages épinglés modifiés' : pinned ? '📌 Message épinglé' : '📌 Message désépinglé')
        .setDescription(
            `**Salon :** ${channelRef(channel)}\n**Par :** ${entry?.executorId ? `<@${entry.executorId}>` : 'inconnu'}\n` +
            (message ? `**Auteur du message :** <@${message.author.id}>\n**Contenu :** ${clip(message.content, 500)}\n[Aller au message](${message.url})` : '')
        ));
};
