const { EmbedBuilder } = require('discord.js');
const { emitLog, channelRef, isEnabled } = require('../../../Utility/logging/helpers');

/** Utilisation de la soundboard (et réactions vocales) dans un salon vocal. */
module.exports = async (Client, effect) => {
    if (!isEnabled(Client, 'soundboard') || !effect.soundId) return;
    emitLog(Client, 'voice', new EmbedBuilder()
        .setTitle('🔊 Son de soundboard joué')
        .setDescription(`**Membre :** <@${effect.userId}>\n**Salon :** ${channelRef(effect.channel ?? effect.channelId)}\n**Son :** ${effect.soundboardSound?.name ?? `\`${effect.soundId}\``}`));
};
