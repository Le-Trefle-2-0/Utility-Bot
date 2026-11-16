const { EmbedBuilder } = require('discord.js');
const { emitLog, channelRef, isTicketChannel } = require('../../../Utility/logging/helpers');
const { fetchEntry, executorText } = require('../../../Utility/logging/audit');
const { trackSensitive } = require('../../../Utility/logging/tracker');

const KINDS = { 50: 'créé', 51: 'modifié', 52: 'supprimé' };

/** Webhook créé / modifié / supprimé : l'événement n'indique que le salon, le détail vient du journal d'audit. */
module.exports = async (Client, channel) => {
    if (!channel.guild || isTicketChannel(Client, channel)) return;
    const entry = await fetchEntry(channel.guild, undefined, { maxAge: 10000, match: e => KINDS[e.action] && (e.extra?.channel?.id === channel.id || !e.extra?.channel) });
    const verb = entry ? KINDS[entry.action] : 'modifié';
    const name = entry?.target?.name ?? entry?.changes?.find(c => c.key === 'name')?.new ?? entry?.changes?.find(c => c.key === 'name')?.old;

    trackSensitive(Client, channel.guild, entry?.executorId, 'webhook', `Webhook ${verb}${name ? ` « ${name} »` : ''}`);
    emitLog(Client, 'server', new EmbedBuilder()
        .setTitle(`🪝 Webhook ${verb}`)
        .setDescription(`**Salon :** ${channelRef(channel)}\n${name ? `**Nom :** ${name}\n` : ''}**Par :** ${executorText({ executorId: entry?.executorId }, Client)}`));
};
