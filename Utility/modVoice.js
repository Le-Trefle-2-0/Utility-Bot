const { PermissionsBitField } = require('discord.js');

const CONNECT = PermissionsBitField.Flags.Connect;
const locks = new Map(); // channelID -> promesse en cours (évite les synchronisations concurrentes)

const getConfig = Client => Client.settings.modVoice;
const isWatched = (Client, channelID) => !!getConfig(Client)?.channelIDs?.includes(channelID);
const isModerator = (Client, member) =>
    !member.user.bot && getConfig(Client).moderatorRoleIDs.some(id => member.roles.cache.has(id));

async function doSync(Client, channel) {
    const everyone = channel.guild.roles.everyone;
    const hasMod = channel.members.some(member => isModerator(Client, member));
    const isOpen = channel.permissionOverwrites.cache.get(everyone.id)?.allow.has(CONNECT) ?? false;

    if (hasMod) {
        if (!isOpen) {
            await channel.permissionOverwrites.edit(everyone, { Connect: true }, { reason: 'Modérateur présent dans le vocal' });
            Client.log.info(`Salon vocal ${channel.id} ouvert à @everyone (modérateur présent)`);
        }
        return;
    }

    if (isOpen) {
        await channel.permissionOverwrites.edit(everyone, { Connect: false }, { reason: 'Plus de modérateur dans le vocal' });
        Client.log.info(`Salon vocal ${channel.id} refermé (plus de modérateur)`);
    }

    // Déconnecte ceux qui n'ont plus le droit de se connecter (accès uniquement via @everyone).
    // Ceux qu'un autre rôle autorise conservent leur accès. Exécuté à chaque passage pour rattraper un arrêt du bot.
    for (const member of channel.members.values()) {
        if (member.user.bot || channel.permissionsFor(member).has(CONNECT)) continue;
        await member.voice.disconnect('Plus de modérateur dans le vocal').catch(err => Client.log.error(err));
    }
}

function syncChannel(Client, channel) {
    if (!channel?.isVoiceBased() || !isWatched(Client, channel.id)) return Promise.resolve();
    const previous = locks.get(channel.id) || Promise.resolve();
    const next = previous
        .then(() => doSync(Client, channel))
        .catch(err => Client.log.error(err))
        .finally(() => { if (locks.get(channel.id) === next) locks.delete(channel.id); });
    locks.set(channel.id, next);
    return next;
}

async function sweep(Client) {
    const guild = Client.guilds.cache.get(Client.settings.mainGuildID);
    if (!guild) return;
    for (const id of getConfig(Client).channelIDs) {
        await syncChannel(Client, guild.channels.cache.get(id));
    }
}

function start(Client) {
    const config = getConfig(Client);
    if (!config?.moderatorRoleIDs?.length || !config?.channelIDs?.length) return;
    const interval = Math.max(1, config.sweepMinutes || 5) * 60 * 1000;
    sweep(Client);
    setInterval(() => sweep(Client), interval);
    Client.log.info(`Surveillance vocale modérateur active (balayage toutes les ${interval / 60000} min)`);
}

module.exports = { start, sweep, syncChannel, isWatched };
