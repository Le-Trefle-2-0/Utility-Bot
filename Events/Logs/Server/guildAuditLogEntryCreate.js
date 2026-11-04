const { EmbedBuilder } = require('discord.js');
const { emitLog, isMainGuild, clip } = require('../../../Utility/logging/helpers');

/**
 * Actions qui n'ont pas d'événement dédié dans discord.js : on les lit directement dans le journal d'audit
 * (reçu en temps réel, avec l'auteur). Nécessite la permission « Voir les logs du serveur ».
 */
const HANDLED = {
    121: { title: '⌨️ Permissions de commande modifiées', fields: 'Les permissions d\'une commande d\'application ont été modifiées.' },
    163: { title: '👋 Accueil : question d\'intégration créée' },
    164: { title: '👋 Accueil : question d\'intégration modifiée' },
    165: { title: '👋 Accueil : question d\'intégration supprimée' },
    166: { title: '👋 Accueil : paramètres d\'intégration créés' },
    167: { title: '👋 Accueil : paramètres d\'intégration modifiés' },
    190: { title: '📊 Tableau de bord communautaire : paramètres créés' },
    191: { title: '📊 Tableau de bord communautaire : paramètres modifiés' }
};

module.exports = async (Client, entry, guild) => {
    if (!isMainGuild(Client, guild)) return;
    const info = HANDLED[entry.action];
    if (!info) return;

    const changes = (entry.changes || []).slice(0, 8)
        .map(change => `• \`${change.key}\` : ${clip(JSON.stringify(change.old) ?? '∅', 120)} → ${clip(JSON.stringify(change.new) ?? '∅', 120)}`)
        .join('\n');
    emitLog(Client, 'server', new EmbedBuilder()
        .setTitle(info.title)
        .setDescription(
            `${info.fields ? `${info.fields}\n` : ''}**Par :** ${entry.executorId ? `<@${entry.executorId}> (\`${entry.executorId}\`)` : 'inconnu'}\n` +
            (entry.targetId ? `**Cible :** \`${entry.targetId}\`\n` : '') +
            (changes ? `**Changements :**\n${changes}` : '')
        ));
};
