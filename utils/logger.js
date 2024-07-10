const winston = require('winston');

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

const specificLogger = winston.createLogger({
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.File({ 
            filename: 'specific.log',
            maxsize: 5242880, // 5MB
            maxFiles: 5
        }),
        new winston.transports.Console()
    ]
});

function configureLogging() {
    // Additional logging configuration if necessary
}
// Función para sobrescribir console.log
function overrideConsoleLog() {
    const originalConsoleLog = console.log;

    console.log = (...args) => {
        // Convertir argumentos a string para el log
        const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : arg).join(' ');

        // Loguear usando Winston
        specificLogger.info(message);

        // Opcional: Llamar al console.log original si aún quieres que los mensajes se muestren en la consola
        // originalConsoleLog(...args);
    };
}

// Sobrescribir console.error
function overrideConsoleError() {
    const originalConsoleError = console.error;

    console.error = (...args) => {
        // Convertir argumentos a string para el log
        const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : arg).join(' ');

        // Loguear usando Winston
        specificLogger.error(message);

        // Opcional: Llamar al console.error original si aún quieres que los mensajes se muestren en la consola
        // originalConsoleError(...args);
    };
}

// Llamar a las funciones para sobrescribir
overrideConsoleLog();
overrideConsoleError();


module.exports = { generalLogger, specificLogger, configureLogging };