const { EmbedBuilder } = require('discord.js');
const { cfg, emitLog, normalizeName, duration, ts } = require('./helpers');

/**
 * Compteurs glissants en mémoire : chaque `hit` retourne le nombre d'occurrences dans la fenêtre.
 */
const windows = new Map();
const hit = (key, windowMs, entry = true) => {
    const now = Date.now();
    const list = (windows.get(key) || []).filter(item => now - item.at < windowMs);
    list.push({ at: now, entry });
    windows.set(key, list);
    return list;
};

const alerted = new Map();
const shouldAlert = (key, cooldownMs = 5 * 60 * 1000) => {
    const last = alerted.get(key) || 0;
    if (Date.now() - last < cooldownMs) return false;
    alerted.set(key, Date.now());
    return true;
};

/**
 * Détection de raid : beaucoup d'arrivées en peu de temps, avec regroupement des comptes similaires.
 * settings.logging.raid = { joins: 5, windowSeconds: 60 }
 */
const trackJoin = (Client, member) => {
    const conf = cfg(Client, 'raid', {});
    const limit = conf.joins ?? 5;
    const windowMs = (conf.windowSeconds ?? 60) * 1000;
    const list = hit(`join:${member.guild.id}`, windowMs, {
        id: member.id, name: member.user.username, createdAt: member.user.createdTimestamp, defaultAvatar: !member.user.avatar
    });
    if (list.length < limit || !shouldAlert(`raid:${member.guild.id}`)) return;

    const names = list.map(item => item.entry);
    const similar = new Set();
    for (let i = 0; i < names.length; i++) {
        for (let j = i + 1; j < names.length; j++) {
            const a = normalizeName(names[i].name);
            const b = normalizeName(names[j].name);
            const prefix = Math.min(a.length, b.length, 5);
            if (prefix >= 4 && a.slice(0, prefix) === b.slice(0, prefix)) {
                similar.add(names[i].name);
                similar.add(names[j].name);
            }
        }
    }
    const recentAccounts = names.filter(item => Date.now() - item.createdAt < 7 * 86400000).length;
    const embed = new EmbedBuilder()
        .setTitle('🚨 Raid possible : arrivées en rafale')
        .setDescription(
            `**${list.length}** membres ont rejoint en moins de ${duration(windowMs)}.\n\n` +
            names.slice(0, 15).map(item => `• <@${item.id}> (\`${item.name}\`) — compte créé ${ts(item.createdAt, 'R')}${item.defaultAvatar ? ' — avatar par défaut' : ''}`).join('\n') +
            `\n\n🆕 **Comptes de moins de 7 jours :** ${recentAccounts}/${list.length}` +
            (similar.size ? `\n👥 **Pseudos similaires :** ${[...similar].slice(0, 10).map(n => `\`${n}\``).join(', ')}` : '')
        );
    emitLog(Client, 'moderation', embed);
};

/**
 * Actions destructrices en rafale (nuke) ou abus de pouvoir (bans de masse).
 * kind : channelDelete, channelCreate, roleDelete, roleCreate, webhook, ban
 */
const LABELS = {
    channelDelete: 'salons supprimés', channelCreate: 'salons créés', roleDelete: 'rôles supprimés',
    roleCreate: 'rôles créés', webhook: 'webhooks créés/modifiés/supprimés', ban: 'bannissements'
};

const trackSensitive = (Client, guild, executorId, kind, label) => {
    if (!executorId || executorId === Client.user?.id) return;
    const conf = cfg(Client, 'nuke', {});
    const limit = conf.threshold ?? (kind === 'ban' ? 3 : 3);
    const windowMs = (conf.windowSeconds ?? 60) * 1000;
    const list = hit(`nuke:${guild.id}:${executorId}:${kind}`, windowMs, label);
    if (list.length < limit || !shouldAlert(`nuke:${guild.id}:${executorId}:${kind}`)) return;

    const embed = new EmbedBuilder()
        .setTitle(kind === 'ban' ? '⚠️ Bannissements de masse' : '🚨 Suppressions / créations en rafale (nuke possible)')
        .setDescription(
            `<@${executorId}> (\`${executorId}\`) a effectué **${list.length}** actions de type *${LABELS[kind]}* en moins de ${duration(windowMs)}.\n\n` +
            list.slice(-10).map(item => `• ${item.entry}`).join('\n')
        );
    emitLog(Client, 'moderation', embed);
};

/**
 * Sessions vocales très courtes répétées (entrées/sorties en boucle).
 */
const trackShortVoiceSession = (Client, member, seconds) => {
    const conf = cfg(Client, 'voiceAbuse', {});
    const maxSeconds = conf.maxSessionSeconds ?? 30;
    if (seconds > maxSeconds) return;
    const limit = conf.sessions ?? 5;
    const windowMs = (conf.windowSeconds ?? 600) * 1000;
    const list = hit(`voice:${member.guild.id}:${member.id}`, windowMs);
    if (list.length < limit || !shouldAlert(`voice:${member.guild.id}:${member.id}`, windowMs)) return;
    emitLog(Client, 'moderation', new EmbedBuilder()
        .setTitle('🔁 Sessions vocales très courtes répétées')
        .setDescription(`<@${member.id}> (\`${member.id}\`) a enchaîné **${list.length}** connexions de moins de ${maxSeconds} s en moins de ${duration(windowMs)} (abus possible).`));
};

module.exports = { hit, shouldAlert, trackJoin, trackSensitive, trackShortVoiceSession };
