const { EmbedBuilder } = require('discord.js');
const { emitLog, isPublicChannel, clip, channelRef, ts } = require('../../../Utility/logging/helpers');
const { fetchEntry } = require('../../../Utility/logging/audit');

const lastCounts = new Map();

/** Qui a supprimé le message ? Le journal d'audit regroupe les suppressions : on suit le compteur `count`. */
const findDeleter = async (message) => {
    if (!message.author) return null;
    const entry = await fetchEntry(message.guild, 72, { // MessageDelete
        targetId: message.author.id, maxAge: 15000,
        match: e => e.extra?.channel?.id === message.channelId
    });
    if (!entry) return null;
    const previous = lastCounts.get(entry.id);
    lastCounts.set(entry.id, entry.extra.count);
    // Même entrée et compteur inchangé : suppression par l'auteur lui-même
    if (previous !== undefined && previous === entry.extra.count) return null;
    return entry.executorId;
};

module.exports = async (Client, message) => {
    if (!message.guild || message.author?.bot) return;
    const channel = message.channel;
    if (!channel || !isPublicChannel(Client, channel)) return;

    const executorId = await findDeleter(message);
    const author = message.author;
    const attachments = [...(message.attachments?.values() ?? [])];

    const embed = new EmbedBuilder()
        .setDescription(
            `🗑️ **Un message a été supprimé.**\n\n` +
            `👤 **Auteur :** ${author ? `<@${author.id}> (\`${author.id}\`)` : '*inconnu (message non mis en cache)*'}\n` +
            `📍 **Salon :** ${channelRef(channel)}\n` +
            `🕒 **Envoyé :** ${message.createdTimestamp ? ts(message.createdTimestamp, 'R') : 'inconnu'}\n` +
            `🛡️ **Supprimé par :** ${executorId ? `<@${executorId}>${executorId === Client.user.id ? ' (le bot)' : ''}` : 'son auteur (ou inconnu)'}\n\n` +
            `📄 **Contenu :**\n${message.content ? clip(message.content, 1500) : (message.partial ? '*non disponible (message non mis en cache)*' : '*Pas de contenu texte*')}` +
            (attachments.length ? `\n\n📎 **Pièces jointes (${attachments.length}) :**\n${attachments.slice(0, 10).map(a => `• ${a.name} (${a.contentType ?? 'type inconnu'}, ${(a.size / 1024).toFixed(1)} Ko)`).join('\n')}` : '')
        )
        .setFooter({ text: `ID du message : ${message.id}${author ? ` • ID de l'utilisateur : ${author.id}` : ''}` });
    if (author) embed.setAuthor({ name: author.displayName || author.username, iconURL: author.displayAvatarURL({ dynamic: true }) });
    emitLog(Client, 'textual', embed);

    // Message d'un membre supprimé par un modérateur (hors bot : l'anti-spam a ses propres alertes)
    if (executorId && author && executorId !== author.id && executorId !== Client.user.id) {
        emitLog(Client, 'moderation', new EmbedBuilder()
            .setTitle('🗑️ Message supprimé par un modérateur')
            .setDescription(
                `**Modérateur :** <@${executorId}>\n**Auteur :** <@${author.id}>\n**Salon :** ${channelRef(channel)}\n` +
                `**Contenu :** ${message.content ? clip(message.content, 800) : '*aucun texte*'}`
            ));
    }
};
