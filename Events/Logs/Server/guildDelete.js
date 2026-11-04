const { EmbedBuilder } = require('discord.js');
const { emitLog, clip } = require('../../../Utility/logging/helpers');

module.exports = async (Client, guild) => {
    if (guild.id === Client.settings.mainGuildID || guild.available === false) return;
    emitLog(Client, 'server', new EmbedBuilder()
        .setTitle('🤖 Bot retiré d\'un autre serveur')
        .setDescription(`**Serveur :** ${clip(guild.name, 100)} (\`${guild.id}\`)`));
};
