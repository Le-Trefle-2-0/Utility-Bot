const { ThreadAutoArchiveDuration, EmbedBuilder } = require("discord.js");

module.exports = async (Client, interaction) => {
    let question = interaction.fields.getTextInputValue('question');
    let reply = interaction.fields.getTextInputValue('reply');
    let msgId = interaction.fields.getTextInputValue('msgId');

    let message = await interaction.channel.messages.fetch(msgId);
    if (message) {
        interaction.reply({
            content: 'Réponse en cours d\'envoi...',
            ephemeral: true
        });

        message.startThread({
            name: question,
            autoArchiveDuration: ThreadAutoArchiveDuration.OneWeek
        }).then(async thread => {
            message.channel.messages.fetch({ limit: 100 }).then(messages => {
                let msg = messages.find(m => m.author.id === Client.user.id);
                if (msg) msg.delete();
            });
            await thread.send({
                content: `<@${message.author.id}> - <@${interaction.user.id}>`,
                embeds: [
                    new EmbedBuilder()
                        .setColor('9bd2d2')
                        .setDescription(reply)
                        .setAuthor({
                            name: interaction.user.displayName, 
                            iconURL: interaction.user.displayAvatarURL({ dynamic: true })
                        })
                ]
            });

            await Client.algolia.saveObjects({
                indexName: 'questions',
                objects: [{
                    objectID: thread.id,
                    question: question,
                    answer: reply,
                    threadLink: thread.url
                }]
            })

            Client.Questions.create({
                question: question,
                answer: reply,
                threadLink: thread.url
            })

            interaction.editReply({
                content: 'Réponse envoyée !',
                ephemeral: true
            });
        });
    } else {
        interaction.reply({
            content: 'Impossible de trouver le message',
            ephemeral: true
        });
    }
}