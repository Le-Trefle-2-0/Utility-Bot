const { EmbedBuilder, GuildScheduledEventStatus } = require('discord.js');
const { emitLog, ts, clip, channelRef } = require('../../../Utility/logging/helpers');
const { fetchEntry, executorText } = require('../../../Utility/logging/audit');

module.exports = async (Client, oldEvent, newEvent) => {
    // Démarrage / fin / annulation
    if (oldEvent && oldEvent.status !== newEvent.status) {
        const label = {
            [GuildScheduledEventStatus.Active]: '▶️ Événement démarré',
            [GuildScheduledEventStatus.Completed]: '⏹️ Événement terminé',
            [GuildScheduledEventStatus.Canceled]: '🚫 Événement annulé'
        }[newEvent.status];
        if (label) {
            emitLog(Client, 'server', new EmbedBuilder().setTitle(label).setDescription(`**Nom :** ${clip(newEvent.name, 100)} (\`${newEvent.id}\`)\n**Participants intéressés :** ${newEvent.userCount ?? 'inconnu'}`));
        }
        return;
    }

    const lines = [];
    if (oldEvent?.name !== newEvent.name) lines.push(`**Nom :** ${clip(oldEvent?.name, 100)} → ${clip(newEvent.name, 100)}`);
    if (oldEvent?.description !== newEvent.description) lines.push(`**Description :** ${clip(oldEvent?.description, 200)} → ${clip(newEvent.description, 200)}`);
    if (oldEvent?.scheduledStartTimestamp !== newEvent.scheduledStartTimestamp) lines.push(`**Début :** ${ts(oldEvent?.scheduledStartTimestamp)} → ${ts(newEvent.scheduledStartTimestamp)}`);
    if (oldEvent?.scheduledEndTimestamp !== newEvent.scheduledEndTimestamp) lines.push(`**Fin :** ${ts(oldEvent?.scheduledEndTimestamp)} → ${ts(newEvent.scheduledEndTimestamp)}`);
    if (oldEvent?.channelId !== newEvent.channelId) lines.push(`**Salon :** ${channelRef(oldEvent?.channelId)} → ${channelRef(newEvent.channelId)}`);
    if (oldEvent?.entityMetadata?.location !== newEvent.entityMetadata?.location) lines.push(`**Lieu :** ${clip(oldEvent?.entityMetadata?.location, 100)} → ${clip(newEvent.entityMetadata?.location, 100)}`);
    if (!lines.length) return;

    const entry = await fetchEntry(newEvent.guild, 101, { targetId: newEvent.id }); // GuildScheduledEventUpdate
    emitLog(Client, 'server', new EmbedBuilder()
        .setTitle('📅 Événement planifié modifié')
        .setDescription(`**Événement :** ${clip(newEvent.name, 100)}\n${lines.join('\n')}\n**Par :** ${executorText({ executorId: entry?.executorId }, Client)}`));
};
