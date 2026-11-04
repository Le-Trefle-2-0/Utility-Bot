const { PermissionFlagsBits } = require('discord.js');
const { normalizeName, cfg, duration } = require('./helpers');

const STAFF_KEYWORDS = ['moderateur', 'moderatrice', 'modo', 'moderator', 'admin', 'administrateur', 'staff', 'support', 'guide', 'equipe', 'trefle'];

const isStaffMember = (member) => member.permissions.has([PermissionFlagsBits.ManageMessages])
    || member.permissions.has(PermissionFlagsBits.ModerateMembers)
    || member.permissions.has(PermissionFlagsBits.KickMembers)
    || member.permissions.has(PermissionFlagsBits.Administrator);

/**
 * Analyse un compte et retourne la liste de raisons de suspicion :
 * compte très récent, avatar par défaut, pseudo imitant un modérateur.
 */
const analyzeAccount = (Client, member) => {
    const reasons = [];
    const minAgeDays = cfg(Client, 'suspiciousAccountAgeDays', Client.settings?.antiScam?.minAccountAgeDays ?? 7);
    const age = Date.now() - member.user.createdTimestamp;
    if (age < minAgeDays * 86400000) reasons.push(`Compte très récent (${duration(age)}, seuil : ${minAgeDays} j)`);
    if (!member.user.avatar) reasons.push('Avatar par défaut');
    const impersonated = detectImpersonation(member);
    if (impersonated) reasons.push(impersonated);
    return reasons;
};

/** Pseudo ressemblant à celui d'un membre de l'équipe ou contenant un mot-clé de modération. */
const detectImpersonation = (member) => {
    const names = [member.user.username, member.user.globalName, member.nickname].filter(Boolean).map(normalizeName).filter(Boolean);
    if (!names.length) return null;

    for (const staff of member.guild.members.cache.values()) {
        if (staff.id === member.id || staff.user.bot || !isStaffMember(staff)) continue;
        const staffNames = [staff.user.username, staff.user.globalName, staff.displayName].filter(Boolean).map(normalizeName).filter(n => n.length >= 4);
        for (const name of names) {
            if (staffNames.some(staffName => name === staffName)) {
                return `Pseudo identique à celui du membre de l'équipe ${staff.displayName}`;
            }
        }
    }
    for (const name of names) {
        const keyword = STAFF_KEYWORDS.find(word => name.includes(word) && name !== 'trefle');
        if (keyword) return `Pseudo évoquant l'équipe de modération (« ${keyword} »)`;
    }
    return null;
};

/* ---------- Historique des arrivées / départs ---------- */

const getHistory = async (Client, userID, guildID) => {
    if (!Client.MemberHistory) return null;
    return Client.MemberHistory.findOne({ where: { userID, guildID } }).catch(() => null);
};

const recordJoin = async (Client, member) => {
    if (!Client.MemberHistory) return;
    const now = new Date();
    const existing = await getHistory(Client, member.id, member.guild.id);
    if (existing) {
        await existing.update({ joinCount: existing.joinCount + 1, lastJoinedAt: now });
    } else {
        await Client.MemberHistory.create({
            userID: member.id, guildID: member.guild.id, joinCount: 1, firstJoinedAt: now, lastJoinedAt: now
        });
    }
};

const recordLeave = async (Client, member) => {
    if (!Client.MemberHistory) return;
    const now = new Date();
    const roles = member.roles?.cache
        ? member.roles.cache.filter(role => role.id !== member.guild.id).map(role => role.id)
        : [];
    const existing = await getHistory(Client, member.id, member.guild.id);
    if (existing) {
        await existing.update({ lastLeftAt: now, lastRoles: JSON.stringify(roles) });
    } else {
        await Client.MemberHistory.create({
            userID: member.id, guildID: member.guild.id, joinCount: 1,
            firstJoinedAt: member.joinedAt ?? null, lastJoinedAt: member.joinedAt ?? null,
            lastLeftAt: now, lastRoles: JSON.stringify(roles)
        });
    }
};

module.exports = { analyzeAccount, detectImpersonation, isStaffMember, getHistory, recordJoin, recordLeave };
