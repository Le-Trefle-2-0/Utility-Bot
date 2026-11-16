const { readdir } = require('fs');

module.exports = (Client) => {
    readdir('./Commands', (err, files) => {
        if (err) Client.log.error(err);

        files.forEach(file => {
            // Une commande qui ne se charge pas (ex. dépendance manquante) ne doit pas empêcher les suivantes
            try {
                const command = require(`../Commands/${file}`);
                command.name = file.split('.')[0].toLocaleLowerCase();

                Client.commands.set(command.name, command);
                delete require.cache[require.resolve(`../Commands/${file}`)];
            } catch (error) {
                Client.log.error(`Impossible de charger la commande ${file} : ${error.message}`);
            }
        });
    });
};