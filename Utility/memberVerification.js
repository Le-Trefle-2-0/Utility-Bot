/**
 * Validation du règlement (écran de vérification Discord, `pending` passe à false) :
 *  - attribution du rôle membre (settings.json > memberRoleID) ;
 *  - message de bienvenue public, envoyé une seule fois, au moment où le rôle est attribué.
 *
 * Fiabilité : l'événement `guildMemberUpdate` peut être manqué (bot arrêté, ancien état absent du cache
 * quand le membre valide plusieurs jours après son arrivée, erreur passagère de l'API). L'attribution
 * ne dépend donc pas de la transition `pending` true -> false : elle est tentée à chaque mise à jour d'un
 * membre qui a validé sans avoir le rôle, avec nouvelles tentatives, puis rattrapée par un balayage
 * périodique (et au démarrage).
 *
 * Réglages optionnels dans settings.json :
 *   memberRoleID                   rôle à attribuer (sans lui, seul le message de bienvenue est géré)
 *   memberVerification.sweepMinutes  fréquence du balayage (30)
 *   memberVerification.catchUpDays   ancienneté maximale des membres rattrapés (30)
 */

const ms = require('ms');
const { Op } = require('sequelize');
const { scheduleJob } = require('node-schedule');
const { sendPublicWelcome } = require('./publicWelcome');

const DAY_MS = 24 * 60 * 60 * 1000;
const RETRY_DELAYS_MS = [0, 2000, 10000];

const inFlight = new Set();

const getSettings = (Client) => {
    const s = Client.settings.memberVerification || {};
    return {
        roleID: Client.settings.memberRoleID || null,
        sweepMinutes: Math.max(5, s.sweepMinutes ?? 30),
        catchUpMs: (s.catchUpDays ?? 30) * DAY_MS
    };
};

const sleep = (delay) => new Promise(resolve => setTimeout(resolve, delay));

const hasActiveSoftban = async (Client, member) => {
    if (!Client.ModLogs) return false;
    const softbans = await Client.ModLogs.findAll({
        where: { userID: member.id, guildID: member.guild.id, type: { [Op.startsWith]: 'Softban' } }
    });
    return softbans.some(softban => {
        const duration = ms(softban.type.split(' ')[1] || '0');
        return new Date(softban.createdAt).getTime() + (duration || 0) > Date.now();
    });
};

/** Attribue le rôle avec quelques tentatives. Retourne true si le rôle vient d'être ajouté. */
const grantRole = async (Client, member, roleID) => {
    if (member.roles.cache.has(roleID)) return false;

    let lastError;
    for (const delay of RETRY_DELAYS_MS) {
        if (delay) await sleep(delay);
        try {
            await member.roles.add(roleID, 'Règlement validé');
            return true;
        } catch (error) {
            lastError = error;
        }
    }
    Client.log?.error?.(`[MemberVerification] Impossible d'attribuer le rôle à ${member.id} : ${lastError?.message}`);
    return false;
};

/**
 * Traite un membre qui a validé le règlement.
 * @param {boolean} transition true quand on a vu `pending` passer de true à false
 * @param {boolean} catchUp true pour un rattrapage (limité aux membres récents)
 */
const handleVerified = async (Client, member, { transition = false, catchUp = false } = {}) => {
    if (member.user.bot || member.pending) return;
    if (inFlight.has(member.id)) return;

    const { roleID, catchUpMs } = getSettings(Client);

    // Sans transition observée, on ne touche qu'aux membres récents (un rôle retiré volontairement
    // par la modération à un ancien membre ne doit pas être remis)
    if (!transition && (!member.joinedTimestamp || Date.now() - member.joinedTimestamp > catchUpMs)) return;
    if (!roleID && !transition) return;
    if (roleID && !transition && member.roles.cache.has(roleID)) return;

    inFlight.add(member.id);
    try {
        const granted = roleID ? await grantRole(Client, member, roleID) : false;
        if (granted) Client.log?.info?.(`[MemberVerification] Rôle attribué à ${member.id}${catchUp ? ' (rattrapage)' : ''}`);

        // Bienvenue : une seule fois, quand le membre vient de passer le règlement
        if ((granted || transition) && !(await hasActiveSoftban(Client, member))) {
            try {
                await sendPublicWelcome(Client, member);
            } catch (error) {
                console.error('Erreur lors de l\'envoi du message de bienvenue public :', error);
            }
        }
    } catch (error) {
        Client.log?.error?.(`[MemberVerification] ${member.id} : ${error.message}`);
    } finally {
        inFlight.delete(member.id);
    }
};

/** Rattrape les membres qui ont validé le règlement sans avoir reçu le rôle. */
let sweeping = false;
const sweep = async (Client) => {
    const { roleID, catchUpMs } = getSettings(Client);
    if (!roleID || sweeping) return;

    const guild = Client.guilds.cache.get(Client.settings.mainGuildID);
    if (!guild) return;

    sweeping = true;
    try {
        const members = await guild.members.fetch();
        const missing = members.filter(member =>
            !member.user.bot && !member.pending && !member.roles.cache.has(roleID)
            && member.joinedTimestamp && Date.now() - member.joinedTimestamp <= catchUpMs);

        for (const member of missing.values()) {
            await handleVerified(Client, member, { catchUp: true });
            await sleep(1000);
        }
    } catch (error) {
        Client.log?.error?.(`[MemberVerification] balayage : ${error.message}`);
    } finally {
        sweeping = false;
    }
};

let started = false;
const start = (Client) => {
    if (started) return;
    started = true;

    const { sweepMinutes } = getSettings(Client);
    setTimeout(() => sweep(Client), 20 * 1000);
    scheduleJob(`*/${sweepMinutes} * * * *`, () => sweep(Client));
};

module.exports = { handleVerified, sweep, start };
