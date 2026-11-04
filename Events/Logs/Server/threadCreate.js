const { EmbedBuilder, ChannelType } = require('discord.js');
const { emitLog, channelRef, isTicketChannel, clip, isMainGuild } = require('../../../Utility/logging/helpers');

module.exports = async (Client, thread, newlyCreated) => {
    // Les fils privés (ex. fils d'accueil) ne sont pas journalisés
    if (!isMainGuild(Client, thread.guild) || !newlyCreated || thread.type === ChannelType.PrivateThread || isTicketChannel(Client, thread)) return;
    emitLog(Client, 'server', new EmbedBuilder()
        .setTitle('🧵 Fil créé')
        .setDescription(`**Fil :** ${channelRef(thread)}\n**Nom :** ${clip(thread.name, 100)}\n**Salon parent :** ${channelRef(thread.parent)}\n**Créé par :** ${thread.ownerId ? `<@${thread.ownerId}>` : 'inconnu'}\n**Archivage automatique :** ${thread.autoArchiveDuration} min`));
};
