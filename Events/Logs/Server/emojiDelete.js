const { EmbedBuilder } = require('discord.js');
const { emitLog } = require('../../../Utility/logging/helpers');
const { fetchEntry, executorText } = require('../../../Utility/logging/audit');

module.exports = async (Client, emoji) => {
    const entry = await fetchEntry(emoji.guild, 62, { targetId: emoji.id }); // EmojiDelete
    emitLog(Client, 'server', new EmbedBuilder()
        .setTitle('😀 Émoji supprimé')
        .setDescription(`**:${emoji.name}:** (\`${emoji.id}\`)\n**Par :** ${executorText({ executorId: entry?.executorId }, Client)}`)
        .setThumbnail(emoji.imageURL()));
};
