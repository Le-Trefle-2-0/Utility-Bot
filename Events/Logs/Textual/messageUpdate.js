const { EmbedBuilder } = require("discord.js");
const { emitLog, isPublicChannel, channelRef, clip } = require('../../../Utility/logging/helpers');
const { inlineDiff } = require('../../../Utility/logging/diff');

/**
 * Message modifié : l'ancien et le nouveau texte sont affichés avec les passages modifiés mis en évidence
 * dans leur contexte (~~supprimé~~ à gauche, **ajouté** à droite), les longues parties inchangées étant abrégées.
 */
module.exports = async (Client, oldMessage, newMessage) => {
    if (!newMessage.guild || oldMessage.author?.bot || newMessage.author?.bot) return;
    const channel = newMessage.channel;
    if (!channel || !isPublicChannel(Client, channel)) return;

    const oldKnown = typeof oldMessage.content === 'string';
    const newKnown = typeof newMessage.content === 'string';
    // Mise à jour sans contenu (aperçu de lien, résolution d'embed…) : rien à signaler
    if (!newKnown) return;

    // Pièces jointes retirées (seulement si l'ancien message était en cache)
    const removedAttachments = oldMessage.attachments && !oldMessage.partial
        ? [...oldMessage.attachments.values()].filter(a => !newMessage.attachments.has(a.id))
        : [];

    const contentChanged = oldKnown ? oldMessage.content !== newMessage.content : true;
    if (oldKnown && !contentChanged && !removedAttachments.length) return;

    const author = newMessage.author ?? oldMessage.author;
    const embed = new EmbedBuilder()
        .setFooter({ text: `ID du message : ${newMessage.id}${author ? ` • ID de l'utilisateur : ${author.id}` : ''}` });
    if (author) embed.setAuthor({ name: author.displayName || author.username, iconURL: author.displayAvatarURL({ dynamic: true }) });

    const header =
        `📝 **Un message a été modifié.** [Aller au message](${newMessage.url})\n\n` +
        `👤 **Auteur :** ${author ? `<@${author.id}> (\`${author.id}\`)` : '*inconnu*'}\n` +
        `📍 **Salon :** ${channelRef(channel)}`;
    embed.setDescription(header);

    if (!oldKnown) {
        // L'ancien contenu n'était pas en cache : on ne peut afficher que le nouveau
        embed.addFields(
            { name: '❌ Avant', value: '*non disponible (message non mis en cache)*' },
            { name: '✅ Après', value: clip(newMessage.content, 1000) || '*vide*' }
        );
    } else if (contentChanged) {
        const diff = inlineDiff(oldMessage.content, newMessage.content);
        if (!diff.changed) return;
        const squash = (text) => text.replace(/\s+/g, ' ').trim();
        const onlyWhitespace = squash(oldMessage.content) === squash(newMessage.content);
        embed.addFields(
            { name: '❌ Avant', value: onlyWhitespace ? '*seuls des espaces / retours à la ligne ont changé*' : (diff.old || '*vide*') },
            { name: '✅ Après', value: onlyWhitespace ? '*(idem)*' : (diff.new || '*vide*') }
        );
        if (!oldMessage.content || !newMessage.content) embed.setFooter({ text: `${embed.data.footer.text} • texte ${newMessage.content ? 'ajouté' : 'entièrement supprimé'}` });
    }

    if (removedAttachments.length) {
        embed.addFields({
            name: '📎 Pièces jointes retirées',
            value: clip(removedAttachments.map(a => `• ${a.name} (${(a.size / 1024).toFixed(1)} Ko)`).join('\n'), 1000)
        });
    }

    emitLog(Client, 'textual', embed);
};
