const { EmbedBuilder } = require('discord.js');
const { emitLog } = require('../../../Utility/logging/helpers');
const { fetchEntry, executorText } = require('../../../Utility/logging/audit');

module.exports = async (Client, oldEmoji, newEmoji) => {
    if (oldEmoji.name === newEmoji.name) return;
    const entry = await fetchEntry(newEmoji.guild, 61, { targetId: newEmoji.id }); // EmojiUpdate
    emitLog(Client, 'server', new EmbedBuilder()
        .setTitle('😀 Émoji modifié')
        .setDescription(`${newEmoji} (\`${newEmoji.id}\`)\n**Nom :** :${oldEmoji.name}: → :${newEmoji.name}:\n**Par :** ${executorText({ executorId: entry?.executorId }, Client)}`)
        .setThumbnail(newEmoji.imageURL()));
};
