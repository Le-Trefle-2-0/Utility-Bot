const { EmbedBuilder, PermissionsBitField, MessageFlags } = require('discord.js');
const ms = require('ms');
const { Op } = require('sequelize');
const { SERVER_WIDE } = require('../Utility/xpEvents');

const MAX_DURATION = 30 * 24 * 60 * 60 * 1000;
const errorEmbed = (text) => new EmbedBuilder().setColor('Red').setDescription(`:x: | ${text}`);

module.exports = {
    description: 'Lancer un évènement d\'XP doublée (administrateurs)',
    guilds: ['mainGuildID'],
    options: [
        { name: 'duree', desc: 'Durée de l\'évènement (ex : 30m, 2h, 1d)', type: 'string', required: true },
        { name: 'salon', desc: 'Salon concerné (tout le serveur si omis)', type: 'channel', required: false }
    ],
    run: async (Client, interaction) => {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ embeds: [errorEmbed('Cette commande est réservée aux administrateurs.')], flags: MessageFlags.Ephemeral });
        }

        const duration = ms(interaction.options.getString('duree').trim());
        if (typeof duration !== 'number' || duration < 60 * 1000 || duration > MAX_DURATION) {
            return interaction.reply({ embeds: [errorEmbed('Durée invalide : indique entre 1 minute et 30 jours, par exemple `30m`, `2h` ou `1d`.')], flags: MessageFlags.Ephemeral });
        }

        const channel = interaction.options.getChannel('salon');
        const endsAt = new Date(Date.now() + duration);
        const scopeText = channel ? `dans ${channel}` : 'sur **tout le serveur**';

        try {
            const existing = await Client.XpEvents.findOne({ where: { guildID: interaction.guild.id, channelID: channel?.id ?? SERVER_WIDE, endsAt: { [Op.gt]: new Date() } } });
            await Client.XpEvents.upsert({
                guildID: interaction.guild.id,
                channelID: channel?.id ?? SERVER_WIDE,
                multiplier: 2,
                endsAt,
                createdBy: interaction.user.id
            });

            const ts = Math.floor(endsAt.getTime() / 1000);
            await interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('8cc088')
                        .setTitle('🍀 XP doublée !')
                        .setDescription(`Tous les messages rapportent **deux fois plus d'XP** ${scopeText}, jusqu'à <t:${ts}:t> (<t:${ts}:R>).${existing ? '\n*Un évènement était déjà en cours : sa durée est remplacée.*' : ''}`)
                ]
            });
        } catch (err) {
            Client.log?.error?.(`[Niveaux] /doublexp : ${err.stack || err.message}`);
            await interaction.reply({ embeds: [errorEmbed('Une erreur est survenue.')], flags: MessageFlags.Ephemeral });
        }
    }
};
