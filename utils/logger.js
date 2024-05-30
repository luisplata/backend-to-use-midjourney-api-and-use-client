const winston = require('winston');

const generalLogger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    transports: [
        new winston.transports.File({ filename: 'general.log' })
    ]
});

const specificLogger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    transports: [
        new winston.transports.File({ filename: 'specific.log' })
    ]
});

function configureLogging() {
    // Additional logging configuration if necessary
}

module.exports = { generalLogger, specificLogger, configureLogging };