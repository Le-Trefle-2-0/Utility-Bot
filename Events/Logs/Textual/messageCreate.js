const { EmbedBuilder } = require('discord.js');
const { emitLog, isPublicChannel, channelRef, clip, cfg, duration } = require('../../../Utility/logging/helpers');
const { isStaffMember } = require('../../../Utility/logging/memberIntel');

const SUSPICIOUS_EXTENSIONS = new Set([
    'exe', 'scr', 'bat', 'cmd', 'com', 'msi', 'jar', 'apk', 'vbs', 'ps1', 'js', 'jse', 'wsf', 'lnk', 'dll', 'reg', 'sh', 'dmg', 'pkg', 'app',
    'zip', 'rar', '7z', 'tar', 'gz', 'iso', 'docm', 'xlsm', 'html', 'htm', 'svg'
]);
const SHORTENERS = ['bit.ly', 'tinyurl.com', 't.co', 'goo.gl', 'ow.ly', 'is.gd', 'cutt.ly', 'rb.gy', 'shorturl.at', 't.ly', 'buff.ly', 'tiny.cc', 'rebrand.ly', 'lnkd.in'];
const INVITE_REGEX = /(?:discord\.gg|discord(?:app)?\.com\/invite|dsc\.gg)\/([a-z0-9-]+)/gi;
const URL_REGEX = /https?:\/\/([^\s/<>)]+)[^\s<>)]*/gi;
const LOOKALIKE = /(discord|disc0rd|steam|nitro|gift)[^.]*\.(?!com\/?$)/i;
const OFFICIAL = ['discord.com', 'discord.gg', 'discordapp.com', 'discord.media', 'steamcommunity.com', 'steampowered.com'];

const strip = (text) => text.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase();

/**
 * Analyse (journalisation uniquement) des messages des salons publics : pièces jointes à risque, liens suspects,
 * invitations vers d'autres serveurs, mentions de masse, appels à la modération, bots/webhooks, mots interdits.
 * Les doublons avec l'anti-spam existant (messageCreate.js) sont volontairement évités : spam, flood et mentions
 * excessives y sont déjà traités et alertés.
 */
module.exports = async (Client, message) => {
    if (!message.guild || message.author?.id === Client.user.id) return;
    if (!isPublicChannel(Client, message.channel)) return;

    const flags = [];
    const moderationFlags = [];

    // Bots et webhooks hors des salons autorisés (désactivé tant que settings.logging.botMessageChannels est absent)
    const allowedBotChannels = cfg(Client, 'botMessageChannels', null);
    if ((message.author?.bot || message.webhookId) && allowedBotChannels) {
        if (!allowedBotChannels.includes(message.channelId) && !allowedBotChannels.includes(message.channel.parentId)) {
            flags.push(`🤖 ${message.webhookId ? 'Webhook' : 'Bot'} actif dans un salon non autorisé`);
        }
    }
    if (message.author?.bot || message.webhookId) return finish(Client, message, flags, moderationFlags);

    const member = message.member;
    if (member && isStaffMember(member)) return;

    // Pièces jointes
    for (const attachment of message.attachments.values()) {
        const extension = (attachment.name?.split('.').pop() || '').toLowerCase();
        if (SUSPICIOUS_EXTENSIONS.has(extension)) {
            flags.push(`📎 Fichier à risque : \`${clip(attachment.name, 60)}\` (${attachment.contentType ?? 'type inconnu'}, ${(attachment.size / 1024).toFixed(1)} Ko)`);
        } else if (attachment.size > 25 * 1024 * 1024) {
            flags.push(`📎 Fichier volumineux : \`${clip(attachment.name, 60)}\` (${(attachment.size / 1048576).toFixed(1)} Mo)`);
        }
    }

    const content = message.content || '';
    const domains = [...content.matchAll(URL_REGEX)].map(match => match[1].toLowerCase().replace(/^www\./, ''));

    // Invitations vers d'autres serveurs
    const ownCodes = new Set([...(Client.invites?.get(message.guild.id)?.keys() ?? []), message.guild.vanityURLCode].filter(Boolean));
    const foreignInvites = [...content.matchAll(INVITE_REGEX)].map(match => match[1]).filter(code => !ownCodes.has(code));
    if (foreignInvites.length) flags.push(`🔗 Invitation vers un autre serveur : ${foreignInvites.slice(0, 3).map(code => `\`${code}\``).join(', ')}`);

    // Raccourcisseurs et domaines suspects
    const shortened = domains.filter(domain => SHORTENERS.includes(domain));
    if (shortened.length) flags.push(`🔗 Lien raccourci : ${[...new Set(shortened)].join(', ')}`);
    const custom = cfg(Client, 'suspiciousDomains', []);
    const suspicious = domains.filter(domain => custom.some(bad => domain === bad || domain.endsWith(`.${bad}`)) || (LOOKALIKE.test(domain) && !OFFICIAL.some(ok => domain === ok || domain.endsWith(`.${ok}`))));
    if (suspicious.length) flags.push(`⚠️ Domaine suspect : ${[...new Set(suspicious)].slice(0, 3).join(', ')}`);

    // Membre arrivé récemment avec un lien
    const newMemberMinutes = cfg(Client, 'newMemberLinkMinutes', 24 * 60);
    if (domains.length && member?.joinedTimestamp && Date.now() - member.joinedTimestamp < newMemberMinutes * 60000) {
        flags.push(`🆕 Lien posté par un membre arrivé il y a ${duration(Date.now() - member.joinedTimestamp)}`);
    }

    // Mentions de masse
    if (/@(everyone|here)/.test(content) && !content.includes('`@')) {
        const allowed = member?.permissions.has('MentionEveryone');
        flags.push(`📢 Mention de masse (@everyone / @here)${allowed ? '' : ' — sans la permission'}`);
    }

    // Rôles sensibles (équipe) mentionnés : appel à la modération
    const sensitiveRoles = new Set(cfg(Client, 'sensitiveRoles', (Client.settings?.tickets?.teams || []).flatMap(team => team.roleIDs || [])));
    const calledRoles = message.mentions.roles.filter(role => sensitiveRoles.has(role.id));
    if (calledRoles.size) {
        flags.push(`🚨 Rôle sensible mentionné : ${calledRoles.map(role => `<@&${role.id}>`).join(' ')}`);
        moderationFlags.push(`🚨 **Appel à la modération** de <@${message.author.id}> dans ${channelRef(message.channel)} : ${calledRoles.map(role => `<@&${role.id}>`).join(' ')}\n[Aller au message](${message.url})\n${clip(content, 400)}`);
    }

    // Mots interdits (liste personnalisée dans settings.logging.bannedWords)
    const banned = cfg(Client, 'bannedWords', []);
    if (banned.length && content) {
        const text = strip(content);
        const hit = banned.filter(word => new RegExp(`(^|[^a-z0-9])${strip(word).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z0-9]|$)`).test(text));
        if (hit.length) flags.push(`🤬 Mot interdit détecté : ${hit.slice(0, 3).map(word => `\`${word}\``).join(', ')}`);
    }

    finish(Client, message, flags, moderationFlags);
};

function finish(Client, message, flags, moderationFlags) {
    if (flags.length) {
        const embed = new EmbedBuilder()
            .setTitle('🔎 Message à surveiller')
            .setDescription(
                `**Auteur :** <@${message.author.id}> (\`${message.author.id}\`)\n**Salon :** ${channelRef(message.channel)}\n[Aller au message](${message.url})\n\n` +
                flags.map(flag => `• ${flag}`).join('\n') + `\n\n**Contenu :** ${clip(message.content, 500)}`
            )
            .setFooter({ text: `ID du message : ${message.id}` });
        emitLog(Client, 'textual', embed);
    }
    for (const description of moderationFlags) {
        emitLog(Client, 'moderation', new EmbedBuilder().setTitle('🚨 Appel à la modération').setDescription(description));
    }
}
