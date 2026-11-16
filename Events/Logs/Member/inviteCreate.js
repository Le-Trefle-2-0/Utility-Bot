const { EmbedBuilder } = require('discord.js');
const { emitLog, channelRef, duration, ts } = require('../../../Utility/logging/helpers');

module.exports = async (Client, invite) => {
    if (invite.guild?.id !== Client.settings.mainGuildID) return;
    emitLog(Client, 'member', new EmbedBuilder()
        .setTitle('🔗 Invitation créée')
        .setDescription(
            `**Code :** \`${invite.code}\`\n` +
            `**Créée par :** ${invite.inviter ? `<@${invite.inviter.id}> (\`${invite.inviter.id}\`)` : 'inconnu'}\n` +
            `**Salon :** ${channelRef(invite.channel)}\n` +
            `**Durée :** ${invite.maxAge ? `${duration(invite.maxAge * 1000)} (expire ${ts(invite.expiresTimestamp, 'R')})` : 'illimitée'}\n` +
            `**Utilisations max. :** ${invite.maxUses || 'illimitées'}\n` +
            `**Accès temporaire :** ${invite.temporary ? 'oui' : 'non'}`
        )
        .setFooter({ text: invite.inviter ? `ID de l'utilisateur : ${invite.inviter.id}` : 'Invitation' }));
};
