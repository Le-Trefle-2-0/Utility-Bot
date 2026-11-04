const { baseEmbed, emitLog, clip } = require('./helpers');

/**
 * Journal de modération pour les actions faites par les commandes du bot
 * (exclusion temporaire, softban, notes…) : cible, modérateur, raison, nombre total d'entrées de modération.
 */
const logSanction = async (Client, { title, guild, target, moderatorId, reason, details = '', color }) => {
    let total = null;
    try {
        if (Client.ModLogs) total = await Client.ModLogs.count({ where: { userID: target.id, guildID: guild.id } });
    } catch { /* non bloquant */ }

    const embed = baseEmbed({
        user: target,
        title,
        description:
            `**Cible :** <@${target.id}> (\`${target.id}\`)\n` +
            `**Modérateur :** ${moderatorId ? `<@${moderatorId}> (\`${moderatorId}\`)` : '*automatique*'}\n` +
            (reason ? `**Raison :** ${clip(reason, 800)}\n` : '') +
            (details ? `${details}\n` : '') +
            (total !== null ? `**Entrées de modération (total) :** ${total}` : '')
    });
    if (color) embed.setColor(color);
    emitLog(Client, 'moderation', embed);
};

module.exports = { logSanction };
