#!/bin/bash

# Cargar las variables de entorno desde el archivo .env
export $(grep -v '^#' .env | xargs)

RUTA_ORIGEN="$HOME/polipeople.convexaestudio.com"
RUTA_ORIGEN="./"
ARCHIVO_ORIGINAL="imagine.log"

# Check if the file exists
if [ ! -f "$RUTA_ORIGEN/$ARCHIVO_ORIGINAL" ]; then
    echo "File not found."
    exit 1
fi

# Send the file as an attachment to the Discord webhook
curl -F "file=@$RUTA_ORIGEN/$ARCHIVO_ORIGINAL" \
     $WEBHOOK_URL

# Remove the log file
rm "$RUTA_ORIGEN/$ARCHIVO_ORIGINAL"