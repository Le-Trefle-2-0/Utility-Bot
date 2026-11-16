const { EmbedBuilder } = require('discord.js');
const { emitLog, clip } = require('../../../Utility/logging/helpers');
const { fetchEntry, executorText } = require('../../../Utility/logging/audit');

module.exports = async (Client, oldSound, newSound) => {
    if (!newSound.guild) return;
    const lines = [];
    if (oldSound?.name !== newSound.name) lines.push(`**Nom :** ${clip(oldSound?.name, 100)} → ${clip(newSound.name, 100)}`);
    if (oldSound?.volume !== newSound.volume) lines.push(`**Volume :** ${oldSound?.volume} → ${newSound.volume}`);
    if (oldSound?.emoji?.name !== newSound.emoji?.name) lines.push(`**Émoji :** ${oldSound?.emoji?.name ?? '*aucun*'} → ${newSound.emoji?.name ?? '*aucun*'}`);
    if (!lines.length) return;
    const entry = await fetchEntry(newSound.guild, 131, { targetId: newSound.soundId }); // SoundboardSoundUpdate
    emitLog(Client, 'server', new EmbedBuilder()
        .setTitle('🔊 Son de soundboard modifié')
        .setDescription(`${lines.join('\n')}\n**Par :** ${executorText({ executorId: entry?.executorId }, Client)}`));
};
