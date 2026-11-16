const { EmbedBuilder } = require('discord.js');
const { emitLog, channelTypeName, isTicketChannel, clip } = require('../../../Utility/logging/helpers');
const { fetchEntry, executorText } = require('../../../Utility/logging/audit');
const { trackSensitive } = require('../../../Utility/logging/tracker');

module.exports = async (Client, channel) => {
    if (!channel.guild || isTicketChannel(Client, channel)) return;
    const entry = await fetchEntry(channel.guild, 12, { targetId: channel.id }); // ChannelDelete
    const actor = { executorId: entry?.executorId ?? null };
    trackSensitive(Client, channel.guild, entry?.executorId, 'channelDelete', `${channelTypeName(channel)} « ${channel.name} »`);

    emitLog(Client, 'server', new EmbedBuilder()
        .setTitle(`🗑️ ${channelTypeName(channel)} supprimé(e)`)
        .setDescription(
            `**Nom :** ${clip(channel.name, 100)} (\`${channel.id}\`)\n` +
            `**Catégorie :** ${channel.parent ? clip(channel.parent.name, 100) : '*aucune*'}\n` +
            `**Par :** ${executorText(actor, Client)}`
        )
        .setFooter({ text: `ID du salon : ${channel.id}` }));

    if (entry && entry.executorId !== Client.user.id) {
        emitLog(Client, 'moderation', new EmbedBuilder()
            .setTitle('⚠️ Action sensible : salon supprimé')
            .setDescription(`**${channelTypeName(channel)} :** ${clip(channel.name, 100)}\n**Par :** ${executorText(actor, Client)}`));
    }
};
