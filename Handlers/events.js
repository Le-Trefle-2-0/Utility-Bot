const { readdir } = require('fs');

module.exports = async (Client) => {
    readdir('./Events', {recursive: true}, (err, files) => {
        if (err) Client.log.error(err);
        console.log(files);

        files.forEach(file => {
            if (!file.endsWith('.js')) return;
            const event = require(`../Events/${file}`);
            const eventName = file.split('/').findLast(() => true).split('.')[0];
            console.log(`Loaded ${eventName} from ${file}`);

            Client.on(eventName, async (...args) => {
                const guildId = args[0]?.guildId || args[0]?.guild?.id || (args[0]?.message ? args[0].message.guildId : null) || (args[1]?.guildId || args[1]?.guild?.id);

                if (guildId && guildId !== Client.settings.mainGuildID) return;

                try {
                    // Les modèles (Client.ModLogs, etc.) n'existent qu'une fois la base initialisée :
                    // on retient les évènements reçus avant, et on les abandonne si l'initialisation a échoué.
                    // clientReady attend déjà dbReady lui-même.
                    if (eventName !== 'clientReady' && Client.dbReady) await Client.dbReady;
                    await event(Client, ...args);
                } catch (error) {
                    Client.log?.error?.(`Erreur dans l'évènement ${eventName} : ${error.stack || error.message}`);
                }
            });
            delete require.cache[require.resolve(`../Events/${file}`)];
        });
    });
}
