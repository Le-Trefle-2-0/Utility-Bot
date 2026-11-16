const { EmbedBuilder, PermissionsBitField, MessageFlags } = require('discord.js');
const { setTotalXp } = require('../Utility/levels');

const MAX_XP = 10_000_000;
const errorEmbed = (text) => new EmbedBuilder().setColor('Red').setDescription(`:x: | ${text}`);

module.exports = {
    description: 'Ajouter (ou retirer, avec une valeur négative) de l\'XP à un membre (administrateurs)',
    guilds: ['mainGuildID'],
    options: [
        { name: 'membre', desc: 'Membre concerné', type: 'user', required: true },
        { name: 'xp', desc: 'XP à ajouter (négatif pour en retirer)', type: 'int', required: true }
    ],
    run: async (Client, interaction) => {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ embeds: [errorEmbed('Cette commande est réservée aux administrateurs.')], flags: MessageFlags.Ephemeral });
        }

        const user = interaction.options.getUser('membre');
        const amount = interaction.options.getInteger('xp');

        if (user.bot) return interaction.reply({ embeds: [errorEmbed('Les bots n\'ont pas de niveau.')], flags: MessageFlags.Ephemeral });
        if (amount === 0 || Math.abs(amount) > MAX_XP) return interaction.reply({ embeds: [errorEmbed(`La valeur doit être non nulle et inférieure à ${MAX_XP.toLocaleString('fr-FR')} en valeur absolue.`)], flags: MessageFlags.Ephemeral });

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        try {
            const current = await Client.Levels.findOne({ where: { userID: user.id, guildID: interaction.guild.id } });
            const newXp = Math.min(Math.max((current?.xp ?? 0) + amount, 0), MAX_XP);

            const member = await interaction.guild.members.fetch(user.id).catch(() => null);
            const result = await setTotalXp(Client, interaction.guild.id, user.id, newXp, member);

            await interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('8cc088')
                        .setDescription([
                            `🍀 | ${amount > 0 ? '+' : ''}${amount.toLocaleString('fr-FR')} XP pour ${user} : **${result.xp.toLocaleString('fr-FR')} XP** au total (niveau **${result.level}**, auparavant ${result.oldLevel}).`,
                            result.newRoles.length ? `🎁 Rôle(s) attribué(s) : ${result.newRoles.join(', ')}` : null
                        ].filter(Boolean).join('\n'))
                ]
            });
        } catch (err) {
            Client.log?.error?.(`[Niveaux] /givexp : ${err.stack || err.message}`);
            await interaction.editReply({ embeds: [errorEmbed('Une erreur est survenue.')] });
        }
    }
};
