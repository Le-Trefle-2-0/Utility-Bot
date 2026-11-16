const { EmbedBuilder, PermissionsBitField, MessageFlags } = require('discord.js');
const { getCurrentEvent } = require('../Utility/collect');

const errorEmbed = (text) => new EmbedBuilder().setColor('Red').setDescription(`:x: | ${text}`);

module.exports = {
    description: 'Ajouter ou retirer des émojis collectés à un membre (administrateurs)',
    guilds: ['mainGuildID'],
    options: [
        { name: 'membre', desc: 'Membre concerné', type: 'user', required: true },
        { name: 'quantite', desc: 'Quantité à ajouter (négatif pour en retirer)', type: 'int', required: true }
    ],
    run: async (Client, interaction) => {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ embeds: [errorEmbed('Cette commande est réservée aux administrateurs.')], flags: MessageFlags.Ephemeral });
        }

        const user = interaction.options.getUser('membre');
        const amount = interaction.options.getInteger('quantite');
        if (user.bot) return interaction.reply({ embeds: [errorEmbed('Les bots ne participent pas.')], flags: MessageFlags.Ephemeral });
        if (amount === 0 || Math.abs(amount) > 100000) return interaction.reply({ embeds: [errorEmbed('La quantité doit être non nulle et inférieure à 100 000 en valeur absolue.')], flags: MessageFlags.Ephemeral });

        const event = await getCurrentEvent(Client, interaction.guild.id);
        if (!event) return interaction.reply({ embeds: [errorEmbed('Aucun évènement de collecte à modifier.')], flags: MessageFlags.Ephemeral });

        const [score] = await Client.CollectScores.findOrCreate({ where: { eventID: event.id, userID: user.id }, defaults: { count: 0 } });
        score.count = Math.max(0, score.count + amount);
        await score.save();

        interaction.reply({
            embeds: [new EmbedBuilder().setColor('8cc088').setDescription(`🍀 | ${user} possède maintenant **${score.count.toLocaleString('fr-FR')}** ${event.emoji} pour **${event.name}**.`)],
            flags: MessageFlags.Ephemeral
        });
    }
};
