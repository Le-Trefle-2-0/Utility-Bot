const { EmbedBuilder, AutoModerationActionType } = require('discord.js');
const { emitLog, clip, channelRef, isPublicChannel } = require('../../../Utility/logging/helpers');

const ACTIONS = {
    [AutoModerationActionType.BlockMessage]: '🚫 Message bloqué',
    [AutoModerationActionType.SendAlertMessage]: '🔔 Alerte envoyée',
    [AutoModerationActionType.Timeout]: '🔇 Membre exclu temporairement',
    [AutoModerationActionType.BlockMemberInteraction]: '⛔ Interactions du membre bloquées'
};

/** Contenu bloqué par AutoMod : règle, contenu, action. Le contenu n'est affiché que pour les salons publics. */
module.exports = async (Client, execution) => {
    const rule = execution.guild.autoModerationRules.cache.get(execution.ruleId);
    const channel = execution.channelId ? execution.guild.channels.cache.get(execution.channelId) : null;
    const showContent = channel && isPublicChannel(Client, channel);
    const action = ACTIONS[execution.action.type] || 'Action AutoMod';

    const common =
        `**Règle :** ${rule ? clip(rule.name, 100) : `\`${execution.ruleId}\``}\n**Action :** ${action}\n` +
        `**Membre :** <@${execution.userId}> (\`${execution.userId}\`)\n**Salon :** ${channel ? channelRef(channel) : '*aucun*'}`;

    emitLog(Client, 'textual', new EmbedBuilder()
        .setTitle('🛡️ Contenu bloqué par AutoMod')
        .setDescription(
            `${common}\n**Mot / motif détecté :** ${clip(execution.matchedKeyword ?? execution.matchedContent, 200)}\n` +
            `**Contenu :** ${showContent ? clip(execution.content, 1000) : '🔒 masqué (salon non public ou contenu indisponible)'}`
        ));
    emitLog(Client, 'moderation', new EmbedBuilder().setTitle('🛡️ Action AutoMod').setDescription(common));
};
