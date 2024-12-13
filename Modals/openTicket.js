const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require("discord.js");

module.exports = async (Client, interaction) => {
    let question = interaction.fields.getTextInputValue('question');

    if (!question) {
        return interaction.reply({
            content: 'Veuillez entrer une question',
            ephemeral: true
        });
    }

    let search = await Client.algolia.search({
        requests: [{
            indexName: 'questions',
            query: question,
            hitsPerPage: 5
        }]

    });
    
    let row = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId('openTicket')
            .setPlaceholder('Sélectionnez une option')
            .addOptions(
                new StringSelectMenuOptionBuilder()
                    .setLabel('Guide')
                    .setValue('1317139593279307838')
                    .setDescription('Contacter l\'équipe de Guide')
                    .setEmoji('1207378732625567824'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('Modération')
                    .setValue('1317139564799721614')
                    .setDescription('Contacter l\'équipe de Modération')
                    .setEmoji('1207378624030965770')
            )
    )
    let hits = search.results[0].hits;
    if (hits.length < 1) {
        return interaction.reply({
            content: 'Quelle équipe souhaitez-vous contacter ?',
            components: [row],
            ephemeral: true
        })
    } else {
        let string = '';
        for (let hit of hits) {
            if (!string.includes(hit.threadLink)) string += `${hit.threadLink}\n`;
        }

        interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor('9bd2d2')
                    .setDescription(`Il semblerait que votre question ait déjà été posée. Voici les résultats trouvés :\n\n${string}\nSi aucun de ces résultats ne répond à votre question, veuillez sélectionner une équipe ci-dessous.\nEn ouvrant un ticket, vous certifiez avoir consulté les résultats proposés ci-dessus ainsi que la <#960639230818807909>.`)
            ], components: [row], ephemeral: true
        });
    }
}