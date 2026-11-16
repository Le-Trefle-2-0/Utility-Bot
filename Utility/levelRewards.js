/**
 * Récompenses de niveau : attribution de rôles quand un membre atteint un niveau.
 * Les rôles sont cumulatifs : un membre de niveau 12 possède les rôles des niveaux 5 et 10.
 */

/**
 * Donne au membre tous les rôles de récompense jusqu'au niveau `level` qu'il n'a pas encore.
 * @returns {Promise<import('discord.js').Role[]>} rôles effectivement ajoutés
 */
async function grantRewards(Client, member, level, rewards) {
    rewards ??= await Client.LevelRewards.findAll({ where: { guildID: member.guild.id }, raw: true });

    const added = [];
    for (const reward of rewards) {
        if (reward.level > level) continue;
        const role = member.guild.roles.cache.get(reward.roleID);
        if (!role || member.roles.cache.has(role.id)) continue;

        try {
            await member.roles.add(role, `Récompense de niveau ${reward.level}`);
            added.push(role);
        } catch (err) {
            Client.log?.warning?.(`[Niveaux] Impossible de donner le rôle ${role.name} à ${member.user.tag} : ${err.message}`);
        }
    }
    return added;
}

/**
 * Rattrape les récompenses de tous les membres actuels du serveur
 * (après l'ajout d'une récompense ou un import).
 * @returns {Promise<{ members: number, roles: number }>} membres concernés / rôles donnés
 */
async function syncGuildRewards(Client, guild) {
    const rewards = await Client.LevelRewards.findAll({ where: { guildID: guild.id }, raw: true });
    if (rewards.length === 0) return { members: 0, roles: 0 };

    const { Op } = require('sequelize');
    const minLevel = Math.min(...rewards.map(r => r.level));
    const rows = await Client.Levels.findAll({
        where: { guildID: guild.id, level: { [Op.gte]: minLevel } },
        raw: true
    });

    await guild.members.fetch();

    let members = 0, roles = 0;
    for (const row of rows) {
        const member = guild.members.cache.get(row.userID);
        if (!member) continue;
        const added = await grantRewards(Client, member, row.level, rewards);
        if (added.length) { members++; roles += added.length; }
    }
    return { members, roles };
}

module.exports = { grantRewards, syncGuildRewards };
