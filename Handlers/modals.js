const { readdir } = require('fs');

module.exports = (Client) => {
    readdir('./Modals', (err, files) => {
        if (err) throw err
    
        files.forEach(file => {
            let name = file.split('.')[0];

            Client.modals.set(name, require(`../Modals/${file}`));
        })
    });
}