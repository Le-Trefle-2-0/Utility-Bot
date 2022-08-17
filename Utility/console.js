const colors = require('colors/safe');
const { randomUUID } = require('crypto');
const { readdir, writeFile } = require('fs');

module.exports = {
	error: (log) => {
		const errId = genUniqueUUID();
		const txt = `${Date().toLocaleString()} - Error report
        ${errId}
        ${log}`;

		if (log.length > 200) {
			log = log.subString(0, 200);
		}
		console.log(colors.red(`\n${Date().toLocaleString('FR-fr')} - Error :\n${log}\n\nFor complete log please see Logs/Errors/${errId}.log`));
        
        saveLogs('Errors', log, errId);
	},
    
    warning: (log) => {
        const errId = genUniqueUUID();
        const txt = `${Date().toLocaleString()} - Warning report
        ${errId}
        ${log}`;

        if (log.length > 200) {
            log = log.subString(0, 200);
        }
        console.log(colors.yellow(`\n${Date().toLocaleString('FR-fr')} - Warning :\n${log}\n\nFor complete log please see Logs/Warnings/${errId}.log`));

        saveLogs('Warnings', log, errId);
	},

	info: (log) => {
		console.log(colors.green(`\n${Date().toLocaleString('FR-fr')} - Info :\n${log}`));
	}
}

function saveLogs(logType, message, UUID) {
	writeFile(`./Logs/${logType}/${UUID}.log`, message, (err) => {
		if (err) throw err;
	});
}

function genUniqueUUID() {
	const UUID = randomUUID();
	readdir('../Logs/Errors', (err, files) => {
		if (err) throw err;
		if (files.includes(`${UUID}.log`)) {
			return genUniqueUUID();
		}
	});

	readdir('../Logs/Warnings', (err, files) => {
		if (err) throw err;
		if (files.includes(`${UUID}.log`)) {
			return genUniqueUUID();
		}
	});

	return UUID;
}