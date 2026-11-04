// Prévient les personnes qui rejoignent un salon vocal pendant les 5 dernières minutes avant la fermeture
module.exports = async (Client, oldState, newState) => {
    if (!Client.closeAt || !newState.channelId || oldState.channelId === newState.channelId) return;
    if (Date.now() >= Client.closeAt) return;

    const channel = Client.getClosableVoiceChannels().find(c => c.id === newState.channelId);
    if (channel) await Client.warnVoiceChannel(channel);
};
