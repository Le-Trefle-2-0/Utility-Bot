const { baseEmbed, emitLog, isEnabled } = require('../../../Utility/logging/helpers');

const STATUS = { online: '🟢 En ligne', idle: '🌙 Inactif', dnd: '⛔ Ne pas déranger', offline: '⚫ Hors ligne', invisible: '⚫ Invisible' };
const last = new Map();

/**
 * Désactivé par défaut (très bruyant, intent privilégié) : activer avec settings.logging.enable = ["presence"].
 * Une même personne n'est journalisée qu'une fois par minute.
 */
module.exports = async (Client, oldPresence, newPresence) => {
    if (!isEnabled(Client, 'presence') || !newPresence?.member || newPresence.user?.bot) return;
    const before = oldPresence?.status ?? 'offline';
    const after = newPresence.status;
    if (before === after) return;
    if (Date.now() - (last.get(newPresence.userId) || 0) < 60_000) return;
    last.set(newPresence.userId, Date.now());

    emitLog(Client, 'member', baseEmbed({
        user: newPresence.user,
        title: '📶 Statut modifié',
        description: `<@${newPresence.userId}> : ${STATUS[before] || before} → ${STATUS[after] || after}`
    }));
};
