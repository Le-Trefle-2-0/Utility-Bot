const { EmbedBuilder } = require('discord.js');
const { grantRewards } = require('./levelRewards');
const { getMultiplier } = require('./xpEvents');

const XP_MIN = 5;
const XP_MAX = 15;
const COOLDOWN_MS = 30 * 1000;

// Dernier gain d'XP par membre (en mémoire : un redémarrage remet simplement le délai à zéro)
const cooldowns = new Map();

/** XP nécessaire pour passer du niveau (lvl - 1) au niveau lvl. */
const xpForLevel = (lvl) => 5 * lvl ** 2 + 40 * lvl + 55;

/** XP total cumulé nécessaire pour atteindre le niveau lvl (somme de xpForLevel(1..lvl)). */
const totalXpForLevel = (lvl) => (5 * lvl * (lvl + 1) * (2 * lvl + 1)) / 6 + 20 * lvl * (lvl + 1) + 55 * lvl;

/** Niveau correspondant à un total d'XP. */
function levelFromXp(xp) {
    let lvl = 0;
    while (xp >= totalXpForLevel(lvl + 1)) lvl++;
    return lvl;
}

/** Progression au sein du niveau courant : { level, current, needed, ratio }. */
function progressFromXp(xp) {
    const level = levelFromXp(xp);
    const current = xp - totalXpForLevel(level);
    const needed = xpForLevel(level + 1);
    return { level, current, needed, ratio: current / needed };
}

/** Place du membre dans le classement du serveur (1 = le plus d'XP). */
async function getPlace(Client, guildID, xp) {
    const { Op } = require('sequelize');
    const better = await Client.Levels.count({ where: { guildID, xp: { [Op.gt]: xp } } });
    return better + 1;
}

/** Appelé à chaque message : accorde de l'XP (avec délai) et félicite en cas de passage de niveau. */
async function handleMessageXp(Client, message) {
    if (!message.guild || message.author.bot) return;

    const key = `${message.guild.id}:${message.author.id}`;
    const now = Date.now();
    if (now - (cooldowns.get(key) ?? 0) < COOLDOWN_MS) return;
    cooldowns.set(key, now);

    const gain = (Math.floor(Math.random() * (XP_MAX - XP_MIN + 1)) + XP_MIN) * await getMultiplier(Client, message.guild.id, message.channel);

    const [row] = await Client.Levels.findOrCreate({
        where: { userID: message.author.id, guildID: message.guild.id },
        defaults: { xp: 0, level: 0 }
    });

    row.xp += gain;
    const newLevel = levelFromXp(row.xp);
    const leveledUp = newLevel > row.level;
    row.level = newLevel;
    await row.save();

    if (!leveledUp) return;

    // Rôles de récompense (tous ceux dont le niveau est atteint et que le membre n'a pas encore)
    const newRoles = message.member ? await grantRewards(Client, message.member, newLevel) : [];
    const rewardText = newRoles.length
        ? `\n🎁 Récompense${newRoles.length > 1 ? 's' : ''} : ${newRoles.map(r => `${r}`).join(', ')}`
        : '';

    await message.channel.send({
        content: `${message.author}`,
        embeds: [
            new EmbedBuilder()
                .setColor('8cc088')
                .setTitle('🍀 Niveau supérieur !')
                .setDescription(`Bravo ${message.author}, tu viens de passer au **niveau ${newLevel}** ! 🎉\nContinue comme ça, il te faudra **${xpForLevel(newLevel + 1).toLocaleString('fr-FR')} XP** pour atteindre le niveau suivant. Utilise \`/rank\` pour suivre ta progression.${rewardText}`)
        ],
        allowedMentions: { users: [message.author.id] }
    }).catch(err => Client.log?.warning?.(`[Niveaux] Envoi du message de passage de niveau impossible : ${err.message}`));
}

/**
 * Fixe l'XP totale d'un membre (commandes d'administration) et recalcule son niveau.
 * Aucun message public ; les rôles de récompense sont attribués si `member` est fourni
 * (jamais retirés en cas de baisse).
 */
async function setTotalXp(Client, guildID, userID, xp, member) {
    xp = Math.max(0, Math.floor(xp));
    const [row] = await Client.Levels.findOrCreate({ where: { userID, guildID }, defaults: { xp: 0, level: 0 } });
    const oldLevel = row.level;
    row.xp = xp;
    row.level = levelFromXp(xp);
    await row.save();

    const newRoles = member ? await grantRewards(Client, member, row.level) : [];
    return { xp: row.xp, oldLevel, level: row.level, newRoles };
}

module.exports = { setTotalXp, xpForLevel, totalXpForLevel, levelFromXp, progressFromXp, getPlace, handleMessageXp };
