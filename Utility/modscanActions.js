const { EmbedBuilder } = require('discord.js');

/**
 * Retire les boutons de sanction d'une alerte et note la décision dans son embed,
 * pour éviter qu'un second modérateur ne sanctionne deux fois.
 */
const disableButtons = async (interaction, outcome) => {
    const embeds = interaction.message.embeds.map(embed => EmbedBuilder.from(embed));
    if (embeds[0]) {
        const field = { name: 'Décision', value: outcome };
        embeds[0].addFields(field);
    }
    await interaction.message.edit({ embeds, components: [] }).catch(() => null);
};

module.exports = { disableButtons };
