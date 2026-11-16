const { EmbedBuilder } = require('discord.js');
const { emitLog, channelRef, channelTypeName, isTicketChannel, clip } = require('../../../Utility/logging/helpers');
const { fetchEntry, executorText } = require('../../../Utility/logging/audit');
const { trackSensitive } = require('../../../Utility/logging/tracker');

module.exports = async (Client, channel) => {
    if (!channel.guild || isTicketChannel(Client, channel)) return;
    const entry = await fetchEntry(channel.guild, 10, { targetId: channel.id }); // ChannelCreate
    trackSensitive(Client, channel.guild, entry?.executorId, 'channelCreate', `${channelTypeName(channel)} « ${channel.name} »`);

    emitLog(Client, 'server', new EmbedBuilder()
        .setTitle(`📁 ${channelTypeName(channel)} créé(e)`)
        .setDescription(
            `**Salon :** ${channelRef(channel)}\n**Nom :** ${clip(channel.name, 100)}\n` +
            `**Catégorie :** ${channel.parent ? clip(channel.parent.name, 100) : '*aucune*'}\n` +
            `**Par :** ${executorText({ executorId: entry?.executorId }, Client)}`
        )
        .setFooter({ text: `ID du salon : ${channel.id}` }));
};
