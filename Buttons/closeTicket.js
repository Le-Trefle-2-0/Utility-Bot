const transcript = require('discord-html-transcripts');
const { createWriteStream } = require('fs');
const { mkdir } = require('fs').promises;
const path = require('path');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const ticketsLogger = require('../Utility/ticketsLogger');
const ticketsConfig = require('../config/ticketsConfig');

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
            writeStream.on('finish', () => resolve({ success: true }));
            writeStream.on('error', (error) => reject(error));
            writeStream.end();
        });
    } catch (error) {
        throw new Error(`Failed to generate transcript: ${error.message}`);
    }
};

/**
 * Envoie les notifications de fermeture
 */
const sendClosureNotifications = async (Client, interaction, ticket, ticketId) => {
    try {
        const row = [
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setStyle(ButtonStyle.Link)
                    .setLabel('Transcript')
                    .setURL(`http://cdn.letrefle.org/transcript/${ticketId}`)
            )
        ];

        // Envoyer un DM à l'utilisateur
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
                const transcriptChannel = await interaction.guild.channels.fetch(transcriptChannelID);
                if (transcriptChannel) {
                    await transcriptChannel.send({
                        embeds: [
                            new EmbedBuilder()
                                .setColor('9bd2d2')
                                .setDescription(`**Clôture de ticket**\n\nID : \`${ticketId}\`\nOuvert par : <@${ticket.userID}>\nÉquipe en charge : ${ticket.assignedTeam}\nFermé par : <@${interaction.user.id}>`)
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

module.exports = async (Client, interaction) => {
    await interaction.deferReply();

    try {
        // Vérifier que c'est un ticket valide
        const ticket = await Client.Tickets.findOne({ where: { channelID: interaction.channel.id } });
        if (!ticket) {
            return interaction.editReply({
                content: `:x: | Ce salon n'est pas un ticket.`
            });
        }

        // Vérifier les permissions
        const teamRoles = ticketsConfig.getTeamRoles(ticket.assignedTeam);
        const hasTeamRole = teamRoles.some(roleID => interaction.member.roles.cache.has(roleID));
        const hasPermission = hasTeamRole || ticket.userID === interaction.user.id;

        if (!hasPermission) {
            return interaction.editReply({
                content: ':x: | Vous n\'avez pas les permissions pour fermer ce ticket.'
            });
        }

        // Enregistrer la fermeture en base de données
        await ticket.update({
            closedAt: new Date(),
            closedBy: interaction.user.id
        });
        await ticket.destroy();
        ticketsLogger.logTicketClose(ticket.id, interaction.user.id, 'User initiated closure');

        // Répondre immédiatement à l'utilisateur
        await interaction.editReply({
            content: `:white_check_mark: | Ticket fermé. Suppression du canal en cours...`
        });

        // Générer le transcript en arrière-plan
        try {
            await generateAndSaveTranscript(interaction.channel, ticket.id);
            await sendClosureNotifications(Client, interaction, ticket, ticket.id);
        } catch (error) {
            ticketsLogger.logError('closureNotifications', error);
            console.warn('Some notifications failed, but continuing with channel deletion');
        }

        // Supprimer le canal avec retry
        const deleteResult = await deleteChannelWithRetry(interaction.channel);

        if (!deleteResult.success) {
            const error = deleteResult.error;
            ticketsLogger.logError('channelDeletion', error);
            console.error('Channel deletion failed after retries:');
            console.error('- Error code:', error?.code || 'Unknown');
            console.error('- Error message:', error?.message || 'No message');
            console.error('- Status:', error?.status || 'Unknown');

            // Essayer de notifier que la suppression a échoué
            try {
                const errorCode = error?.code || error?.status || 'UNKNOWN_ERROR';
                const errorMessage = error?.message || 'Erreur inconnue';
                const deleteMessage = `⚠️ | Le canal n'a pas pu être supprimé automatiquement après 3 tentatives.\n\nCode: ${errorCode}\nMessage: ${errorMessage}\n\nVérifications requises:\n1. Le bot a-t-il la permission "Manage Channels" ?\n2. Est-il muted sur le serveur ?\n3. Y a-t-il un problème d'API Discord ?`;

                // Envoyer le message au canal des transcripts
                const transcriptChannelID = ticketsConfig.getTranscriptChannelID();
                if (transcriptChannelID) {
                    const transcriptChannel = await interaction.guild.channels.fetch(transcriptChannelID);
                    await transcriptChannel.send({
                        content: deleteMessage,
                        embeds: [
                            new EmbedBuilder()
                                .setColor('ff6b6b')
                                .setTitle('⚠️ Erreur de suppression de canal')
                                .setDescription(`Ticket ID: \`${ticket.id}\`\nCanal: <#${interaction.channel.id}>\n\nSuppression manuelle requise.`)
                        ]
                    });
                }
            } catch (notificationError) {
                console.error('Failed to send deletion error notification:', notificationError);
            }
        }

    } catch (error) {
        ticketsLogger.logError('closeTicket', error);

        try {
            await interaction.editReply({
                content: `:x: | Erreur lors de la fermeture du ticket: ${error.message}`
            });
        } catch (replyError) {
            console.error('Failed to send error reply:', replyError);
        }
    }
}