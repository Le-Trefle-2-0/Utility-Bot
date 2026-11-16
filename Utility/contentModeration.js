/**
 * Modération des salons publics par le modèle de décision (d3-flash, plus petit et plus rapide
 * que d3-ultra utilisé pour les tickets).
 *
 * Chaque message est examiné pour y repérer :
 *   - une arnaque (scam, phishing, escroquerie crypto, faux cadeaux…)  -> boutons Timeout 7j / Ban
 *   - des informations personnelles sensibles (santé, traitements…)    -> simple alerte aux modérateurs
 *   - un contenu inapproprié                                           -> simple alerte aux modérateurs
 *
 * Réglages (settings.json > contentModeration) :
 *   enabled              (true)   désactive l'analyse si false
 *   model                ("vllm-sr/d3-flash")
 *   timeoutSeconds       (5)      délai maximal d'attente du modèle
 *   minLength            (12)     taille minimale d'un message analysé
 *   thresholds           seuils de probabilité par catégorie
 *                        { scam: 0.7, personalInfo: 0.6, inappropriate: 0.6 }
 *   ignoredChannels      salons à ne jamais analyser
 */

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField } = require('discord.js');
const { getDecisionSettings, askDecisionModel } = require('./decisionModel');
const sendLog = require('../Events/Logs/logs.js');

const DEFAULTS = {
    enabled: true,
    model: 'vllm-sr/d3-flash',
    timeoutSeconds: 5,
    minLength: 12,
    thresholds: { scam: 0.7, personalInfo: 0.6, inappropriate: 0.6 }
};

const CATEGORIES = {
    scam: { label: 'Arnaque', emoji: '🚨', color: 'db3226' },
    personalInfo: { label: 'Informations personnelles sensibles', emoji: '🔒', color: 'ce7e00' },
    inappropriate: { label: 'Contenu inapproprié', emoji: '⚠️', color: 'ce7e00' }
};

const getSettings = (Client) => {
    const s = Client.settings.contentModeration || {};
    return {
        enabled: s.enabled ?? DEFAULTS.enabled,
        model: s.model || DEFAULTS.model,
        timeoutMs: (s.timeoutSeconds ?? DEFAULTS.timeoutSeconds) * 1000,
        minLength: s.minLength ?? DEFAULTS.minLength,
        thresholds: { ...DEFAULTS.thresholds, ...(s.thresholds || {}) },
        ignoredChannels: s.ignoredChannels || []
    };
};

const QUESTION = {
    verdict: {
        type: 'choice',
        instructions: "Tu modères les salons PUBLICS d'un serveur Discord francophone : une association d'écoute et de soutien moral (santé mentale). Les échanges de santé se font en privé avec les bénévoles écoutants, jamais en public : tout message qui révèle publiquement des informations de santé, même brièvement, même pour encourager quelqu'un, doit être signalé. Classe le message selon le critère qui correspond le mieux. Exprimer simplement une émotion (tristesse, fatigue, stress, solitude) sans rien de médical reste « safe ».",
        criteria: {
            safe: "Message normal : discussion, humour, remerciement, question banale, soutien ou encouragement général, simple expression d'une émotion ou d'un ressenti sans élément médical. Les informations personnelles légères sont autorisées : prénom, âge, pays ou ville approximative, métier, études, passions.",
            scam: "Arnaque ou tentative de piratage : faux cadeau ou faux Nitro, investissement ou crypto miracle, gains rapides garantis, faux partenariat, lien de phishing ou raccourci suspect, demande d'identifiants ou de paiement, démarchage de masse, invitation vers un autre serveur ou une messagerie privée pour gagner de l'argent.",
            personalInfo: "Le membre révèle publiquement, pour lui-même ou un tiers, une information de santé, même courte ou mentionnée en passant : un diagnostic ou un trouble nommé (dépression, TSPT, TSA, TDAH, bipolarité, troubles alimentaires, anxiété diagnostiquée…), un suivi ou un besoin de suivi psychologique ou psychiatrique, un traitement ou des médicaments, un séjour à l'hôpital ou en clinique, une tentative de suicide passée ou des idées suicidaires vécues, des examens ou résultats. Cela inclut aussi les coordonnées privées (adresse, téléphone, e-mail, nom complet avec lieu précis) et les démêlés judiciaires ou conflits privés détaillés. Un témoignage personnel bienveillant qui raconte son propre parcours de soins est donc à signaler, malgré ses bonnes intentions.",
            inappropriate: "Contenu inapproprié : incitation au suicide ou à l'automutilation, proposition de suicide ou de pacte collectif, méthodes détaillées, glorification de ces actes, plaisanterie sur le suicide ; insultes, harcèlement, discours haineux ou discriminatoire, contenu sexuel ou pornographique, violence gratuite, apologie de drogues, menaces."
        }
    }
};

// Salon visible par tout le monde (@everyone) : exclut tickets, salons d'équipe et salons privés
const isPublicChannel = (channel) => {
    const target = channel.isThread?.() ? channel.parent : channel;
    if (!target || !target.permissionsFor) return false;
    return !!target.permissionsFor(channel.guild.roles.everyone)?.has(PermissionsBitField.Flags.ViewChannel);
};

/**
 * Analyse un message. Ne lève jamais d'erreur : en cas de panne du modèle, le message passe.
 * @returns {Promise<{category: string, probability: number} | null>} la catégorie signalée, sinon null
 */
const scanMessage = async (Client, message) => {
    const settings = getSettings(Client);
    const content = message.content?.trim();

    if (!settings.enabled || !content || content.length < settings.minLength) return null;
    if (!getDecisionSettings(Client).apiKey) return null;
    if (settings.ignoredChannels.includes(message.channel.id) || settings.ignoredChannels.includes(message.channel.parentId)) return null;
    if (!isPublicChannel(message.channel)) return null;
    // L'équipe de modération n'est pas surveillée
    if (message.member?.permissions.has(PermissionsBitField.Flags.ModerateMembers)) return null;

    try {
        const answers = await askDecisionModel(Client, {
            model: settings.model,
            timeoutMs: settings.timeoutMs,
            state: `Message à examiner (salon #${message.channel.name}) :\n« ${content.slice(0, 1500)} »`,
            questions: QUESTION
        });

        const probabilities = answers.verdict?.probabilities;
        if (!probabilities || typeof probabilities !== 'object') throw new Error('Decision model: unexpected response');

        const best = Object.keys(CATEGORIES)
            .map(category => ({ category, probability: Number(probabilities[category]) || 0 }))
            .filter(r => r.probability >= settings.thresholds[r.category])
            .sort((a, b) => b.probability - a.probability)[0];

        return best || null;
    } catch (error) {
        Client.log?.warn?.(`[Modération IA] ${error.message}`);
        return null;
    }
};

// Envoie l'alerte dans les logs textuels (avec boutons de sanction pour les arnaques)
const sendAlert = async (Client, message, { category, probability }) => {
    const info = CATEGORIES[category];
    const isScam = category === 'scam';
    const percent = Math.round(probability * 100);

    const embed = new EmbedBuilder()
        .setColor(info.color)
        .setTitle(`${info.emoji} ${info.label} détecté(e) — ${percent} % de certitude`)
        .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL() })
        .addFields(
            { name: 'Membre', value: `${message.author} (${message.author.id})`, inline: true },
            { name: 'Salon', value: `<#${message.channel.id}>`, inline: true },
            { name: 'Action', value: isScam ? '🛡️ Choisir une sanction ci-dessous' : '👀 Alerte pour les modérateurs, aucune sanction automatique', inline: false },
            { name: 'Contenu', value: `\`\`\`${message.content.replace(/`/g, "'").slice(0, 1000)}\`\`\`` }
        )
        .setFooter({ text: 'Modération IA (d3-flash)' });

    const row = new ActionRowBuilder().addComponents(new ButtonBuilder()
        .setLabel('Voir le message')
        .setStyle(ButtonStyle.Link)
        .setURL(message.url));

    if (isScam) {
        row.addComponents(
            new ButtonBuilder().setCustomId(`modscan_timeout_${message.author.id}`).setLabel('Timeout 7 jours').setEmoji('⏳').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId(`modscan_ban_${message.author.id}`).setLabel('Bannir').setEmoji('🔨').setStyle(ButtonStyle.Danger)
        );
    }

    await sendLog(Client, 'textual', embed, [row]);
};

/** Analyse un message et alerte les modérateurs si nécessaire (à appeler sans await) */
const handleContentModeration = async (Client, message) => {
    const result = await scanMessage(Client, message);
    if (!result) return;
    Client.log?.info?.(`[Modération IA] ${result.category}=${result.probability.toFixed(2)} (${message.author.tag})`);
    await sendAlert(Client, message, result);
};

module.exports = { handleContentModeration, scanMessage };
