const { EmbedBuilder } = require('discord.js');
const { emitLog, clip } = require('../../../Utility/logging/helpers');
const { fetchEntry, executorText } = require('../../../Utility/logging/audit');

module.exports = async (Client, sound) => {
    if (!sound.guild) return;
    const entry = await fetchEntry(sound.guild, 130, { targetId: sound.soundId }); // SoundboardSoundCreate
    emitLog(Client, 'server', new EmbedBuilder()
        .setTitle('🔊 Son de soundboard créé')
        .setDescription(`**Nom :** ${clip(sound.name, 100)} ${sound.emoji?.name ?? ''} (\`${sound.soundId}\`)\n**Par :** ${executorText({ executorId: entry?.executorId ?? sound.user?.id }, Client)}`));
};
