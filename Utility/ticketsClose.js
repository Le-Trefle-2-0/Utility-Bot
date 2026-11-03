/**
 * Fermeture des tickets : transcript, verrouillage du salon, suppression différée.
 * Utilisé par le bouton « Fermer le ticket » et par les fermetures automatiques
 * (membre parti du serveur).
 */

const transcript = require('discord-html-transcripts');
const { createWriteStream } = require('fs');
const { mkdir } = require('fs').promises;
const path = require('path');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } = require('discord.js');
const ticketsLogger = require('./ticketsLogger');
const ticketsConfig = require('../config/ticketsConfig');
const transcriptHost = require('./transcriptHost');

// Taille maximale d'un fichier joint par le bot sur un serveur sans boost
const MAX_ATTACHMENT_BYTES = 9 * 1024 * 1024;

// Délai entre la fermeture (salon verrouillé) et la suppression du salon
const DEFAULT_DELETE_DELAY_HOURS = 6;

const getDeleteDelayMs = () =>
    (ticketsConfig.getTicketsConfig().deleteDelayHours ?? DEFAULT_DELETE_DELAY_HOURS) * 60 * 60 * 1000;

/**
 * Essaie de supprimer un canal avec retry logic
 */
const deleteChannelWithRetry = async (channel, maxRetries = 3) => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            await channel.delete();
            return { success: true };
        } catch (error) {
            if (attempt === maxRetries) {
                return { success: false, error };
            }
            // Attendre avant de réessayer
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
    }
};

/**
 * Génère et sauvegarde le transcript
 */
const generateAndSaveTranscript = async (channel, ticketId) => {
    try {
        // S'assurer que le répertoire existe
        const transcriptDir = path.join(__dirname, '../Transcripts');
        await mkdir(transcriptDir, { recursive: true });

        // Générer le transcript
        const file = await transcript.createTranscript(channel, {
            limit: -1,
            returnType: 'buffer',
            filename: `${ticketId}.html`,
            saveImages: true,
            footerText: 'Transcript confidentiel - Le Trèfle 2.0 - Tout repartage contrevient au règlement intérieur de l\'association.',
            poweredBy: false,
        });

        // Sauvegarder le fichier
        const filePath = path.join(transcriptDir, `${ticketId}.html`);
        const writeStream = createWriteStream(filePath);

        return new Promise((resolve, reject) => {
            writeStream.write(file);
            writeStream.on('finish', () => resolve({ success: true, buffer: file }));
            writeStream.on('error', (error) => reject(error));
            writeStream.end();
        });
    } catch (error) {
        throw new Error(`Failed to generate transcript: ${error.message}`);
    }
};

/**
 * Envoie les notifications de fermeture
 * @param {string} closedByText - Qui a fermé le ticket (mention ou raison de la fermeture automatique)
 */
const sendClosureNotifications = async (Client, guild, ticket, ticketId, transcriptUrl, transcriptBuffer, closedByText) => {
    try {
        // Sans lien (hébergement en ligne en échec), pas de bouton
        const row = transcriptUrl ? [
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setStyle(ButtonStyle.Link)
                    .setLabel('Transcript')
                    .setURL(transcriptUrl)
            )
        ] : [];

        // Envoyer un DM à l'utilisateur (impossible s'il a quitté le serveur : ignoré)
        try {
            const user = await Client.users.fetch(ticket.userID);
            await user.send({
                content: `:white_check_mark: | Votre ticket a été fermé.`,
                components: row
            });
        } catch (error) {
            console.warn(`Failed to send DM to user ${ticket.userID}: ${error.message}`);
        }

        // Envoyer un message au canal des transcriptions
        try {
            const transcriptChannelID = ticketsConfig.getTranscriptChannelID();
            if (transcriptChannelID) {
                const transcriptChannel = await guild.channels.fetch(transcriptChannelID);
                if (transcriptChannel) {
                    // Lien indisponible : on joint le fichier pour que le transcript ne soit pas perdu pour le staff
                    let unavailableNote = '';
                    const files = [];
                    if (!transcriptUrl) {
                        if (transcriptBuffer && transcriptBuffer.length <= MAX_ATTACHMENT_BYTES) {
                            files.push(new AttachmentBuilder(transcriptBuffer, { name: `${ticketId}.html` }));
                            unavailableNote = '\n\n⚠️ Hébergement en ligne indisponible : transcript joint à ce message (à ouvrir dans un navigateur).';
                        } else {
                            unavailableNote = `\n\n⚠️ Hébergement en ligne indisponible : transcript disponible dans le dossier Transcripts du bot (\`${ticketId}.html\`).`;
                        }
                    }

                    await transcriptChannel.send({
                        files,
                        embeds: [
                            new EmbedBuilder()
                                .setColor('9bd2d2')
                                .setDescription(`**Clôture de ticket**\n\nID : \`${ticketId}\`\n${ticket.summonedBy ? `Convoqué par : <@${ticket.summonedBy}>\nMembre convoqué : <@${ticket.userID}>` : `Ouvert par : <@${ticket.userID}>`}\nÉquipe en charge : ${ticket.assignedTeam}\nFermé par : ${closedByText}${unavailableNote}`)
                        ],
                        components: row
                    });
                }
            }
        } catch (error) {
            console.warn(`Failed to send transcript notification: ${error.message}`);
        }
    } catch (error) {
        throw new Error(`Failed to send closure notifications: ${error.message}`);
    }
};

/**
 * Verrouille le salon : plus personne ne peut écrire, mais les participants gardent la lecture.
 */
const lockChannel = async (channel) => {
    // Chaque modification déclenche une mise à jour du salon côté Discord, qui vide puis reremplit
    // le cache des permissions : on fige donc la liste des identifiants avant de boucler, sinon
    // l'itération revisite les mêmes entrées indéfiniment.
    const ids = [...channel.permissionOverwrites.cache.keys()]
        // @everyone ne voit déjà pas le salon
        .filter(id => id !== channel.guild.id);

    for (const id of ids) {
        try {
            // Objet à jour (l'ancien a été remplacé par la mise à jour du salon), absent si le
            // membre est parti : Discord retire alors ses permissions
            const overwrite = channel.permissionOverwrites.cache.get(id);
            if (!overwrite) continue;

            await overwrite.edit({
                SendMessages: false,
                AddReactions: false,
                SendMessagesInThreads: false,
                CreatePublicThreads: false,
                CreatePrivateThreads: false
            });
        } catch (error) {
            ticketsLogger.logError('lockChannel', error);
        }
    }
};

/**
 * Retire les boutons des messages épinglés (prise en charge, transfert, fermeture)
 */
const removeTicketButtons = async (channel) => {
    const pins = await channel.messages.fetchPinned().catch(() => null);
    for (const pin of pins?.values() ?? []) {
        if (pin.components?.length) {
            await pin.edit({ components: [] }).catch(() => {});
        }
    }
};

/**
 * Ferme un ticket : enregistre la fermeture, verrouille le salon, génère et met en ligne le
 * transcript, prévient les personnes concernées, puis programme la suppression du salon.
 *
 * @param {Object} options
 * @param {Guild} options.guild
 * @param {TextChannel|null} options.channel - null si le salon n'existe plus
 * @param {string|null} options.closedBy - ID du membre qui ferme ; null pour une fermeture automatique
 * @param {string|null} options.reason - raison affichée pour une fermeture automatique
 * @param {Function} [options.onLocked] - appelée une fois le salon verrouillé, avant le transcript (étape lente)
 * @returns {Promise<{deleteAt: Date}>}
 */
const closeTicket = async (Client, ticket, { guild, channel, closedBy = null, reason = null, onLocked } = {}) => {
    const ticketId = ticket.id;
    const deleteAt = new Date(Date.now() + getDeleteDelayMs());
    const closedByText = closedBy ? `<@${closedBy}>` : (reason || 'Fermeture automatique');

    // Enregistrer la fermeture en base de données
    await ticket.update({
        closedAt: new Date(),
        closedBy: closedBy || Client.user.id
    });
    await ticket.destroy();
    ticketsLogger.logTicketClose(ticketId, closedBy || 'system', reason || 'User initiated closure');

    // La suppression est programmée en base dès maintenant (elle survit à un redémarrage) : quoi
    // qu'il arrive aux étapes suivantes, le salon ne restera pas indéfiniment.
    if (channel) {
        await Client.TicketDeletions.upsert({ channelID: channel.id, deleteAt });
    }

    if (channel) {
        try {
            await lockChannel(channel);
            await removeTicketButtons(channel);
            await channel.send({
                embeds: [
                    new EmbedBuilder()
                        .setColor('9bd2d2')
                        .setDescription(`🔒 Ticket clos ${closedBy ? `par <@${closedBy}>` : `automatiquement (${reason})`}.\nCe salon est verrouillé et sera supprimé <t:${Math.floor(deleteAt.getTime() / 1000)}:R>.`)
                ]
            });
        } catch (error) {
            ticketsLogger.logError('lockTicket', error);
        }
    }

    if (onLocked) await onLocked({ deleteAt });

    try {
        // Transcript : le fichier reste de toute façon dans /Transcripts
        const { buffer } = await generateAndSaveTranscript(channel, ticketId);

        let transcriptUrl = null;
        if (transcriptHost.isConfigured()) {
            try {
                transcriptUrl = await transcriptHost.uploadTranscript(ticketId, buffer);
            } catch (uploadError) {
                ticketsLogger.logError('transcriptUpload', uploadError);
            }
        } else {
            // Hébergement en ligne non configuré : ancien serveur interne
            transcriptUrl = `http://cdn.letrefle.org/transcript/${ticketId}`;
        }

        await sendClosureNotifications(Client, guild, ticket, ticketId, transcriptUrl, buffer, closedByText);
    } catch (error) {
        ticketsLogger.logError('closureNotifications', error);
        console.warn('Some notifications failed, the channel deletion is still scheduled');
    }

    return { deleteAt };
};

module.exports = { closeTicket, deleteChannelWithRetry, getDeleteDelayMs };
