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

            Client.on(eventName, (...args) => {
                const guildId = args[0]?.guildId || args[0]?.guild?.id || (args[0]?.message ? args[0].message.guildId : null) || (args[1]?.guildId || args[1]?.guild?.id);

                if (guildId && guildId !== Client.settings.mainGuildID) return;

                event(Client, ...args);
            });
            delete require.cache[require.resolve(`../Events/${file}`)];
        });
    });
}