const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, MessageFlags } = require("discord.js");
const ticketsConfig = require('../config/ticketsConfig');
const { recommendTeam, buildRecommendationEmbed, buildRecommendationButton } = require('../Utility/ticketsRecommendation');

module.exports = async (Client, interaction) => {
    // La recherche et la recommandation peuvent dépasser les 3 secondes accordées pour répondre
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
        let question = interaction.fields.getTextInputValue('question');

        if (!question) {
            return interaction.editReply({
                content: 'Veuillez entrer une question'
            });
        }

        // En parallèle : questions déjà posées, et équipe recommandée (jamais bloquant)
        const [search, recommendation] = await Promise.all([
            Client.algolia.search({
                requests: [{
                    indexName: 'questions',
                    query: question,
                    hitsPerPage: 5
                }]
            }),
            recommendTeam(Client, question)
        ]);

        // Avec une recommandation, un bouton ouvre directement le ticket pour cette équipe ;
        // le menu propose alors les autres équipes, pour ceux qui ne sont pas d'accord
        let selector = new StringSelectMenuBuilder()
            .setCustomId('openTicket')
            .setPlaceholder(recommendation ? 'Ou choisissez une autre équipe' : 'Sélectionnez une équipe');

        let options = [];
        const teams = ticketsConfig.getAllTeams().filter(team => team.name !== recommendation?.team.name);

        for (let team of teams) {
            const option = new StringSelectMenuOptionBuilder()
                .setLabel(team.name)
                .setValue(team.name)
                .setDescription(`Contacter l'équipe de ${team.name}`);

            // Ajouter l'emoji s'il existe
            if (team.emojiID) {
                option.setEmoji(team.emojiID);
            }

            options.push(option);
        }

        selector.addOptions(options);

        const components = [new ActionRowBuilder().addComponents(selector)];
        if (recommendation) components.unshift(buildRecommendationButton(recommendation));

        let hits = search.results[0].hits;
        const recommendationEmbeds = recommendation ? [buildRecommendationEmbed(recommendation)] : [];

        if (hits.length < 1) {
            return interaction.editReply({
                content: recommendation
                    ? 'Quelle équipe souhaitez-vous contacter ?'
                    : 'Quelle équipe souhaitez-vous contacter ?\nEn cas de doute, merci de contacter notre équipe de guides.',
                embeds: recommendationEmbeds,
                components
            });
        } else {
            let string = '';
            for (let hit of hits) {
                if (!string.includes(hit.threadLink)) string += `${hit.threadLink}\n`;
            }

            interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('9bd2d2')
                        .setDescription(`Il semblerait que votre question ait déjà été posée. Voici les résultats trouvés :\n\n${string}\nSi aucun de ces résultats ne répond à votre question, veuillez sélectionner une équipe ci-dessous. En cas de doute, merci de contacter notre équipe de guides.\nEn ouvrant un ticket, vous certifiez avoir consulté les résultats proposés ci-dessus ainsi que la <#960639230818807909>.`),
                    ...recommendationEmbeds
                ], components
            });
        }
    } catch (error) {
        console.error('Error in openTicket modal:', error);
        interaction.editReply({
            content: ':x: | Une erreur est survenue'
        }).catch(() => {});
    }
}
