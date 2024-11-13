const winston = require('winston');

const customLogger = winston.createLogger({
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.File({ 
            filename: 'imagine.log',
            maxsize: 5242880, // 5MB
            maxFiles: 5
        }),
        new winston.transports.Console()
    ]
});

const generalLogger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.File({ 
            filename: 'general.log',
            maxsize: 5242880, // 5MB
            maxFiles: 5
        }),
        new winston.transports.Console()
    ]
});

// Sobrescribir console.error
function overrideConsoleError() {
    const originalConsoleError = console.error;
    console.error = (...args) => {
        // Convertir argumentos a string para el log
        const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : arg).join(' ');
        // Loguear usando Winston
        generalLogger.error(message);
        // Opcional: Llamar al console.error original si aún quieres que los mensajes se muestren en la consola
        // originalConsoleError(...args);
    };
}

overrideConsoleError();

module.exports = { generalLogger, customLogger, configureLogging };