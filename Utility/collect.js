const { EmbedBuilder } = require('discord.js');
const { Op } = require('sequelize');

/**
 * Évènements de collecte : un émoji apparaît en réaction sous des messages, proportionnellement à l'activité
 * (≈ 1 message sur `spawnEvery`) ; le premier membre à cliquer le remporte. Classement final à la fin.
 */

const COLOR = '8cc088';
const DROP_LIFETIME_MS = 5 * 60 * 1000;   // un émoji non récupéré disparaît au bout de 5 minutes
const MIN_GUILD_GAP_MS = 15 * 1000;       // délai minimal entre deux émojis sur le serveur
const USER_ROLL_COOLDOWN_MS = 10 * 1000;  // un même membre ne "tire" pas plus d'une fois toutes les 10 s (anti-spam)
const CACHE_TTL_MS = 30 * 1000;
const MEDALS = ['🥇', '🥈', '🥉'];

const eventCache = new Map();   // guildID -> { event, at }
const lastSpawn = new Map();    // guildID -> timestamp
const lastRoll = new Map();     // guildID:userID -> timestamp

// ---------- Émoji ----------

const normalize = (s) => s.replace(/️/g, '');

/** Valide un émoji saisi (Unicode ou personnalisé `<:nom:id>`). Renvoie { raw, key } ou null. */
function parseEmoji(input) {
    const raw = input.trim();
    const custom = raw.match(/^<a?:\w{2,32}:(\d{17,20})>$/);
    if (custom) return { raw, key: custom[1] };

    const graphemes = [...new Intl.Segmenter('fr', { granularity: 'grapheme' }).segment(raw)];
    if (graphemes.length === 1 && /\p{Extended_Pictographic}/u.test(raw)) return { raw, key: normalize(raw) };
    return null;
}

/** Clé d'un émoji de réaction, comparable à `parseEmoji(...).key`. */
const reactionKey = (emoji) => emoji.id ?? normalize(emoji.name ?? '');
const eventKey = (event) => parseEmoji(event.emoji)?.key;

// ---------- Dates (fuseau Europe/Paris) ----------

function parisOffsetMs(utcMs) {
    const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
        timeZone: 'Europe/Paris', hourCycle: 'h23',
        year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric'
    }).formatToParts(new Date(utcMs)).map(x => [x.type, x.value]));
    const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
    return Math.round((asUtc - utcMs) / 60000) * 60000;
}

/**
 * Lit « JJ/MM/AAAA » ou « JJ/MM/AAAA HH:MM » (heure de Paris). Sans heure : minuit,
 * ou 23:59:59 si `endOfDay` (pour que le dernier jour soit inclus).
 * @returns {Date|null}
 */
function parseParisDate(input, endOfDay = false) {
    const m = input.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2})[h:](\d{2}))?$/);
    if (!m) return null;
    const [day, month, year] = [+m[1], +m[2], +m[3]];
    const hasTime = m[4] !== undefined;
    const hour = hasTime ? +m[4] : (endOfDay ? 23 : 0);
    const minute = hasTime ? +m[5] : (endOfDay ? 59 : 0);
    const second = !hasTime && endOfDay ? 59 : 0;
    if (hour > 23 || minute > 59) return null;

    const check = new Date(Date.UTC(year, month - 1, day));
    if (check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) return null;

    const guess = Date.UTC(year, month - 1, day, hour, minute, second);
    let t = guess - parisOffsetMs(guess);
    const corrected = guess - parisOffsetMs(t); // bascule heure d'été / hiver
    if (corrected !== t) t = corrected;
    return new Date(t);
}

// ---------- Évènements ----------

async function getActiveEvent(Client, guildID) {
    const cached = eventCache.get(guildID);
    if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.event;

    const now = new Date();
    const event = await Client.CollectEvents.findOne({
        where: { guildID, startsAt: { [Op.lte]: now }, endsAt: { [Op.gt]: now } }
    });
    eventCache.set(guildID, { event, at: Date.now() });
    return event;
}

const invalidateEventCache = (guildID) => eventCache.delete(guildID);

/** Évènement « courant » pour l'affichage : en cours, sinon à venir, sinon le dernier terminé. */
async function getCurrentEvent(Client, guildID) {
    const now = new Date();
    return await getActiveEvent(Client, guildID)
        ?? await Client.CollectEvents.findOne({ where: { guildID, startsAt: { [Op.gt]: now } }, order: [['startsAt', 'ASC']] })
        ?? await Client.CollectEvents.findOne({ where: { guildID, endsAt: { [Op.lte]: now } }, order: [['endsAt', 'DESC']] });
}

const channelChain = (channel) => [channel.id, channel.parentId, channel.parent?.parentId].filter(Boolean);

function isEligibleChannel(Client, event, channel) {
    const chain = channelChain(channel);
    if (event.channelID && !chain.includes(event.channelID)) return false;
    const ignored = Client.settings?.collect?.ignoredChannelIDs ?? [];
    return !chain.some(id => ignored.includes(id));
}

// ---------- Apparition ----------

/** Appelé à chaque message : tire au sort l'apparition de l'émoji sous ce message. */
async function maybeSpawn(Client, message) {
    if (!message.guild || message.author.bot) return;

    const event = await getActiveEvent(Client, message.guild.id);
    if (!event || !isEligibleChannel(Client, event, message.channel)) return;

    const now = Date.now();
    const rollKey = `${message.guild.id}:${message.author.id}`;
    if (now - (lastRoll.get(rollKey) ?? 0) < USER_ROLL_COOLDOWN_MS) return;
    lastRoll.set(rollKey, now);

    if (now - (lastSpawn.get(message.guild.id) ?? 0) < MIN_GUILD_GAP_MS) return;
    if (Math.random() >= 1 / event.spawnEvery) return;
    lastSpawn.set(message.guild.id, now);

    try {
        await message.react(event.emoji);
    } catch (err) {
        Client.log?.warning?.(`[Collecte] Impossible d'ajouter la réaction : ${err.message}`);
        return;
    }

    const drop = await Client.CollectDrops.create({
        eventID: event.id,
        messageID: message.id,
        channelID: message.channel.id,
        expiresAt: new Date(now + DROP_LIFETIME_MS)
    });

    // Retire l'émoji s'il n'a pas été récupéré à temps (si le bot redémarre, le clic sera simplement refusé)
    setTimeout(async () => {
        const fresh = await Client.CollectDrops.findByPk(drop.id).catch(() => null);
        if (fresh && !fresh.claimedBy) await removeReactions(Client, message, event, []);
    }, DROP_LIFETIME_MS + 1000).unref?.();
}

async function removeReactions(Client, message, event, userIDs) {
    const reaction = message.reactions?.cache.find(r => reactionKey(r.emoji) === eventKey(event));
    if (!reaction) return;
    for (const id of [Client.user.id, ...userIDs]) {
        await reaction.users.remove(id).catch(() => null);
    }
}

// ---------- Récupération ----------

/** Appelé à chaque réaction ajoutée : attribue l'émoji au premier membre qui clique. */
async function handleClaim(Client, reaction, user) {
    if (user.bot) return;
    if (reaction.partial) reaction = await reaction.fetch().catch(() => null);
    if (!reaction) return;
    const message = reaction.message.partial ? await reaction.message.fetch().catch(() => null) : reaction.message;
    if (!message?.guild) return;

    const event = await getActiveEvent(Client, message.guild.id);
    if (!event || reactionKey(reaction.emoji) !== eventKey(event)) return;

    const drop = await Client.CollectDrops.findOne({ where: { messageID: message.id } });
    if (!drop || drop.claimedBy || drop.eventID !== event.id) return;

    // L'auteur du message ne peut pas récupérer l'émoji posé sous son propre message
    if (message.author?.id === user.id) {
        await reaction.users.remove(user.id).catch(() => null);
        return;
    }

    if (drop.expiresAt < new Date()) {
        await removeReactions(Client, message, event, [user.id]);
        return;
    }

    // Réclamation atomique : une seule mise à jour peut réussir, même si deux clics arrivent en même temps
    const [claimed] = await Client.CollectDrops.update({ claimedBy: user.id }, { where: { id: drop.id, claimedBy: null } });
    if (!claimed) return;

    const [score] = await Client.CollectScores.findOrCreate({
        where: { eventID: event.id, userID: user.id },
        defaults: { count: 0 }
    });
    await score.increment('count');
    await score.reload();

    await removeReactions(Client, message, event, [user.id]);

    const member = message.guild.members.cache.get(user.id) ?? await message.guild.members.fetch(user.id).catch(() => null);
    const reply = await message.reply({
        content: `${event.emoji} **${member?.displayName ?? user.username}** a attrapé l'émoji ! (${score.count} au total)`,
        allowedMentions: { repliedUser: false }
    }).catch(() => null);
    if (reply) setTimeout(() => reply.delete().catch(() => null), 10 * 1000).unref?.();
}

// ---------- Classement ----------

const fmt = (n) => n.toLocaleString('fr-FR');

async function getScoreboard(Client, eventID, limit = 10) {
    // À égalité, celui qui a atteint son score en premier passe devant
    return Client.CollectScores.findAll({
        where: { eventID, count: { [Op.gt]: 0 } },
        order: [['count', 'DESC'], ['updatedAt', 'ASC']],
        limit
    });
}

async function getPlace(Client, event, userID) {
    const mine = await Client.CollectScores.findOne({ where: { eventID: event.id, userID } });
    if (!mine || mine.count <= 0) return null;
    const ahead = await Client.CollectScores.count({
        where: {
            eventID: event.id,
            [Op.or]: [
                { count: { [Op.gt]: mine.count } },
                { count: mine.count, updatedAt: { [Op.lt]: mine.updatedAt } }
            ]
        }
    });
    return { place: ahead + 1, count: mine.count };
}

function scoreboardEmbed(event, rows, { final = false } = {}) {
    const lines = rows.map((row, i) => `${MEDALS[i] ?? `**${i + 1}.**`} <@${row.userID}> · ${fmt(row.count)} ${event.emoji}`);
    const endTs = Math.floor(event.endsAt.getTime() / 1000);
    const now = Date.now();

    const embed = new EmbedBuilder()
        .setColor(COLOR)
        .setTitle(`${event.emoji} ${event.name}${final ? ' : résultats' : ''}`)
        .setDescription(lines.length ? lines.join('\n') : 'Personne n\'a encore récupéré d\'émoji, sois le premier !');

    if (final) embed.setFooter({ text: 'Évènement terminé, merci à toutes et tous d\'avoir participé !' });
    else if (event.startsAt.getTime() > now) embed.addFields({ name: 'Début', value: `<t:${Math.floor(event.startsAt.getTime() / 1000)}:F>` });
    else embed.addFields({ name: 'Fin', value: `<t:${endTs}:F> (<t:${endTs}:R>)` });
    return embed;
}

// ---------- Annonces de début / fin (vérifiées chaque minute) ----------

async function announce(Client, event, payload) {
    if (!event.announceChannelID) return;
    const guild = Client.guilds.cache.get(event.guildID);
    const channel = guild?.channels.cache.get(event.announceChannelID) ?? await guild?.channels.fetch(event.announceChannelID).catch(() => null);
    if (channel?.isTextBased()) await channel.send(payload).catch(err => Client.log?.warning?.(`[Collecte] Annonce impossible : ${err.message}`));
}

async function tick(Client) {
    const now = new Date();

    const starting = await Client.CollectEvents.findAll({ where: { startAnnounced: false, startsAt: { [Op.lte]: now } } });
    for (const event of starting) {
        await event.update({ startAnnounced: true });
        invalidateEventCache(event.guildID);
        if (event.endsAt <= now) continue; // évènement déjà terminé (bot arrêté longtemps) : pas d'annonce de début
        const endTs = Math.floor(event.endsAt.getTime() / 1000);
        await announce(Client, event, {
            embeds: [new EmbedBuilder()
                .setColor(COLOR)
                .setTitle(`${event.emoji} ${event.name}`)
                .setDescription(`L'évènement commence ! Des ${event.emoji} vont apparaître en réaction sous vos messages : **le premier à cliquer dessus le remporte**. Plus le serveur est actif, plus il y en a… et plus la compétition est rude !\n\nFin <t:${endTs}:R>. Suis le classement avec \`/collectetop\`.`)]
        });
    }

    const ending = await Client.CollectEvents.findAll({ where: { endAnnounced: false, endsAt: { [Op.lte]: now } } });
    for (const event of ending) {
        await event.update({ endAnnounced: true });
        invalidateEventCache(event.guildID);
        const rows = await getScoreboard(Client, event.id, 10);
        await announce(Client, event, {
            content: rows.slice(0, 3).map(r => `<@${r.userID}>`).join(' ') || undefined,
            embeds: [scoreboardEmbed(event, rows, { final: true })],
            allowedMentions: { users: rows.slice(0, 3).map(r => r.userID) }
        });
    }
}

function startTicker(Client) {
    const run = () => tick(Client).catch(err => Client.log?.error?.(`[Collecte] ${err.stack || err.message}`));
    run();
    setInterval(run, 60 * 1000);
}

module.exports = {
    parseEmoji, parseParisDate,
    getActiveEvent, getCurrentEvent, invalidateEventCache,
    maybeSpawn, handleClaim,
    getScoreboard, getPlace, scoreboardEmbed,
    tick, startTicker
};
