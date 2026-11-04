const { scheduleJob } = require('node-schedule');
const { baseEmbed, emitLog, duration } = require('./helpers');

const jobs = new Map();

/** Programme le log de fin de timeout par expiration (Discord n'envoie aucun événement à l'expiration). */
const scheduleExpiry = (Client, member) => {
    const key = `${member.guild.id}:${member.id}`;
    jobs.get(key)?.cancel();
    jobs.delete(key);

    const until = member.communicationDisabledUntilTimestamp;
    if (!until || until <= Date.now()) return;

    jobs.set(key, scheduleJob(new Date(until), async () => {
        jobs.delete(key);
        const fresh = await member.guild.members.fetch({ user: member.id, force: true }).catch(() => null);
        if (!fresh) return;
        // Prolongé entre-temps : un autre job a pris le relais
        if (fresh.communicationDisabledUntilTimestamp && fresh.communicationDisabledUntilTimestamp > Date.now() + 1000) return;
        emitLog(Client, 'moderation', baseEmbed({
            user: fresh.user,
            title: '⏰ Timeout terminé (expiration)',
            description: `Le timeout de <@${fresh.id}> (\`${fresh.id}\`) est arrivé à expiration.`
        }).setColor('2e7d32'));
    }));
};

const cancelExpiry = (member) => {
    const key = `${member.guild.id}:${member.id}`;
    jobs.get(key)?.cancel();
    jobs.delete(key);
};

/** Au démarrage : reprogramme les timeouts encore actifs. */
const scheduleActiveTimeouts = async (Client, guild) => {
    const members = await guild.members.fetch().catch(() => guild.members.cache);
    let count = 0;
    for (const member of members.values()) {
        if (member.communicationDisabledUntilTimestamp > Date.now()) {
            scheduleExpiry(Client, member);
            count++;
        }
    }
    return count;
};

module.exports = { scheduleExpiry, cancelExpiry, scheduleActiveTimeouts };
