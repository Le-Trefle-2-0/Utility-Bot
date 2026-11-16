const { EmbedBuilder } = require('discord.js');
const { emitLog, channelRef, clip } = require('../../../Utility/logging/helpers');

module.exports = async (Client, stage) => {
    emitLog(Client, 'voice', new EmbedBuilder().setTitle('🎙️ Conférence terminée').setDescription(`**Salon :** ${channelRef(stage.channel ?? stage.channelId)}\n**Sujet :** ${clip(stage.topic, 200)}`));
};
