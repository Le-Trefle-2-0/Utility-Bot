const { EmbedBuilder, PermissionsBitField, ChannelType } = require('discord.js');
const { emitLog, channelRef, channelTypeName, isTicketChannel, permName, batch, yesNo, clip, duration } = require('../../../Utility/logging/helpers');
const { fetchEntry, executorText } = require('../../../Utility/logging/audit');

const STATE = { allow: '✅', deny: '❌', neutral: '⬜' };

const overwriteState = (overwrite, flag) => {
    if (!overwrite) return 'neutral';
    if (overwrite.allow.has(flag)) return 'allow';
    if (overwrite.deny.has(flag)) return 'deny';
    return 'neutral';
};

/** Compare les permissions spécifiques d'un salon, par rôle ou membre. */
const diffOverwrites = (oldChannel, newChannel) => {
    const lines = [];
    const locks = [];
    const ids = new Set([...oldChannel.permissionOverwrites.cache.keys(), ...newChannel.permissionOverwrites.cache.keys()]);
    const lockFlag = newChannel.isVoiceBased() ? 'Connect' : 'SendMessages';

    for (const id of ids) {
        const before = oldChannel.permissionOverwrites.cache.get(id);
        const after = newChannel.permissionOverwrites.cache.get(id);
        const type = (after || before).type; // 0 = rôle, 1 = membre
        const target = type === 0 ? (id === newChannel.guild.id ? '@everyone' : `<@&${id}>`) : `<@${id}>`;

        if (!before) lines.push(`➕ Permissions spécifiques ajoutées pour ${target}`);
        else if (!after) lines.push(`➖ Permissions spécifiques supprimées pour ${target}`);

        const changes = [];
        for (const flag of Object.keys(PermissionsBitField.Flags)) {
            const from = overwriteState(before, flag);
            const to = overwriteState(after, flag);
            if (from === to) continue;
            changes.push(`${permName(flag)} ${STATE[from]}→${STATE[to]}`);
            if (type === 0 && flag === lockFlag) {
                if (to === 'deny' && from !== 'deny') locks.push({ target, locked: true });
                if (from === 'deny' && to !== 'deny') locks.push({ target, locked: false });
            }
        }
        if (changes.length) lines.push(`🔧 ${target} : ${changes.slice(0, 12).join(', ')}${changes.length > 12 ? ` … (+${changes.length - 12})` : ''}`);
    }
    return { lines, locks };
};

module.exports = async (Client, oldChannel, newChannel) => {
    if (!newChannel.guild || isTicketChannel(Client, newChannel)) return;

    const lines = [];
    const add = (label, before, after) => { if (before !== after) lines.push(`**${label} :** ${before} → ${after}`); };

    add('Nom', clip(oldChannel.name, 100), clip(newChannel.name, 100));
    if (oldChannel.type !== newChannel.type) add('Type', channelTypeName(oldChannel), channelTypeName(newChannel));
    add('Catégorie', oldChannel.parent?.name ?? '*aucune*', newChannel.parent?.name ?? '*aucune*');
    if ('topic' in newChannel) add('Sujet', clip(oldChannel.topic, 200), clip(newChannel.topic, 200));
    if ('nsfw' in newChannel) add('Contenu sensible (NSFW)', yesNo(oldChannel.nsfw), yesNo(newChannel.nsfw));
    if ('bitrate' in newChannel) add('Débit', `${Math.round(oldChannel.bitrate / 1000)} kbps`, `${Math.round(newChannel.bitrate / 1000)} kbps`);
    if ('userLimit' in newChannel) add('Limite d\'utilisateurs', oldChannel.userLimit || 'illimitée', newChannel.userLimit || 'illimitée');
    if ('rtcRegion' in newChannel) add('Région vocale', oldChannel.rtcRegion ?? 'automatique', newChannel.rtcRegion ?? 'automatique');
    if ('defaultAutoArchiveDuration' in newChannel) add('Archivage auto. des fils (min)', oldChannel.defaultAutoArchiveDuration ?? 'défaut', newChannel.defaultAutoArchiveDuration ?? 'défaut');

    const slowmodeChanged = 'rateLimitPerUser' in newChannel && oldChannel.rateLimitPerUser !== newChannel.rateLimitPerUser;
    if (slowmodeChanged) add('Mode lent', oldChannel.rateLimitPerUser ? duration(oldChannel.rateLimitPerUser * 1000) : 'désactivé', newChannel.rateLimitPerUser ? duration(newChannel.rateLimitPerUser * 1000) : 'désactivé');

    const { lines: overwriteLines, locks } = diffOverwrites(oldChannel, newChannel);

    // Seule la position a changé : regroupé en un seul log (un déplacement décale les autres salons)
    const positionOnly = !lines.length && !overwriteLines.length && oldChannel.rawPosition !== newChannel.rawPosition;
    if (positionOnly) {
        batch(`chanpos:${newChannel.guild.id}`, 3000, newChannel, async (channels) => {
            const unique = [...new Map(channels.map(channel => [channel.id, channel])).values()];
            const entry = await fetchEntry(newChannel.guild, 11, { maxAge: 20000, delay: 0 });
            emitLog(Client, 'server', new EmbedBuilder()
                .setTitle('📶 Salons réorganisés')
                .setDescription(
                    unique.slice(0, 15).map(channel => `${channelRef(channel)} → position ${channel.rawPosition}`).join('\n') +
                    (unique.length > 15 ? `\n… et ${unique.length - 15} autre(s)` : '') +
                    `\n**Par :** ${executorText({ executorId: entry?.executorId }, Client)}`
                ));
        });
        return;
    }
    if (!lines.length && !overwriteLines.length) return;

    const entry = await fetchEntry(newChannel.guild, undefined, { targetId: newChannel.id, match: e => [11, 13, 14, 15].includes(e.action) });
    const actor = { executorId: entry?.executorId ?? null };
    const byBot = actor.executorId === Client.user.id;

    // Les permissions modifiées par le bot (fermetures planifiées, sanctions) ne sont pas détaillées : elles ont leurs propres logs
    const detail = [...lines, ...(byBot ? [] : overwriteLines)];
    if (detail.length) {
        emitLog(Client, 'server', new EmbedBuilder()
            .setTitle(`📁 ${channelTypeName(newChannel)} modifié(e)`)
            .setDescription(`**Salon :** ${channelRef(newChannel)}\n${detail.join('\n')}\n**Par :** ${executorText(actor, Client)}`)
            .setFooter({ text: `ID du salon : ${newChannel.id}` }));
    }

    if (slowmodeChanged) {
        emitLog(Client, 'textual', new EmbedBuilder()
            .setTitle('🐌 Mode lent modifié')
            .setDescription(
                `**Salon :** ${channelRef(newChannel)}\n` +
                `**Avant :** ${oldChannel.rateLimitPerUser ? duration(oldChannel.rateLimitPerUser * 1000) : 'désactivé'} → **Après :** ${newChannel.rateLimitPerUser ? duration(newChannel.rateLimitPerUser * 1000) : 'désactivé'}\n` +
                `**Par :** ${executorText(actor, Client)}`
            ));
    }

    // Verrouillage / déverrouillage de salons (regroupés)
    for (const lock of locks) {
        batch(`lock:${newChannel.guild.id}:${lock.locked}:${byBot}`, 5000, { channel: newChannel, target: lock.target, actor }, (items) => {
            const unique = [...new Map(items.map(item => [`${item.channel.id}:${item.target}`, item])).values()];
            emitLog(Client, 'moderation', new EmbedBuilder()
                .setTitle(lock.locked ? '🔒 Salon(s) verrouillé(s)' : '🔓 Salon(s) déverrouillé(s)')
                .setDescription(
                    unique.slice(0, 20).map(item => `${channelRef(item.channel)} — ${item.target}`).join('\n') +
                    (unique.length > 20 ? `\n… et ${unique.length - 20} autre(s)` : '') +
                    `\n**Par :** ${executorText(items[0].actor, Client)}${byBot ? ' *(fermeture/ouverture planifiée ou commande)*' : ''}`
                ));
        });
    }
};
