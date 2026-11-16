const modVoice = require('../Utility/modVoice');

module.exports = async (Client, oldState, newState) => {
    // Accès au vocal conditionné à la présence d'un modérateur
    if (oldState.channelId !== newState.channelId) {
        for (const channel of new Set([oldState.channel, newState.channel])) {
            if (channel) await modVoice.syncChannel(Client, channel);
        }
    }

    // Prévient les personnes qui rejoignent un salon vocal pendant les 5 dernières minutes avant la fermeture
    if (!Client.closeAt || !newState.channelId || oldState.channelId === newState.channelId) return;
    if (Date.now() >= Client.closeAt) return;

    const channel = Client.getClosableVoiceChannels().find(c => c.id === newState.channelId);
    if (channel) await Client.warnVoiceChannel(channel);
};
