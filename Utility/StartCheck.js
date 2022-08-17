const { existsSync, mkdir } = require('fs');

module.exports = () => {
    if (!existsSync('../Logs')) {
        mkdir('../Logs', (err) => {
            if (err) throw err;
        });
    }

    if (!existsSync('../Logs/Errors')) {
        mkdir('../Logs/Errors', (err) => {
            if (err) throw err;
        }
        );
    }

    if (!existsSync('../Logs/Warnings')) {
        mkdir('../Logs/Warnings', (err) => {
            if (err) throw err;
        }
        );
    }
}