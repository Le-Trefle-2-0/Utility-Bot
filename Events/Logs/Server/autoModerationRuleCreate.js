const { EmbedBuilder } = require('discord.js');
const { emitLog, clip } = require('../../../Utility/logging/helpers');

module.exports = async (Client, rule) => {
    emitLog(Client, 'server', new EmbedBuilder()
        .setTitle('🛡️ Règle AutoMod créée')
        .setDescription(`**Nom :** ${clip(rule.name, 100)} (\`${rule.id}\`)\n**Activée :** ${rule.enabled ? 'oui' : 'non'}\n**Créée par :** ${rule.creatorId ? `<@${rule.creatorId}>` : 'inconnu'}\n**Actions :** ${rule.actions.map(a => a.type).join(', ') || 'aucune'}`));
};
