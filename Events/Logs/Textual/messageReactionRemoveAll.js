const { EmbedBuilder } = require('discord.js');
const { emitLog, isPublicChannel, channelRef, clip } = require('../../../Utility/logging/helpers');

module.exports = async (Client, message, reactions) => {
    if (!message.guild || !isPublicChannel(Client, message.channel)) return;
    emitLog(Client, 'textual', new EmbedBuilder()
        .setTitle('😶 Toutes les réactions retirées')
        .setDescription(
            `**Salon :** ${channelRef(message.channel)}\n[Aller au message](${message.url})\n` +
            `**Réactions retirées :** ${reactions?.size ? reactions.map(r => `${r.emoji} ×${r.count}`).join(' ') : 'inconnues'}\n` +
            `**Contenu :** ${clip(message.content, 300)}`
        ));
};
