const { EmbedBuilder } = require('discord.js');
const { emitLog } = require('../../../Utility/logging/helpers');
const { fetchEntry, executorText } = require('../../../Utility/logging/audit');

module.exports = async (Client, emoji) => {
    const entry = await fetchEntry(emoji.guild, 60, { targetId: emoji.id }); // EmojiCreate
    emitLog(Client, 'server', new EmbedBuilder()
        .setTitle('😀 Émoji créé')
        .setDescription(`${emoji} **:${emoji.name}:** (\`${emoji.id}\`)${emoji.animated ? ' — animé' : ''}\n**Par :** ${executorText({ executorId: entry?.executorId }, Client)}`)
        .setThumbnail(emoji.imageURL()));
};
