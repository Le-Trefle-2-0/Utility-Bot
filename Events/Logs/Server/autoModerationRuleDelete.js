const { EmbedBuilder } = require('discord.js');
const { emitLog, clip } = require('../../../Utility/logging/helpers');
const { fetchEntry, executorText } = require('../../../Utility/logging/audit');

module.exports = async (Client, rule) => {
    const entry = await fetchEntry(rule.guild, 142, { targetId: rule.id }); // AutoModerationRuleDelete
    emitLog(Client, 'server', new EmbedBuilder()
        .setTitle('🛡️ Règle AutoMod supprimée')
        .setDescription(`**Nom :** ${clip(rule.name, 100)} (\`${rule.id}\`)\n**Par :** ${executorText({ executorId: entry?.executorId }, Client)}`));
};
