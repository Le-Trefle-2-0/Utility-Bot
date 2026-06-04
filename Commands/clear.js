const { ApplicationCommandOptionType, PermissionsBitField, EmbedBuilder } = require('discord.js');

module.exports = {
    description: 'Supprime un nombre défini de messages dans un salon.',
    options: [
        {
            name: 'nombre',
            desc: 'Nombre de messages à supprimer',
            type: ApplicationCommandOptionType.Integer,
            required: true,
            min_value: 1
        },
        {
            name: 'utilisateur',
            desc: 'Supprimer uniquement les messages de cet utilisateur',
            type: ApplicationCommandOptionType.User,
            required: false
        },
        {
            name: 'salon',
            desc: 'Le salon où supprimer les messages (par défaut celui-ci)',
            type: ApplicationCommandOptionType.Channel,
            required: false
        }
    ],
    run: async (Client, interaction) => {
        // Vérification des permissions
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
            return interaction.reply({ content: "Vous n'avez pas la permission de gérer les messages.", ephemeral: true });
        }

        let amount = interaction.options.getInteger('nombre');
        const targetUser = interaction.options.getUser('utilisateur');
        const targetChannel = interaction.options.getChannel('salon') || interaction.channel;

        // Vérifier si c'est un salon textuel
        if (!targetChannel.isTextBased()) {
            return interaction.reply({ content: "Le salon sélectionné doit être un salon textuel.", ephemeral: true });
        }

        // Vérification des permissions du bot dans le salon cible
        if (!targetChannel.permissionsFor(interaction.guild.members.me).has(PermissionsBitField.Flags.ManageMessages)) {
            return interaction.reply({ content: `Je n'ai pas la permission de gérer les messages dans le salon ${targetChannel}.`, ephemeral: true });
        }

        await interaction.deferReply({ ephemeral: true });

        try {
            let totalDeleted = 0;
            let lastMessageId = null;
            const limit14Days = 1209600000;

            while (amount > 0) {
                // Déterminer combien de messages récupérer (max 100 par appel API)
                const fetchLimit = amount > 100 ? 100 : amount;
                
                const fetchOptions = { limit: 100 }; // On récupère toujours 100 pour optimiser si on filtre par utilisateur
                if (lastMessageId) fetchOptions.before = lastMessageId;

                const fetchedMessages = await targetChannel.messages.fetch(fetchOptions);
                if (fetchedMessages.size === 0) break;

                lastMessageId = fetchedMessages.last().id;

                let messagesToDelete;
                if (targetUser) {
                    messagesToDelete = fetchedMessages
                        .filter(m => m.author.id === targetUser.id && (Date.now() - m.createdTimestamp) < limit14Days)
                        .first(amount);
                } else {
                    messagesToDelete = fetchedMessages
                        .filter(m => (Date.now() - m.createdTimestamp) < limit14Days)
                        .first(amount);
                }

                if (messagesToDelete.length === 0) {
                    // Si on filtre par utilisateur et qu'on n'en trouve pas dans les 100 derniers, 
                    // on continue de chercher tant qu'on a des messages récupérés
                    if (targetUser && fetchedMessages.size > 0) continue;
                    break;
                }

                const deleted = await targetChannel.bulkDelete(messagesToDelete, true);
                totalDeleted += deleted.size;
                
                // Si on a supprimé moins que ce qu'on a demandé dans ce lot (à cause de la limite de 14 jours par exemple)
                // et qu'on ne filtre pas par utilisateur, on s'arrête probablement car les suivants seront aussi trop vieux
                if (!targetUser && deleted.size < messagesToDelete.length) break;

                // On réduit le montant restant à supprimer
                amount -= deleted.size;

                // Petit délai pour éviter de spammer l'API si on fait beaucoup de suppressions
                if (amount > 0) await new Promise(resolve => setTimeout(resolve, 1000));
            }

            if (totalDeleted === 0) {
                return interaction.editReply({ content: "Aucun message supprimable trouvé (les messages de plus de 14 jours ne peuvent pas être supprimés en masse)." });
            }

            const embed = new EmbedBuilder()
                .setColor('9bd2d2')
                .setDescription(`✅ **${totalDeleted}** message(s) supprimé(s) ${targetUser ? `de **${targetUser.tag}**` : ''} dans ${targetChannel}.`)
                .setFooter({ text: 'Système de modération' })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });

            // Log de l'action
            const sendLog = require('../Events/Logs/logs.js');
            const logContent = `**Modérateur :** ${interaction.user.tag}\n` +
                               `**Action :** /clear\n` +
                               `**Quantité demandée :** ${interaction.options.getInteger('nombre')}\n` +
                               `**Messages supprimés :** ${totalDeleted}\n` +
                               `**Cible :** ${targetUser ? targetUser.tag : 'Tout le monde'}\n` +
                               `**Salon :** ${targetChannel}`;
            
            sendLog(Client, 'moderation', '🧹 Nettoyage de messages', logContent, 'Moderation System');

        } catch (error) {
            Client.log.error(`Erreur lors de la commande clear : ${error.message}`);
            interaction.editReply({ content: `Une erreur est survenue : ${error.message}` });
        }
    }
};
