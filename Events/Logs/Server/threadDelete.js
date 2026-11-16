const { EmbedBuilder, ChannelType } = require('discord.js');
const { emitLog, channelRef, isTicketChannel, clip, isMainGuild } = require('../../../Utility/logging/helpers');
const { fetchEntry, executorText } = require('../../../Utility/logging/audit');

module.exports = async (Client, thread) => {
    if (!isMainGuild(Client, thread.guild) || thread.type === ChannelType.PrivateThread || isTicketChannel(Client, thread)) return;
    const entry = await fetchEntry(thread.guild, 112, { targetId: thread.id }); // ThreadDelete
    emitLog(Client, 'server', new EmbedBuilder()
        .setTitle('🧵 Fil supprimé')
        .setDescription(`**Nom :** ${clip(thread.name, 100)} (\`${thread.id}\`)\n**Salon parent :** ${channelRef(thread.parent)}\n**Par :** ${executorText({ executorId: entry?.executorId }, Client)}`));
};
