const { EmbedBuilder } = require('discord.js');
const { emitLog, isPublicChannel, channelRef } = require('../../../Utility/logging/helpers');

module.exports = async (Client, reaction) => {
    const message = reaction.message;
    if (!message.guild || !isPublicChannel(Client, message.channel)) return;
    emitLog(Client, 'textual', new EmbedBuilder()
        .setTitle('😶 Une réaction retirée pour tout le monde')
        .setDescription(`**Émoji :** ${reaction.emoji}\n**Réactions retirées :** ${reaction.count ?? 'inconnu'}\n**Salon :** ${channelRef(message.channel)}\n[Aller au message](${message.url})`));
};
