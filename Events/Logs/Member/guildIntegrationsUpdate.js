const { baseEmbed, emitLog } = require('../../../Utility/logging/helpers');
const { fetchEntry } = require('../../../Utility/logging/audit');

const TYPES = { 80: ['🔌 Intégration ajoutée', 'ajoutée'], 81: ['🔌 Intégration modifiée', 'modifiée'], 82: ['🔌 Intégration supprimée', 'supprimée'] };

/** Intégrations (bots, Twitch, YouTube…) : l'événement ne donne aucun détail, on lit le journal d'audit. */
module.exports = async (Client, guild) => {
    for (const type of [80, 81, 82]) {
        const entry = await fetchEntry(guild, type, { maxAge: 10000, delay: type === 80 ? 1200 : 0 });
        if (!entry) continue;
        emitLog(Client, 'member', baseEmbed({
            title: TYPES[type][0],
            description:
                `**Intégration :** ${entry.target?.name ?? entry.extra?.type ?? 'inconnue'}${entry.extra?.type ? ` (${entry.extra.type})` : ''}\n` +
                `**Par :** ${entry.executorId ? `<@${entry.executorId}> (\`${entry.executorId}\`)` : 'inconnu'}`,
            footer: 'Intégrations'
        }));
        return;
    }
    emitLog(Client, 'member', baseEmbed({ title: '🔌 Intégrations modifiées', description: 'Les intégrations du serveur ont changé (détails indisponibles).', footer: 'Intégrations' }));
};
