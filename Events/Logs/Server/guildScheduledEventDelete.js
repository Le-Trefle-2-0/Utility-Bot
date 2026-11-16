const { EmbedBuilder } = require('discord.js');
const { emitLog, clip } = require('../../../Utility/logging/helpers');
const { fetchEntry, executorText } = require('../../../Utility/logging/audit');

module.exports = async (Client, event) => {
    const entry = await fetchEntry(event.guild, 102, { targetId: event.id }); // GuildScheduledEventDelete
    emitLog(Client, 'server', new EmbedBuilder()
        .setTitle('📅 Événement planifié supprimé')
        .setDescription(`**Nom :** ${clip(event.name, 100)} (\`${event.id}\`)\n**Par :** ${executorText({ executorId: entry?.executorId }, Client)}`));
};
