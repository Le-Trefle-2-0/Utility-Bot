const { EmbedBuilder } = require('discord.js');
const { emitLog, clip, duration, ts } = require('./helpers');
const { shouldAlert } = require('./tracker');
const { scheduleActiveTimeouts } = require('./timeouts');
const { cacheAll } = require('./invites');

/**
 * Cycle de vie du bot : démarrage, arrêt, reconnexions, limites de débit, permissions manquantes, erreurs.
 * Tout est envoyé dans la catégorie « bot ».
 */
module.exports = (Client) => {
    const post = (title, description, color) => {
        const embed = new EmbedBuilder().setTitle(title).setDescription(clip(description, 3500));
        if (color) embed.setColor(color);
        emitLog(Client, 'bot', embed);
    };

    // Démarrage
    Client.once('clientReady', async () => {
        const guild = Client.guilds.cache.get(Client.settings.mainGuildID);
        post('🟢 Bot démarré',
            `**Utilisateur :** ${Client.user.tag}\n**Serveurs :** ${Client.guilds.cache.size}\n**Node.js :** ${process.version}\n**Démarrage :** ${ts(Date.now(), 'T')}`,
            '2e7d32');

        if (!guild) return;
        try {
            const count = await cacheAll(Client, guild);
            Client.log.info(`Cached ${count} invites for guild ${guild.id}`);
        } catch (error) {
            Client.log.error(`Failed to fetch invites for guild ${guild.id}: ${error.message}`);
            const missing = error.code === 50013 || error.code === 50001;
            post(missing ? '⚠️ Permission manquante' : '⚠️ Erreur de suivi des invitations',
                missing
                    ? 'Impossible de lire les invitations du serveur (permission **Gérer le serveur** requise pour identifier l\'invitation utilisée).'
                    : `Impossible de charger les invitations du serveur : \`${error.message}\``, 'f0a132');
        }
        if (!guild.members.me?.permissions.has('ViewAuditLog')) {
            post('⚠️ Permission manquante', 'Le bot n\'a pas la permission **Voir les logs du serveur** : les auteurs des actions (qui a banni, supprimé, modifié…) seront inconnus.', 'f0a132');
        }
        const active = await scheduleActiveTimeouts(Client, guild).catch(() => 0);
        if (active) Client.log.info(`${active} timeout(s) actif(s) reprogrammé(s)`);
    });

    Client.on('error', (error) => { if (shouldAlert(`err:${error.message}`, 60_000)) post('❌ Erreur du client', `\`${error.message}\``, 'c1121f'); });
    Client.on('warn', (info) => { if (shouldAlert(`warn:${info}`, 60_000)) post('⚠️ Avertissement', clip(info, 500), 'f0a132'); });

    // Limites de débit (les plus longues uniquement, pour ne pas s'auto-alimenter)
    Client.rest.on('rateLimited', (info) => {
        if (!info.global && info.timeToReset < 5000) return;
        if (!shouldAlert(`rate:${info.route}`, 60_000)) return;
        post('🐢 Limite de débit atteinte', `**Route :** \`${info.method} ${info.route}\`\n**Global :** ${info.global ? 'oui' : 'non'}\n**Réessai dans :** ${duration(info.timeToReset)}`, 'f0a132');
    });

    // Permissions manquantes et erreurs non gérées
    process.on('unhandledRejection', (reason) => {
        const error = reason instanceof Error ? reason : new Error(String(reason));
        Client.log?.error?.(`Unhandled rejection : ${error.message}`);
        const missing = error.code === 50013 || error.code === 50001;
        if (!shouldAlert(`rej:${error.code}:${error.message}`, 60_000)) return;
        if (missing) {
            post('🚫 Permission manquante',
                `Le bot n'a pas pu effectuer une action.\n**Erreur :** ${error.message} (code ${error.code})\n**Requête :** \`${error.method ?? '?'} ${clip(error.url, 150)}\``, 'f0a132');
        } else {
            post('❌ Erreur non gérée', `\`${clip(error.stack || error.message, 900)}\``, 'c1121f');
        }
    });
    process.on('uncaughtExceptionMonitor', (error) => {
        post('💥 Exception fatale', `\`${clip(error.stack || error.message, 900)}\`\nLe processus va s'arrêter.`, 'c1121f');
    });

    // Arrêt propre : on laisse 3 s au log pour partir
    let stopping = false;
    const shutdown = (signal, reraise = false) => async () => {
        if (stopping) return;
        stopping = true;
        post('🔴 Bot arrêté', `**Signal :** ${signal}\n**Heure :** ${ts(Date.now(), 'T')}`, 'c1121f');
        await new Promise(resolve => setTimeout(resolve, 3000));
        if (reraise) process.kill(process.pid, signal);
        else process.exit(0);
    };
    process.on('SIGINT', shutdown('SIGINT'));
    process.on('SIGTERM', shutdown('SIGTERM'));
    process.once('SIGUSR2', shutdown('SIGUSR2', true)); // redémarrage nodemon
};
