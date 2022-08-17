const { existsSync, mkdir } = require('fs');

module.exports = async () => {
    if (!existsSync('./Logs')) {
        await mkdir('./Logs', (err) => {
            if (err) throw err;
        });
    }

    if (!existsSync('./Logs/Errors')) {
        await mkdir('./Logs/Errors', (err) => {
            if (err) throw err;
        }
        );
    }

    if (!existsSync('./Logs/Warnings')) {
        await mkdir('./Logs/Warnings', (err) => {
            if (err) throw err;
        }
        );
    }
}