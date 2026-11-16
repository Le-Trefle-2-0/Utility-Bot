const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { emitLog, isPublicChannel, channelRef } = require('../../../Utility/logging/helpers');
const { fetchEntry } = require('../../../Utility/logging/audit');

module.exports = async (Client, messages, channel) => {
    if (!channel.guild) return;
    const isPublic = isPublicChannel(Client, channel);
    const entry = await fetchEntry(channel.guild, 73, { maxAge: 15000, match: e => e.targetId === channel.id || e.extra?.channel?.id === channel.id }); // MessageBulkDelete
    const executorId = entry?.executorId ?? null;

    // Export du contenu (uniquement dans les salons publics)
    const files = [];
    if (isPublic) {
        const lines = [...messages.values()].sort((a, b) => a.createdTimestamp - b.createdTimestamp).map(message => {
            const date = new Date(message.createdTimestamp).toLocaleString('fr-FR');
            const attachments = message.attachments?.size ? ` [${[...message.attachments.values()].map(a => a.url).join(' ')}]` : '';
            return `[${date}] ${message.author ? `${message.author.tag} (${message.author.id})` : 'auteur inconnu'} : ${message.content ?? '(non mis en cache)'}${attachments}`;
        });
        if (lines.length) files.push(new AttachmentBuilder(Buffer.from(lines.join('\n'), 'utf8'), { name: `suppression-groupee-${channel.id}.txt` }));
    }

    const embed = new EmbedBuilder()
        .setTitle('🧹 Suppression groupée de messages')
        .setDescription(
            `**Messages supprimés :** ${messages.size}\n**Salon :** ${channelRef(channel)}\n` +
            `**Par :** ${executorId ? `<@${executorId}>${executorId === Client.user.id ? ' (le bot, ex. `/clear`)' : ''}` : 'inconnu'}\n` +
            (isPublic ? '📎 Export du contenu en pièce jointe.' : '🔒 Salon non public : contenu non exporté.')
        );
    emitLog(Client, 'textual', embed, [], files);

    // Purge hors commande du bot : aussi côté modération (/clear a déjà son log)
    if (executorId && executorId !== Client.user.id) {
        emitLog(Client, 'moderation', new EmbedBuilder()
            .setTitle('🧹 Purge de messages')
            .setDescription(`**Modérateur :** <@${executorId}>\n**Salon :** ${channelRef(channel)}\n**Nombre :** ${messages.size}`));
    }
};
