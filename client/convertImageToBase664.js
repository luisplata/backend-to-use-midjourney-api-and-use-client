import { readFileSync, writeFileSync } from 'fs';

function getBase64Image(filePath) {
    const image = readFileSync(filePath);
    const base64Image = Buffer.from(image).toString('base64');
    return base64Image;
}

const base64Image = getBase64Image('client/images/boy-bot.png');

// Guarda la cadena base64 en un archivo de texto
writeFileSync('client/images/boy-bot.txt', base64Image);