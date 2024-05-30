import winston from 'winston';

export const generalLogger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    transports: [
        new winston.transports.File({ filename: 'general.log' })
    ]
});

export const specificLogger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    transports: [
        new winston.transports.File({ filename: 'specific.log' })
    ]
});

export function configureLogging() {
    // Additional logging configuration if necessary
}
