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

            Client.on(eventName, event.bind(null, Client));
            delete require.cache[require.resolve(`../Events/${file}`)];
        });
    });
}