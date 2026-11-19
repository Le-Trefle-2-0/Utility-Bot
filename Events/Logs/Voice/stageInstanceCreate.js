const { EmbedBuilder } = require('discord.js');
const { emitLog, channelRef, clip, isPublicChannel } = require('../../../Utility/logging/helpers');

module.exports = async (Client, stage) => {
    if (!stage.channel || !isPublicChannel(Client, stage.channel)) return;
    emitLog(Client, 'voice', new EmbedBuilder().setTitle('🎙️ Conférence démarrée').setDescription(`**Salon :** ${channelRef(stage.channel ?? stage.channelId)}\n**Sujet :** ${clip(stage.topic, 200)}`));
};
