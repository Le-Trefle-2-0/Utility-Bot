const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const { baseEmbed, emitLog, tsFull, duration, ts, permName, DANGEROUS_PERMISSIONS } = require('../../../Utility/logging/helpers');
const { analyzeAccount, getHistory, recordJoin } = require('../../../Utility/logging/memberIntel');
const { trackJoin } = require('../../../Utility/logging/tracker');
const { fetchEntry } = require('../../../Utility/logging/audit');

/**
 * Arrivée d'un membre : comptes suspects, membre de retour, détection de raid,
 * et ajout d'un bot / d'une application (avec ses permissions).
 */
module.exports = async (Client, member) => {
    if (member.user.bot) return logBotAdded(Client, member);

    trackJoin(Client, member);

    const reasons = analyzeAccount(Client, member);
    if (reasons.length) {
        emitLog(Client, 'member', baseEmbed({
            user: member.user,
            title: '🕵️ Compte suspect',
            description: `<@${member.id}> (\`${member.id}\`) vient de rejoindre et présente des signes suspects :\n` +
                reasons.map(reason => `• ${reason}`).join('\n') +
                `\n\n📅 **Compte créé :** ${tsFull(member.user.createdTimestamp)}`
        }).setColor('f0a132'));
    }

    try {
        const history = await getHistory(Client, member.id, member.guild.id);
        if (history?.lastLeftAt) {
            const roles = safeParse(history.lastRoles);
            const previousSanctions = Client.ModLogs
                ? await Client.ModLogs.count({ where: { userID: member.id, guildID: member.guild.id } }).catch(() => 0)
                : 0;
            emitLog(Client, 'member', baseEmbed({
                user: member.user,
                title: '🔁 Membre de retour',
                description:
                    `<@${member.id}> (\`${member.id}\`) avait déjà rejoint ce serveur.\n\n` +
                    `📥 **Première arrivée :** ${history.firstJoinedAt ? tsFull(history.firstJoinedAt) : 'inconnue'}\n` +
                    `📤 **Dernier départ :** ${tsFull(history.lastLeftAt)}\n` +
                    `🔢 **Arrivées précédentes :** ${history.joinCount}\n` +
                    `🎭 **Rôles qu'il avait :** ${roles.length ? roles.map(id => `<@&${id}>`).join(' ') : 'aucun'}` +
                    (previousSanctions ? `\n⚠️ **Entrées de modération passées :** ${previousSanctions} (voir \`/modlog\`)` : '')
            }));
        }
    } catch (err) {
        Client.log?.error(`Historique du membre : ${err.message}`);
    }

    await recordJoin(Client, member).catch(() => null);
};

const safeParse = (text) => {
    try { return JSON.parse(text || '[]'); } catch { return []; }
};

async function logBotAdded(Client, member) {
    const entry = await fetchEntry(member.guild, 28, { targetId: member.id }); // BotAdd
    const botRole = member.roles.botRole;
    const permissions = botRole ? botRole.permissions : new PermissionsBitField();
    const dangerous = permissions.toArray().filter(flag => DANGEROUS_PERMISSIONS.includes(flag));
    const isAdmin = permissions.has(PermissionsBitField.Flags.Administrator);

    const embed = baseEmbed({
        user: member.user,
        title: '🤖 Bot ou application ajouté(e)',
        description:
            `**Bot :** <@${member.id}> (\`${member.id}\`)\n` +
            `**Ajouté par :** ${entry?.executorId ? `<@${entry.executorId}> (\`${entry.executorId}\`)` : 'inconnu'}\n` +
            `**Compte créé :** ${tsFull(member.user.createdTimestamp)}\n` +
            `**Rôle du bot :** ${botRole ? `<@&${botRole.id}>` : 'aucun'}\n` +
            `**Permissions accordées :** ${permissions.toArray().map(permName).join(', ') || 'aucune'}`
    });
    emitLog(Client, 'member', embed);

    if (isAdmin || dangerous.length) {
        emitLog(Client, 'moderation', baseEmbed({
            user: member.user,
            title: isAdmin ? '🚨 Bot ajouté avec la permission Administrateur' : '⚠️ Bot ajouté avec des permissions dangereuses',
            description:
                `<@${member.id}> a été ajouté par ${entry?.executorId ? `<@${entry.executorId}>` : 'un utilisateur inconnu'}.\n` +
                `**Permissions sensibles :** ${dangerous.map(permName).join(', ')}`
        }).setColor('c1121f'));
    }
}
