const { EmbedBuilder } = require('discord.js');
const { emitLog, clip } = require('../../../Utility/logging/helpers');
const { fetchEntry, executorText } = require('../../../Utility/logging/audit');

module.exports = async (Client, oldSticker, newSticker) => {
    if (!newSticker.guild) return;
    const lines = [];
    if (oldSticker.name !== newSticker.name) lines.push(`**Nom :** ${clip(oldSticker.name, 100)} → ${clip(newSticker.name, 100)}`);
    if (oldSticker.description !== newSticker.description) lines.push(`**Description :** ${clip(oldSticker.description, 200)} → ${clip(newSticker.description, 200)}`);
    if (oldSticker.tags !== newSticker.tags) lines.push(`**Émoji associé :** ${oldSticker.tags ?? '*aucun*'} → ${newSticker.tags ?? '*aucun*'}`);
    if (!lines.length) return;
    const entry = await fetchEntry(newSticker.guild, 91, { targetId: newSticker.id }); // StickerUpdate
    emitLog(Client, 'server', new EmbedBuilder()
        .setTitle('🏷️ Sticker modifié')
        .setDescription(`${lines.join('\n')}\n**Par :** ${executorText({ executorId: entry?.executorId }, Client)}`)
        .setThumbnail(newSticker.url));
};
