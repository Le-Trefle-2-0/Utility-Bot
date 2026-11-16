const colors = require('colors/safe');

module.exports = {
	error: (log) => {
		if (log.length > 200) {
			log = log.substring(0, 200);
		}
		console.log(colors.red(`\n${new Date().toLocaleString('FR-fr')} - Error :\n${log}`));
	},
    
    warning: (log) => {
        if (log.length > 200) {
            log = log.substring(0, 200);
        }
        console.log(colors.yellow(`\n${new Date().toLocaleString('FR-fr')} - Warning :\n${log}`));
	},

	// Alias : plusieurs modules appellent Client.log.warn(), qui n'existait pas (appels ignorés silencieusement)
	warn: (log) => module.exports.warning(log),

	info: (log) => {
		console.log(colors.green(`\n${new Date().toLocaleString('FR-fr')} - Info :\n${log}`));
	}
}