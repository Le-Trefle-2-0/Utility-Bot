const { ModalBuilder, ActionRowBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');

module.exports = {
    name: 'Répondre à la question',
    type: 'message',
    run: async (Client, interaction) => {
        let suggested = interaction.targetMessage.content

        try {
            const SYSTEM_PROMPT = `Tu es un assistant dédié à accompagner un service de support à répondre aux questions d'utilisateurs. Il t'es ici demandé de générer un titre résumant la question, utilisé derrière pour l'indexage des questions passées. Ne répond que par le titre, sans ajouter de contenu, ni de "bonjour", ni de "ca vous convient ?". Juste le titre !`;

            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'qwen/qwen3.6-27b',
                    messages: [
                        { role: 'system', content: SYSTEM_PROMPT },
                        {
                            role: 'user',
                            content: interaction.targetMessage.content
                        }
                    ],
                    temperature: 0.7,
                    max_tokens: 300,
                    reasoning_effort: "none"
                })
            });

            const data = await response.json();
            let content = data.choices?.[0]?.message?.content;
            if (!content) return fallback;

            suggested = content.replace(/<think>[\s\S]*?(?:<\/think>|$)/gi, '').trim();

        } catch (err) {
            console.error('Erreur API Groq / parsing :', err);
        }

        const modal = new ModalBuilder()
            .setCustomId('replyQuestion')
            .setTitle('Répondre à la question')
            .addComponents(
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('question')
                        .setLabel('Question')
                        .setRequired(true)
                        .setValue(suggested)
                        .setStyle(TextInputStyle.Short)
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('reply')
                        .setLabel('Réponse')
                        .setMaxLength(2000)
                        .setRequired(true)
                        .setStyle(TextInputStyle.Paragraph)
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('msgId')
                        .setLabel('NE PAS MODIFIER')
                        .setMinLength(19)
                        .setMaxLength(19)
                        .setRequired(true)
                        .setValue(interaction.targetMessage.id)
                        .setStyle(TextInputStyle.Short)
                )
            );

        await interaction.showModal(modal);
    }
}