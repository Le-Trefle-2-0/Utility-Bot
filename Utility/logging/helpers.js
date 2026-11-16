const { PermissionFlagsBits, PermissionsBitField, ChannelType, EmbedBuilder } = require('discord.js');

/* ---------- Réglages ---------- */

// Événements désactivés par défaut (trop bruyants) : à activer via settings.logging.enable
const DEFAULT_DISABLED = ['presence'];

/**
 * settings.logging = { enable: ['presence'], disable: ['voiceMute', ...], ... }
 */
const isEnabled = (Client, key) => {
    const cfg = Client.settings?.logging || {};
    if ((cfg.disable || []).includes(key)) return false;
    if (DEFAULT_DISABLED.includes(key)) return (cfg.enable || []).includes(key);
    return true;
};

const cfg = (Client, key, fallback) => Client.settings?.logging?.[key] ?? fallback;

/* ---------- Formatage ---------- */

const sleep = (time) => new Promise(resolve => setTimeout(resolve, time));

const ts = (date, style = 'f') => {
    const value = date instanceof Date ? date.getTime() : Number(date);
    if (!value) return 'inconnu';
    return `<t:${Math.floor(value / 1000)}:${style}>`;
};

const tsFull = (date) => `${ts(date, 'f')} (${ts(date, 'R')})`;

/** Durée lisible en français : « 2 j 3 h 4 min ». */
const duration = (milliseconds) => {
    let seconds = Math.max(0, Math.round(milliseconds / 1000));
    if (seconds < 1) return 'moins d\'une seconde';
    const parts = [];
    for (const [label, size] of [['j', 86400], ['h', 3600], ['min', 60], ['s', 1]]) {
        const amount = Math.floor(seconds / size);
        if (amount > 0) {
            parts.push(`${amount} ${label}`);
            seconds -= amount * size;
        }
    }
    return parts.slice(0, 3).join(' ');
};

const clip = (text, max = 1000) => {
    if (text === null || text === undefined || text === '') return '*vide*';
    text = String(text);
    return text.length > max ? `${text.slice(0, max - 1)}…` : text;
};

const mention = (user) => user ? `<@${user.id ?? user}> (\`${user.id ?? user}\`)` : '*inconnu*';
const channelRef = (channel) => channel ? `<#${channel.id ?? channel}> (\`${channel.id ?? channel}\`)` : '*aucun*';
const roleRef = (role) => role ? `<@&${role.id ?? role}>` : '*aucun*';
const yesNo = (value) => value ? 'oui' : 'non';

/** Embed de base : auteur = personne concernée, pied de page = identifiant. */
const baseEmbed = ({ title, description, user, footer, color } = {}) => {
    const embed = new EmbedBuilder();
    if (title) embed.setTitle(title);
    if (description) embed.setDescription(clip(description, 4000));
    if (user) {
        embed.setAuthor({
            name: user.displayName || user.username || 'Utilisateur',
            iconURL: user.displayAvatarURL?.({ dynamic: true })
        });
        embed.setFooter({ text: footer || `ID de l'utilisateur : ${user.id}` });
    } else if (footer) {
        embed.setFooter({ text: footer });
    }
    if (color) embed.setColor(color);
    return embed;
};

/* ---------- Permissions (noms français) ---------- */

const PERMISSION_NAMES = {
    CreateInstantInvite: 'Créer une invitation', KickMembers: 'Expulser des membres', BanMembers: 'Bannir des membres',
    Administrator: 'Administrateur', ManageChannels: 'Gérer les salons', ManageGuild: 'Gérer le serveur',
    AddReactions: 'Ajouter des réactions', ViewAuditLog: 'Voir les logs du serveur', PrioritySpeaker: 'Voix prioritaire',
    Stream: 'Vidéo / partage d\'écran', ViewChannel: 'Voir le salon', SendMessages: 'Envoyer des messages',
    SendTTSMessages: 'Messages TTS', ManageMessages: 'Gérer les messages', EmbedLinks: 'Intégrer des liens',
    AttachFiles: 'Joindre des fichiers', ReadMessageHistory: 'Voir l\'historique', MentionEveryone: 'Mentionner @everyone',
    UseExternalEmojis: 'Émojis externes', ViewGuildInsights: 'Voir les analyses du serveur', Connect: 'Se connecter',
    Speak: 'Parler', MuteMembers: 'Rendre muet', DeafenMembers: 'Mettre en sourdine', MoveMembers: 'Déplacer des membres',
    UseVAD: 'Détection de la voix', ChangeNickname: 'Changer de pseudo', ManageNicknames: 'Gérer les pseudos',
    ManageRoles: 'Gérer les rôles', ManageWebhooks: 'Gérer les webhooks', ManageGuildExpressions: 'Gérer les expressions',
    UseApplicationCommands: 'Utiliser les commandes', RequestToSpeak: 'Demander à parler',
    ManageEvents: 'Gérer les événements', ManageThreads: 'Gérer les fils', CreatePublicThreads: 'Créer des fils publics',
    CreatePrivateThreads: 'Créer des fils privés', UseExternalStickers: 'Stickers externes',
    SendMessagesInThreads: 'Écrire dans les fils', UseEmbeddedActivities: 'Utiliser les activités',
    ModerateMembers: 'Exclure temporairement des membres', ViewCreatorMonetizationAnalytics: 'Analyses de monétisation',
    UseSoundboard: 'Utiliser la soundboard', CreateGuildExpressions: 'Créer des expressions', CreateEvents: 'Créer des événements',
    UseExternalSounds: 'Sons externes', SendVoiceMessages: 'Messages vocaux', SendPolls: 'Créer des sondages',
    UseExternalApps: 'Applications externes', PinMessages: 'Épingler des messages', BypassSlowmode: 'Ignorer le mode lent'
};

const permName = (flag) => PERMISSION_NAMES[flag] || flag;

/** Permissions qui font d'un rôle un rôle de modération / à risque. */
const MODERATION_PERMISSIONS = [
    'Administrator', 'ManageGuild', 'ManageRoles', 'ManageChannels', 'KickMembers', 'BanMembers',
    'ModerateMembers', 'ManageMessages', 'ManageWebhooks', 'ViewAuditLog', 'MentionEveryone', 'ManageNicknames'
];
const DANGEROUS_PERMISSIONS = ['Administrator', 'ManageGuild', 'ManageRoles', 'ManageChannels', 'BanMembers', 'KickMembers', 'ManageWebhooks'];

const permsList = (permissions) => new PermissionsBitField(permissions).toArray();

/** { added, removed } entre deux masques de permissions. */
const diffPermissions = (oldPerms, newPerms) => {
    const before = new Set(permsList(oldPerms));
    const after = new Set(permsList(newPerms));
    return {
        added: [...after].filter(p => !before.has(p)),
        removed: [...before].filter(p => !after.has(p))
    };
};

/* ---------- Salons ---------- */

const CHANNEL_TYPE_NAMES = {
    [ChannelType.GuildText]: 'Salon textuel', [ChannelType.GuildVoice]: 'Salon vocal',
    [ChannelType.GuildCategory]: 'Catégorie', [ChannelType.GuildAnnouncement]: 'Salon d\'annonces',
    [ChannelType.GuildStageVoice]: 'Salon de conférence', [ChannelType.GuildForum]: 'Forum',
    [ChannelType.GuildMedia]: 'Salon média', [ChannelType.PublicThread]: 'Fil public',
    [ChannelType.PrivateThread]: 'Fil privé', [ChannelType.AnnouncementThread]: 'Fil d\'annonces'
};
const channelTypeName = (channel) => CHANNEL_TYPE_NAMES[channel.type] || 'Salon';

/** Les salons de tickets ne sont jamais journalisés en détail (confidentialité + bruit). */
const isTicketChannel = (Client, channel) => {
    const categoryID = Client.settings?.tickets?.categoryID;
    return Boolean(categoryID && (channel.parentId === categoryID || channel.id === categoryID));
};

/** Un salon est « public » s'il est visible du rôle public (@everyone par défaut). */
const isPublicChannel = (Client, channel) => {
    if (!channel?.guild) return false;
    const base = channel.isThread?.() ? channel.parent : channel;
    if (!base || isTicketChannel(Client, base)) return false;
    if (channel.type === ChannelType.PrivateThread) return false;
    const roleID = Client.settings?.publicRoleID || channel.guild.id;
    return Boolean(base.permissionsFor?.(roleID)?.has(PermissionFlagsBits.ViewChannel));
};

/* ---------- Divers ---------- */

const isMainGuild = (Client, guild) => Boolean(guild) && guild.id === Client.settings?.mainGuildID;

/** Regroupe des éléments arrivant en rafale en un seul envoi. */
const batches = new Map();
const batch = (key, delay, item, flush) => {
    let entry = batches.get(key);
    if (!entry) {
        entry = { items: [], timer: null };
        batches.set(key, entry);
    }
    entry.items.push(item);
    clearTimeout(entry.timer);
    entry.timer = setTimeout(() => {
        batches.delete(key);
        Promise.resolve(flush(entry.items)).catch(() => null);
    }, delay);
};

/** Normalise un pseudo pour comparer (accents, leet speak, séparateurs). */
const normalizeName = (name) => String(name || '')
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[0@]/g, 'o').replace(/[1!|]/g, 'i').replace(/3/g, 'e').replace(/[4]/g, 'a').replace(/[5$]/g, 's').replace(/7/g, 't')
    .replace(/[^a-z]/g, '');

/** Envoie sans jamais lever d'erreur. */
const emitLog = (Client, category, embeds, components = [], files = []) => {
    Client.emit('logs', category, embeds, components, files);
};

module.exports = {
    isEnabled, cfg, sleep, ts, tsFull, duration, clip, mention, channelRef, roleRef, yesNo, baseEmbed,
    permName, permsList, diffPermissions, MODERATION_PERMISSIONS, DANGEROUS_PERMISSIONS,
    channelTypeName, isTicketChannel, isPublicChannel, isMainGuild, batch, normalizeName, emitLog
};
