const { readdir } = require('fs');

module.exports = (Client) => {
    readdir('./Menus', (err, files) => {
        if (err) throw err
    
        files.forEach(file => {
            let name = file.split('.')[0];

            Client.menus.set(name, require(`../Menus/${file}`));
        })
    });
}