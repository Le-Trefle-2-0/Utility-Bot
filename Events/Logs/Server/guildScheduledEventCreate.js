const { EmbedBuilder } = require('discord.js');
const { emitLog, ts, clip, channelRef } = require('../../../Utility/logging/helpers');

module.exports = async (Client, event) => {
    emitLog(Client, 'server', new EmbedBuilder()
        .setTitle('📅 Événement planifié créé')
        .setDescription(
            `**Nom :** ${clip(event.name, 100)} (\`${event.id}\`)\n**Début :** ${ts(event.scheduledStartTimestamp, 'f')} (${ts(event.scheduledStartTimestamp, 'R')})\n` +
            `${event.scheduledEndTimestamp ? `**Fin :** ${ts(event.scheduledEndTimestamp, 'f')}\n` : ''}` +
            `**Lieu :** ${event.channel ? channelRef(event.channel) : clip(event.entityMetadata?.location, 100)}\n` +
            `**Description :** ${clip(event.description, 300)}\n**Créé par :** ${event.creatorId ? `<@${event.creatorId}>` : 'inconnu'}`
        ));
};
