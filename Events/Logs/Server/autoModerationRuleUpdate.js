const { EmbedBuilder } = require('discord.js');
const { emitLog, clip, yesNo } = require('../../../Utility/logging/helpers');
const { fetchEntry, executorText } = require('../../../Utility/logging/audit');

module.exports = async (Client, oldRule, newRule) => {
    const lines = [];
    if (oldRule?.name !== newRule.name) lines.push(`**Nom :** ${clip(oldRule?.name, 100)} → ${clip(newRule.name, 100)}`);
    if (oldRule?.enabled !== newRule.enabled) lines.push(`**Activée :** ${yesNo(oldRule?.enabled)} → ${yesNo(newRule.enabled)}`);
    if (JSON.stringify(oldRule?.triggerMetadata) !== JSON.stringify(newRule.triggerMetadata)) lines.push('**Déclencheurs :** modifiés');
    if (JSON.stringify(oldRule?.actions) !== JSON.stringify(newRule.actions)) lines.push('**Actions :** modifiées');
    if (JSON.stringify([...(oldRule?.exemptRoles?.keys() ?? [])]) !== JSON.stringify([...newRule.exemptRoles.keys()]) ||
        JSON.stringify([...(oldRule?.exemptChannels?.keys() ?? [])]) !== JSON.stringify([...newRule.exemptChannels.keys()])) lines.push('**Exceptions :** modifiées');
    if (!lines.length) return;
    const entry = await fetchEntry(newRule.guild, 141, { targetId: newRule.id }); // AutoModerationRuleUpdate
    emitLog(Client, 'server', new EmbedBuilder()
        .setTitle('🛡️ Règle AutoMod modifiée')
        .setDescription(`**Règle :** ${clip(newRule.name, 100)}\n${lines.join('\n')}\n**Par :** ${executorText({ executorId: entry?.executorId }, Client)}`));
};
