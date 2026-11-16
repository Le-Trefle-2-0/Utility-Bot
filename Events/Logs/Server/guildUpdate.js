const { EmbedBuilder } = require('discord.js');
const { emitLog, channelRef, clip, yesNo, duration, ts } = require('../../../Utility/logging/helpers');
const { fetchEntry, executorText } = require('../../../Utility/logging/audit');

const VERIFICATION = ['Aucune', 'Faible (e-mail vérifié)', 'Moyenne (inscrit depuis 5 min)', 'Élevée (membre depuis 10 min)', 'Très élevée (téléphone vérifié)'];
const FILTER = ['Désactivé', 'Membres sans rôle', 'Tous les membres'];
const NOTIFS = ['Tous les messages', 'Mentions uniquement'];
const FEATURE_NAMES = {
    COMMUNITY: 'Communauté', DISCOVERABLE: 'Découverte', INVITES_DISABLED: 'Invitations suspendues', RAID_ALERTS_DISABLED: 'Alertes de raid désactivées',
    VANITY_URL: 'URL personnalisée', VERIFIED: 'Vérifié', PARTNERED: 'Partenaire', WELCOME_SCREEN_ENABLED: 'Écran d\'accueil',
    MEMBER_VERIFICATION_GATE_ENABLED: 'Filtrage des membres', PREVIEW_ENABLED: 'Aperçu', ANIMATED_ICON: 'Icône animée', BANNER: 'Bannière',
    NEWS: 'Annonces', ROLE_ICONS: 'Icônes de rôles', SOUNDBOARD: 'Soundboard', ENHANCED_ROLE_COLORS: 'Couleurs de rôles avancées'
};
const featureName = (feature) => FEATURE_NAMES[feature] || feature;

module.exports = async (Client, oldGuild, newGuild) => {
    const lines = [];
    const add = (label, before, after) => { if (before !== after) lines.push(`**${label} :** ${before} → ${after}`); };

    add('Nom', clip(oldGuild.name, 100), clip(newGuild.name, 100));
    add('Description', clip(oldGuild.description, 200), clip(newGuild.description, 200));
    if (oldGuild.icon !== newGuild.icon) lines.push(`**Icône :** modifiée ${newGuild.icon ? `([voir](${newGuild.iconURL({ size: 512 })}))` : '(retirée)'}`);
    if (oldGuild.banner !== newGuild.banner) lines.push(`**Bannière :** modifiée ${newGuild.banner ? `([voir](${newGuild.bannerURL({ size: 512 })}))` : '(retirée)'}`);
    if (oldGuild.splash !== newGuild.splash) lines.push(`**Image d'invitation :** modifiée ${newGuild.splash ? `([voir](${newGuild.splashURL({ size: 512 })}))` : '(retirée)'}`);
    if (oldGuild.discoverySplash !== newGuild.discoverySplash) lines.push('**Image de découverte :** modifiée');
    add('Région vocale par défaut', oldGuild.preferredLocale, newGuild.preferredLocale);
    add('Niveau de vérification', VERIFICATION[oldGuild.verificationLevel], VERIFICATION[newGuild.verificationLevel]);
    add('Filtre de contenu explicite', FILTER[oldGuild.explicitContentFilter], FILTER[newGuild.explicitContentFilter]);
    add('Notifications par défaut', NOTIFS[oldGuild.defaultMessageNotifications], NOTIFS[newGuild.defaultMessageNotifications]);
    add('Salon AFK', channelRef(oldGuild.afkChannelId), channelRef(newGuild.afkChannelId));
    add('Délai AFK', duration(oldGuild.afkTimeout * 1000), duration(newGuild.afkTimeout * 1000));
    add('Salon des messages système', channelRef(oldGuild.systemChannelId), channelRef(newGuild.systemChannelId));
    add('Salon du règlement', channelRef(oldGuild.rulesChannelId), channelRef(newGuild.rulesChannelId));
    add('Salon des mises à jour de la communauté', channelRef(oldGuild.publicUpdatesChannelId), channelRef(newGuild.publicUpdatesChannelId));
    add('Salon des alertes de sécurité', channelRef(oldGuild.safetyAlertsChannelId), channelRef(newGuild.safetyAlertsChannelId));
    add('Authentification à deux facteurs requise (modération)', yesNo(oldGuild.mfaLevel), yesNo(newGuild.mfaLevel));
    add('Propriétaire', `<@${oldGuild.ownerId}>`, `<@${newGuild.ownerId}>`);
    if (oldGuild.vanityURLCode !== newGuild.vanityURLCode) {
        lines.push(`**URL personnalisée :** ${oldGuild.vanityURLCode ? `\`${oldGuild.vanityURLCode}\`` : '*aucune*'} → ${newGuild.vanityURLCode ? `\`${newGuild.vanityURLCode}\`` : '*aucune*'}`);
    }

    // Niveau de boost
    const boostLines = [];
    if (oldGuild.premiumTier !== newGuild.premiumTier) {
        boostLines.push(`🏆 **Niveau de boost :** ${oldGuild.premiumTier} → ${newGuild.premiumTier} (${newGuild.premiumSubscriptionCount ?? 0} boosts)`);
    }

    // Fonctionnalités activées / désactivées
    const featuresAdded = newGuild.features.filter(feature => !oldGuild.features.includes(feature));
    const featuresRemoved = oldGuild.features.filter(feature => !newGuild.features.includes(feature));
    if (featuresAdded.length) lines.push(`➕ **Fonctionnalités activées :** ${featuresAdded.map(featureName).join(', ')}`);
    if (featuresRemoved.length) lines.push(`➖ **Fonctionnalités désactivées :** ${featuresRemoved.map(featureName).join(', ')}`);

    // Incidents Discord : invitations / MP suspendus, raid détecté
    const incidentLines = [];
    const oldInc = oldGuild.incidentsData;
    const newInc = newGuild.incidentsData;
    const incidentChange = (key, label) => {
        const before = oldInc?.[key]?.getTime?.() ?? null;
        const after = newInc?.[key]?.getTime?.() ?? null;
        if (before !== after && after) incidentLines.push(`${label} jusqu'à ${ts(after, 'f')} (${ts(after, 'R')})`);
        if (before !== after && !after && before) incidentLines.push(`${label} : levée`);
    };
    incidentChange('invitesDisabledUntil', '⏸️ **Invitations suspendues**');
    incidentChange('dmsDisabledUntil', '⏸️ **Messages privés entre membres suspendus**');
    if (newInc?.raidDetectedAt && newInc.raidDetectedAt?.getTime?.() !== oldInc?.raidDetectedAt?.getTime?.()) {
        incidentLines.push(`🚨 **Raid détecté par Discord** ${ts(newInc.raidDetectedAt, 'R')}`);
    }
    if (newInc?.dmSpamDetectedAt && newInc.dmSpamDetectedAt?.getTime?.() !== oldInc?.dmSpamDetectedAt?.getTime?.()) {
        incidentLines.push(`🚨 **Spam de messages privés détecté par Discord** ${ts(newInc.dmSpamDetectedAt, 'R')}`);
    }

    if (!lines.length && !boostLines.length && !incidentLines.length) return;

    const entry = await fetchEntry(newGuild, 1, { maxAge: 10000 }); // GuildUpdate
    const actor = { executorId: entry?.executorId ?? null, viaBot: false };
    const byText = incidentLines.length && !entry ? 'Discord (automatique)' : executorText(actor, Client);

    if (lines.length) {
        emitLog(Client, 'server', new EmbedBuilder()
            .setTitle('⚙️ Paramètres du serveur modifiés')
            .setDescription(`${lines.join('\n')}\n\n🛡️ **Par :** ${byText}`)
            .setFooter({ text: `ID du serveur : ${newGuild.id}` }));
    }
    if (boostLines.length) {
        emitLog(Client, 'server', new EmbedBuilder().setTitle('🚀 Niveau de boost modifié').setDescription(boostLines.join('\n')));
    }
    if (incidentLines.length) {
        emitLog(Client, 'moderation', new EmbedBuilder()
            .setTitle('🚨 Alerte de sécurité Discord')
            .setDescription(incidentLines.join('\n'))
            .setColor('c1121f'));
    }

    // Niveau de vérification modifié : aussi côté modération (manuellement ou automatiquement)
    if (oldGuild.verificationLevel !== newGuild.verificationLevel) {
        emitLog(Client, 'moderation', new EmbedBuilder()
            .setTitle('🛂 Niveau de vérification modifié')
            .setDescription(`${VERIFICATION[oldGuild.verificationLevel]} → ${VERIFICATION[newGuild.verificationLevel]}\n**Par :** ${entry ? executorText(actor, Client) : 'automatique (Discord)'}`));
    }
};
