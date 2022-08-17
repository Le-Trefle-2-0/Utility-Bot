const { readdir } = require('fs');

module.exports = async (Client) => {
    readdir('./Events', (err, files) => {
        if (err) Client.log.error(err);

        files.forEach(file => {
            const event = require(`../Events/${file}`);
            const eventName = file.split('.')[0];

            Client.on(eventName, event.bind(null, Client));
            delete require.cache[require.resolve(`../Events/${file}`)];
        });
    });
}