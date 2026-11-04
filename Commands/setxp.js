const { EmbedBuilder, PermissionsBitField, MessageFlags } = require('discord.js');
const { setTotalXp } = require('../Utility/levels');

const MAX_XP = 10_000_000;
const errorEmbed = (text) => new EmbedBuilder().setColor('Red').setDescription(`:x: | ${text}`);

module.exports = {
    description: 'Définir l\'XP totale d\'un membre (administrateurs)',
    guilds: ['mainGuildID'],
    options: [
        { name: 'membre', desc: 'Membre concerné', type: 'user', required: true },
        { name: 'xp', desc: 'Nouvelle XP totale', type: 'int', required: true }
    ],
    run: async (Client, interaction) => {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ embeds: [errorEmbed('Cette commande est réservée aux administrateurs.')], flags: MessageFlags.Ephemeral });
        }

        const user = interaction.options.getUser('membre');
        const xp = interaction.options.getInteger('xp');

        if (user.bot) return interaction.reply({ embeds: [errorEmbed('Les bots n\'ont pas de niveau.')], flags: MessageFlags.Ephemeral });
        if (xp < 0 || xp > MAX_XP) return interaction.reply({ embeds: [errorEmbed(`L'XP doit être comprise entre 0 et ${MAX_XP.toLocaleString('fr-FR')}.`)], flags: MessageFlags.Ephemeral });

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        try {
            const member = await interaction.guild.members.fetch(user.id).catch(() => null);
            const result = await setTotalXp(Client, interaction.guild.id, user.id, xp, member);

            await interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('8cc088')
                        .setDescription([
                            `🍀 | L'XP de ${user} est maintenant de **${result.xp.toLocaleString('fr-FR')} XP** (niveau **${result.level}**, auparavant ${result.oldLevel}).`,
                            result.newRoles.length ? `🎁 Rôle(s) attribué(s) : ${result.newRoles.join(', ')}` : null
                        ].filter(Boolean).join('\n'))
                ]
            });
        } catch (err) {
            Client.log?.error?.(`[Niveaux] /setxp : ${err.stack || err.message}`);
            await interaction.editReply({ embeds: [errorEmbed('Une erreur est survenue.')] });
        }
    }
};
