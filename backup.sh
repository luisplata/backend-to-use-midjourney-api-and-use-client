#!/bin/bash

# Cargar las variables de entorno desde el archivo .env
export $(grep -v '^#' .env | xargs)

RUTA_ORIGEN="$HOME/polipeople.convexaestudio.com"
ARCHIVO_ORIGINAL="imagine.log"

# Función para enviar mensajes de error a Discord
send_error_to_discord() {
    local error_message=$1
    local payload="{\"content\": \"$error_message\"}"
    curl -H "Content-Type: application/json" -X POST -d "$payload" $WEBHOOK_URL
}

# Check if the file exists
if [ ! -f "$RUTA_ORIGEN/$ARCHIVO_ORIGINAL" ]; then
    send_error_to_discord "File not found: $RUTA_ORIGEN/$ARCHIVO_ORIGINAL"
    exit 1
fi

# Read the content of the file
LOG_CONTENT=$(cat "$RUTA_ORIGEN/$ARCHIVO_ORIGINAL")

# Escape JSON special characters
ESCAPED_LOG_CONTENT=$(echo "$LOG_CONTENT" | sed 's/\\/\\\\/g' | sed 's/"/\\"/g' | sed "s/'/\\'/g" | sed 's/`/\\`/g' | sed 's/\//\\\//g' | sed 's/\n/\\n/g' | sed 's/\r/\\r/g' | sed 's/\t/\\t/g')

# Create a JSON payload
JSON_PAYLOAD="{\"content\": \"$ESCAPED_LOG_CONTENT\"}"

# Send the content to the Discord webhook
curl -H "Content-Type: application/json" \
     -X POST \
     -d "$JSON_PAYLOAD" \
     $WEBHOOK_URL
CURL_EXIT_CODE=$?

if [ $CURL_EXIT_CODE -ne 0 ]; then
    send_error_to_discord "Failed to send file: curl exit code $CURL_EXIT_CODE"
    exit 1
fi

# Remove the log file
rm "$RUTA_ORIGEN/$ARCHIVO_ORIGINAL"
if [ $? -ne 0 ]; then
    send_error_to_discord "Failed to remove file: $RUTA_ORIGEN/$ARCHIVO_ORIGINAL"
    exit 1
fi

send_error_to_discord "Backup completed successfully"