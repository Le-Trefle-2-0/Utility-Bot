const { readdir } = require('fs');

module.exports = (Client) => {
    readdir('./ContextMenus', (err, files) => {
        if (err) Client.log.error(err);

        files.forEach(file => {
            const menu = require(`../ContextMenus/${file}`);

            Client.contextMenus.set(menu.name, menu);
            delete require.cache[require.resolve(`../ContextMenus/${file}`)];
        });
    });
};