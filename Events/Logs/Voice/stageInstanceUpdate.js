const { EmbedBuilder } = require('discord.js');
const { emitLog, channelRef, clip, isPublicChannel } = require('../../../Utility/logging/helpers');

module.exports = async (Client, oldStage, newStage) => {
    if (!newStage.channel || !isPublicChannel(Client, newStage.channel)) return;
    if (oldStage?.topic === newStage.topic) return;
    emitLog(Client, 'voice', new EmbedBuilder().setTitle('🎙️ Conférence modifiée').setDescription(`**Salon :** ${channelRef(newStage.channel ?? newStage.channelId)}\n**Sujet :** ${clip(oldStage?.topic, 200)} → ${clip(newStage.topic, 200)}`));
};
