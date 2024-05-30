import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join, extname } from 'path';

function getBase64Image(filePath) {
    const image = readFileSync(filePath);
    const base64Image = Buffer.from(image).toString('base64');
    return base64Image;
}

const directoryPath = 'client/images/';

// Lee todos los nombres de los archivos en el directorio
const files = readdirSync(directoryPath);

// Procesa cada archivo
files.forEach(file => {
    // Solo procesa los archivos de imagen
    const ext = extname(file).toLowerCase();
    if (ext === '.png' || ext === '.jpg' || ext === '.jpeg') {
        const filePath = join(directoryPath, file);
        const base64Image = getBase64Image(filePath);

        // Guarda la cadena base64 en un archivo de texto
        const outputFilePath = join(directoryPath, file + '.txt');
        writeFileSync(outputFilePath, base64Image);
    }
});