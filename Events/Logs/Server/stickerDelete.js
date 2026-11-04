const { EmbedBuilder } = require('discord.js');
const { emitLog, clip } = require('../../../Utility/logging/helpers');
const { fetchEntry, executorText } = require('../../../Utility/logging/audit');

module.exports = async (Client, sticker) => {
    if (!sticker.guild) return;
    const entry = await fetchEntry(sticker.guild, 92, { targetId: sticker.id }); // StickerDelete
    emitLog(Client, 'server', new EmbedBuilder()
        .setTitle('🏷️ Sticker supprimé')
        .setDescription(`**Nom :** ${clip(sticker.name, 100)} (\`${sticker.id}\`)\n**Par :** ${executorText({ executorId: entry?.executorId }, Client)}`));
};
