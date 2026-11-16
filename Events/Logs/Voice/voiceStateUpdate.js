const { EmbedBuilder } = require('discord.js');
const { emitLog, channelRef, duration, isEnabled, sleep } = require('../../../Utility/logging/helpers');
const { fetchEntry } = require('../../../Utility/logging/audit');
const { trackShortVoiceSession } = require('../../../Utility/logging/tracker');

const MEMBER_MOVE = 26;
const MEMBER_DISCONNECT = 27;

const sessions = new Map(); // `${guild}:${user}` -> { channelId, since }
const lastCounts = new Map();
const wasFull = new Map();

const voiceEmbed = (title, member, description) => new EmbedBuilder()
    .setTitle(title)
    .setAuthor({ name: member.displayName || member.user.username, iconURL: member.user.displayAvatarURL({ dynamic: true }) })
    .setDescription(`👤 **Membre :** <@${member.id}> (\`${member.id}\`)\n${description}`)
    .setFooter({ text: `ID de l'utilisateur : ${member.id}` });

/**
 * Déplacements et déconnexions : Discord regroupe ces entrées d'audit (compteur `count`).
 * On considère l'action comme « récente » si l'entrée est nouvelle ou si son compteur a augmenté.
 */
const findModeratorAction = async (guild, type) => {
    const entry = await fetchEntry(guild, type, { maxAge: 15000, delay: 1500 });
    if (!entry) return null;
    const count = entry.extra?.count ?? 1;
    const previous = lastCounts.get(entry.id);
    lastCounts.set(entry.id, count);
    if (previous !== undefined && previous >= count) return null;
    return entry.executorId;
};

const persistVoiceTime = async (Client, member, seconds) => {
    if (!Client.VoiceTime || seconds < 1) return;
    try {
        const [row] = await Client.VoiceTime.findOrCreate({ where: { userID: member.id, guildID: member.guild.id } });
        await row.increment({ seconds: Math.round(seconds), sessions: 1 });
    } catch (error) {
        Client.log?.warning?.(`Temps vocal : ${error.message}`);
    }
};

module.exports = async (Client, oldState, newState) => {
    const member = newState.member ?? oldState.member;
    if (!member || member.user.bot) return;
    const key = `${member.guild.id}:${member.id}`;

    const oldChannel = oldState.channel;
    const newChannel = newState.channel;

    /* ---------- Connexion / déconnexion / changement de salon ---------- */
    if (oldState.channelId !== newState.channelId) {
        if (!oldChannel && newChannel) {
            sessions.set(key, { channelId: newChannel.id, since: Date.now() });
            emitLog(Client, 'voice', voiceEmbed('🔊 Connexion à un salon vocal', member, `📍 **Salon :** ${channelRef(newChannel)}`));
        } else {
            // Fin de session : durée + temps cumulé
            const session = sessions.get(key);
            const spent = session ? Date.now() - session.since : null;
            if (spent !== null) {
                persistVoiceTime(Client, member, spent / 1000);
                trackShortVoiceSession(Client, member, spent / 1000);
            }

            if (oldChannel && !newChannel) {
                sessions.delete(key);
                const forcedBy = await findModeratorAction(member.guild, MEMBER_DISCONNECT);
                emitLog(Client, 'voice', voiceEmbed(forcedBy ? '⛔ Déconnecté d\'un salon vocal par un modérateur' : '🔇 Déconnexion d\'un salon vocal', member,
                    `📍 **Salon :** ${channelRef(oldChannel)}\n⏱️ **Durée de la session :** ${spent !== null ? duration(spent) : 'inconnue'}` +
                    (forcedBy ? `\n🛡️ **Par :** <@${forcedBy}>` : '')));
                if (forcedBy && forcedBy !== member.id) {
                    emitLog(Client, 'moderation', voiceEmbed('⛔ Déconnexion forcée (vocal)', member, `📍 **Salon :** ${channelRef(oldChannel)}\n🛡️ **Modérateur :** <@${forcedBy}>`));
                }
            } else if (oldChannel && newChannel) {
                sessions.set(key, { channelId: newChannel.id, since: Date.now() });
                const movedBy = await findModeratorAction(member.guild, MEMBER_MOVE);
                emitLog(Client, 'voice', voiceEmbed(movedBy ? '↔️ Déplacé par un modérateur' : '↔️ Changement de salon vocal', member,
                    `📤 **Ancien salon :** ${channelRef(oldChannel)}\n📥 **Nouveau salon :** ${channelRef(newChannel)}\n⏱️ **Temps passé dans l'ancien :** ${spent !== null ? duration(spent) : 'inconnu'}` +
                    (movedBy ? `\n🛡️ **Par :** <@${movedBy}>` : '')));
                if (movedBy && movedBy !== member.id) {
                    emitLog(Client, 'moderation', voiceEmbed('↔️ Membre déplacé par un modérateur', member, `📤 ${channelRef(oldChannel)} → 📥 ${channelRef(newChannel)}\n🛡️ **Modérateur :** <@${movedBy}>`));
                }
            }
        }

        // Salon plein / vide
        if (newChannel?.userLimit && newChannel.members.size >= newChannel.userLimit && !wasFull.get(newChannel.id)) {
            wasFull.set(newChannel.id, true);
            emitLog(Client, 'voice', new EmbedBuilder().setTitle('🈵 Salon vocal complet').setDescription(`${channelRef(newChannel)} a atteint sa limite (${newChannel.userLimit}).`));
        }
        if (oldChannel) {
            if (wasFull.get(oldChannel.id) && oldChannel.members.size < (oldChannel.userLimit || Infinity)) wasFull.delete(oldChannel.id);
            if (oldChannel.members.filter(m => !m.user.bot).size === 0) {
                emitLog(Client, 'voice', new EmbedBuilder().setTitle('🕳️ Salon vocal vide').setDescription(`${channelRef(oldChannel)} est maintenant vide.`));
            }
        }
        return;
    }

    /* ---------- Changements d'état dans un même salon ---------- */
    if (!newChannel) return;
    const lines = [];
    const channelLine = `📍 **Salon :** ${channelRef(newChannel)}`;
    const toggle = (title, flag, onText, offText) => {
        if (oldState[flag] !== newState[flag]) lines.push([title, newState[flag] ? onText : offText]);
    };

    if (isEnabled(Client, 'voiceMute')) {
        toggle('🎙️ Micro', 'selfMute', 'coupé par le membre', 'réactivé par le membre');
        toggle('🎙️ Micro (serveur)', 'serverMute', 'rendu muet par un modérateur', 'rendu à nouveau audible');
    }
    if (isEnabled(Client, 'voiceDeaf')) {
        toggle('🎧 Casque', 'selfDeaf', 'coupé par le membre', 'réactivé par le membre');
        toggle('🎧 Casque (serveur)', 'serverDeaf', 'mis en sourdine par un modérateur', 'sourdine levée');
    }
    if (isEnabled(Client, 'voiceStream')) {
        toggle('🖥️ Partage d\'écran', 'streaming', 'démarré', 'arrêté');
        toggle('📷 Caméra', 'selfVideo', 'activée', 'désactivée');
    }

    // Conférences : demande de parole, passage public / orateur
    if (newChannel.type === 13 && isEnabled(Client, 'stage')) {
        if (!oldState.requestToSpeakTimestamp && newState.requestToSpeakTimestamp) lines.push(['🙋 Conférence', 'demande à prendre la parole']);
        if (oldState.requestToSpeakTimestamp && !newState.requestToSpeakTimestamp && newState.suppress) lines.push(['🙋 Conférence', 'demande de parole retirée']);
        if (oldState.suppress !== newState.suppress) lines.push(['🎤 Conférence', newState.suppress ? 'passé dans le public' : 'devenu orateur (accepté ou invité)']);
    }

    for (const [title, text] of lines) {
        emitLog(Client, 'voice', voiceEmbed(`${title}`, member, `${channelLine}\n➡️ ${text}`));
    }
};
