module.exports = (Client, interaction) => {
    interaction.reply({
        content: 'This is an example button!',
        ephemeral: true
    });
}