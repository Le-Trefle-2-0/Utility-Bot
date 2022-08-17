const { readdir } = require('fs');

module.exports = (Client) => {
    readdir('./Commands', (err, files) => {
        if (err) Client.log.error(err);

        files.forEach(file => {
            const command = require(`../Commands/${file}`);
            command.name = file.split('.')[0].toLocaleLowerCase();

            Client.commands.set(command.name, command);
            delete require.cache[require.resolve(`../Commands/${file}`)];
        });
    });
};