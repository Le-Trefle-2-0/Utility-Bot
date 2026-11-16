const { EmbedBuilder, ChannelType } = require('discord.js');
const { emitLog, channelRef, isTicketChannel, isMainGuild } = require('../../../Utility/logging/helpers');

/** Membres ajoutés ou retirés d'un fil public. */
module.exports = async (Client, added, removed, thread) => {
    if (!isMainGuild(Client, thread?.guild) || thread.type === ChannelType.PrivateThread || isTicketChannel(Client, thread)) return;
    if (!added.size && !removed.size) return;
    emitLog(Client, 'server', new EmbedBuilder()
        .setTitle('🧵 Participants du fil modifiés')
        .setDescription(
            `**Fil :** ${channelRef(thread)}\n` +
            (added.size ? `➕ **Rejoint :** ${added.map(m => `<@${m.id}>`).slice(0, 20).join(' ')}\n` : '') +
            (removed.size ? `➖ **Parti :** ${removed.map(m => `<@${m.id}>`).slice(0, 20).join(' ')}` : '')
        ));
};
