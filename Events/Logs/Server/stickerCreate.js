const { EmbedBuilder } = require('discord.js');
const { emitLog, clip } = require('../../../Utility/logging/helpers');
const { fetchEntry, executorText } = require('../../../Utility/logging/audit');

module.exports = async (Client, sticker) => {
    if (!sticker.guild) return;
    const entry = await fetchEntry(sticker.guild, 90, { targetId: sticker.id }); // StickerCreate
    emitLog(Client, 'server', new EmbedBuilder()
        .setTitle('🏷️ Sticker créé')
        .setDescription(`**Nom :** ${clip(sticker.name, 100)} (\`${sticker.id}\`)\n**Description :** ${clip(sticker.description, 200)}\n**Par :** ${executorText({ executorId: entry?.executorId }, Client)}`)
        .setThumbnail(sticker.url));
};
