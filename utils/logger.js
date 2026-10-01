
const chalk = require('chalk');

function success(msg) { process.stderr.write(`${chalk.green('✔')} ${msg}\n`); }
function error(msg)   { process.stderr.write(`${chalk.red('✖')} ${msg}\n`); }
function warn(msg)    { process.stderr.write(`${chalk.yellow('△')} ${msg}\n`); }
function info(msg)    { process.stderr.write(`${chalk.blue('ℹ')} ${msg}\n`); }

module.exports = { success, error, warn, info };