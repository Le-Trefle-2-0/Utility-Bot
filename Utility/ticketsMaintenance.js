/**
 * Suivi des tickets, toutes les 10 minutes :
 *  - suppression des salons de tickets clos dont le délai est écoulé ;
 *  - fermeture des tickets dont le membre a quitté le serveur (filet de sécurité de l'événement) ;
 *  - rappel à l'équipe si un ticket n'est pas pris en charge ;
 *  - rappel au staff en charge si le ticket est silencieux depuis trop longtemps.
 *
 * Réglages optionnels dans settings.json > tickets :
 *   deleteDelayHours (6), reminders.unclaimedAfterHours (24),
 *   reminders.teamReminderRepeatHours (24), reminders.inactiveAfterDays (3)
 */

const { scheduleJob } = require('node-schedule');
const { Op } = require('sequelize');
const { EmbedBuilder } = require('discord.js');
const ticketsConfig = require('../config/ticketsConfig');
const ticketsLogger = require('./ticketsLogger');
const transcriptHost = require('./transcriptHost');
const { ticketRow } = require('./ticketsComponents');
const { closeTicket, deleteChannelWithRetry } = require('./ticketsClose');

const HOUR_MS = 60 * 60 * 1000;
const UNKNOWN_CHANNEL = 10003;
const UNKNOWN_MEMBER = 10007;

const getReminderSettings = () => {
    const reminders = ticketsConfig.getTicketsConfig().reminders || {};
    return {
        unclaimedAfterMs: (reminders.unclaimedAfterHours ?? 24) * HOUR_MS,
        teamRepeatMs: (reminders.teamReminderRepeatHours ?? 24) * HOUR_MS,
        inactiveAfterMs: (reminders.inactiveAfterDays ?? 3) * 24 * HOUR_MS
    };
};

const formatDuration = (ms) => {
    const hours = Math.floor(ms / HOUR_MS);
    return hours >= 48 ? `${Math.floor(hours / 24)} jours` : `${hours} h`;
};

// null = le salon n'existe plus ; undefined = erreur passagère (on réessaiera plus tard)
const fetchChannel = (guild, channelID) =>
    guild.channels.fetch(channelID).catch(error => (error.code === UNKNOWN_CHANNEL ? null : undefined));

/**
 * Le staff en charge n'est plus là : le ticket retourne en attente de prise en charge par l'équipe
 * (bouton « Prendre en charge » réactivé, équipe prévenue). Appelé à la fois par l'événement de
 * départ d'un membre et par la vérification périodique (départ pendant une panne du bot).
 */
const releaseTicket = async (Client, ticket, channel) => {
    await ticket.update({ takenBy: null, waitingSince: new Date(), lastTeamReminderAt: null });
    if (!channel) return;

    // Réactiver « Prendre en charge », désactivé depuis la prise en charge
    const pins = await channel.messages.fetchPinned().catch(() => null);
    for (const pin of pins?.values() ?? []) {
        if (pin.components?.length) await pin.edit({ components: [ticketRow()] }).catch(() => {});
    }

    const teamRoles = ticketsConfig.getTeamRoles(ticket.assignedTeam);
    await channel.send({
        content: teamRoles.map(id => `<@&${id}>`).join(' '),
        embeds: [
            new EmbedBuilder()
                .setColor('f0b232')
                .setDescription(`ℹ️ Le membre qui avait pris ce ticket en charge a quitté le serveur : il attend à nouveau une prise en charge.`)
        ],
        allowedMentions: { roles: teamRoles }
    });
};

// Seul un « membre inconnu » prouve un départ : une erreur passagère de l'API ne doit rien fermer
const isMemberPresent = (guild, userID) => guild.members.fetch(userID)
    .then(() => true)
    .catch(error => error.code !== UNKNOWN_MEMBER);

/**
 * Supprime les salons de tickets clos dont l'échéance est passée
 */
const deleteDueChannels = async (Client, guild) => {
    const due = await Client.TicketDeletions.findAll({ where: { deleteAt: { [Op.lte]: new Date() } } });

    for (const entry of due) {
        const channel = await fetchChannel(guild, entry.channelID);

        if (channel === undefined) continue;

        if (channel === null) {
            await entry.destroy();
            continue;
        }

        const result = await deleteChannelWithRetry(channel);
        if (result.success) {
            await entry.destroy();
            continue;
        }

        ticketsLogger.logError('channelDeletion', result.error);

        // Prévenir le staff une fois, puis réessayer dans une heure (et non toutes les 10 minutes)
        try {
            const transcriptChannelID = ticketsConfig.getTranscriptChannelID();
            if (transcriptChannelID) {
                const transcriptChannel = await guild.channels.fetch(transcriptChannelID);
                await transcriptChannel.send({
                    embeds: [
                        new EmbedBuilder()
                            .setColor('ff6b6b')
                            .setTitle('⚠️ Erreur de suppression de canal')
                            .setDescription(`Canal : <#${channel.id}>\nCode : ${result.error?.code || result.error?.status || 'inconnu'}\nMessage : ${result.error?.message || 'Erreur inconnue'}\n\nVérifier que le bot a la permission « Gérer les salons ». Nouvelle tentative dans 1 h, sinon suppression manuelle.`)
                    ]
                });
            }
        } catch (notificationError) {
            console.error('Failed to send deletion error notification:', notificationError);
        }
        await entry.update({ deleteAt: new Date(Date.now() + HOUR_MS) });
    }
};

/**
 * Rappels pour un ticket ouvert
 */
const sendReminders = async (Client, guild, channel, ticket, settings) => {
    const now = Date.now();
    const teamRoles = ticketsConfig.getTeamRoles(ticket.assignedTeam);
    const teamMentions = teamRoles.map(id => `<@&${id}>`).join(' ');
    const allowedMentions = { roles: teamRoles, users: [ticket.takenBy, ticket.userID].filter(Boolean) };

    // 1. Ticket en attente de prise en charge par l'équipe
    if (!ticket.takenBy) {
        const waitingFor = now - new Date(ticket.waitingSince || ticket.createdAt).getTime();
        const lastReminder = ticket.lastTeamReminderAt ? new Date(ticket.lastTeamReminderAt).getTime() : 0;

        if (waitingFor >= settings.unclaimedAfterMs && now - lastReminder >= settings.teamRepeatMs) {
            await channel.send({
                content: teamMentions,
                embeds: [
                    new EmbedBuilder()
                        .setColor('f0b232')
                        .setDescription(`⏰ **Rappel :** ce ticket de <@${ticket.userID}> attend une prise en charge depuis ${formatDuration(waitingFor)}.\nUn membre de l'équipe ${ticket.assignedTeam} peut cliquer sur « Prendre en charge » ci-dessus.`)
                ],
                allowedMentions
            });
            await ticket.update({ lastTeamReminderAt: new Date() });
        }
        return;
    }

    // 2. Ticket pris en charge mais silencieux : rappel au staff en charge
    const lastMessage = (await channel.messages.fetch({ limit: 1 })).first();
    const lastActivity = lastMessage?.createdTimestamp ?? new Date(ticket.createdAt).getTime();
    const silentFor = now - lastActivity;

    // Le rappel étant lui-même un message, il relance naturellement le compteur : pas de spam
    if (silentFor >= settings.inactiveAfterMs) {
        const staff = await guild.members.fetch(ticket.takenBy).catch(() => null);
        await channel.send({
            content: staff ? `<@${ticket.takenBy}>` : teamMentions,
            embeds: [
                new EmbedBuilder()
                    .setColor('f0b232')
                    .setDescription(`⏰ **Rappel :** aucun message dans ce ticket depuis ${formatDuration(silentFor)}.\nPensez à relancer <@${ticket.userID}>, ou à fermer le ticket s'il est résolu.${staff ? '' : `\n*Le membre qui l'avait pris en charge n'est plus sur le serveur : l'équipe ${ticket.assignedTeam} est prévenue.*`}`)
            ],
            allowedMentions
        });
    }
};

/**
 * Passe en revue tous les tickets ouverts
 */
const checkOpenTickets = async (Client, guild) => {
    const settings = getReminderSettings();
    const tickets = await Client.Tickets.findAll();

    for (const ticket of tickets) {
        try {
            const channel = await fetchChannel(guild, ticket.channelID);

            // Salon supprimé à la main : le ticket n'a plus lieu d'exister
            if (channel === null) {
                ticketsLogger.logTicketClose(ticket.id, 'system', 'Channel no longer exists');
                await ticket.destroy();
                continue;
            }
            if (channel === undefined) continue;

            // Le membre a quitté le serveur (ex. pendant que le bot était arrêté)
            if (!(await isMemberPresent(guild, ticket.userID))) {
                await closeTicket(Client, ticket, {
                    guild,
                    channel,
                    reason: 'le membre a quitté le serveur'
                });
                continue;
            }

            // Le staff en charge est parti de la même façon
            if (ticket.takenBy && !(await isMemberPresent(guild, ticket.takenBy))) {
                await releaseTicket(Client, ticket, channel);
            }

            await sendReminders(Client, guild, channel, ticket, settings);
        } catch (error) {
            ticketsLogger.logError(`ticketCheck:${ticket.id}`, error);
        }
    }
};

let running = false;

const run = async (Client) => {
    // Les modèles sont créés de manière asynchrone au démarrage
    if (running || !Client.Tickets || !Client.TicketDeletions) return;

    const guild = Client.guilds.cache.get(Client.settings.mainGuildID);
    if (!guild) return;

    running = true;
    try {
        await deleteDueChannels(Client, guild);
        await checkOpenTickets(Client, guild);
    } catch (error) {
        ticketsLogger.logError('ticketsMaintenance', error);
    } finally {
        running = false;
    }
};

let started = false;

/**
 * Met en ligne les transcripts stockés qui ne le sont pas encore
 */
const syncTranscripts = async (Client) => {
    try {
        const { uploaded, failed, tooLarge, remaining } = await transcriptHost.syncStoredTranscripts();
        if (uploaded || failed || tooLarge || remaining) {
            Client.log?.info?.(`[Transcripts] ${uploaded} mis en ligne, ${failed} échec(s), ${tooLarge} trop volumineux, ${remaining} en attente`);
        }
    } catch (error) {
        ticketsLogger.logError('transcriptSync', error);
    }
};

const start = (Client) => {
    if (started) return;
    started = true;

    scheduleJob('*/10 * * * *', () => run(Client));
    // Rattrapage après un redémarrage (ticket ouvert ou fermé pendant que le bot était arrêté)
    setTimeout(() => run(Client), 30 * 1000);

    // Transcripts : au démarrage, puis toutes les 6 h pour reprendre un envoi qui avait échoué
    setTimeout(() => syncTranscripts(Client), 45 * 1000);
    scheduleJob('17 */6 * * *', () => syncTranscripts(Client));
};

module.exports = { start, run, releaseTicket };
