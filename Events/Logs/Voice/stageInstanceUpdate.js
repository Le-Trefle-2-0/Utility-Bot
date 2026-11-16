const { EmbedBuilder } = require('discord.js');
const { emitLog, channelRef, clip } = require('../../../Utility/logging/helpers');

module.exports = async (Client, oldStage, newStage) => {
    if (oldStage?.topic === newStage.topic) return;
    emitLog(Client, 'voice', new EmbedBuilder().setTitle('🎙️ Conférence modifiée').setDescription(`**Salon :** ${channelRef(newStage.channel ?? newStage.channelId)}\n**Sujet :** ${clip(oldStage?.topic, 200)} → ${clip(newStage.topic, 200)}`));
};
