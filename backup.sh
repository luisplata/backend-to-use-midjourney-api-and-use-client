#!/bin/bash

RUTA_ORIGEN="$HOME/polipeople.convexaestudio.com"
ARCHIVO_ORIGINAL="imagine.log"

# Cargar las variables de entorno desde el archivo .env
export $(grep -v '^#' $RUTA_ORIGEN/.env | xargs)

# Función para enviar mensajes de error a Discord
send_error_to_discord() {
    local error_message=$1
    local additional_message=$2
    local payload="{\"content\": \"$error_message\n$additional_message\"}"
    curl -H "Content-Type: application/json" -X POST -d "$payload" $WEBHOOK_URL
}

# Check if the file exists
if [ ! -f "$RUTA_ORIGEN/$ARCHIVO_ORIGINAL" ]; then
    send_error_to_discord "File not found: $RUTA_ORIGEN/$ARCHIVO_ORIGINAL" "Additional message: File check failed."
    exit 1
fi

JSON_PAYLOAD="{\"content\": \"$ESCAPED_LOG_CONTENT\nAdditional message: Backup process started.\"}"

# Send the file as an attachment to the Discord webhook
curl -v -H "Content-Type: multipart/form-data" \
     -F "file=@$RUTA_ORIGEN/$ARCHIVO_ORIGINAL" \
     -F "payload_json=$JSON_PAYLOAD" \
     $WEBHOOK_URL
CURL_EXIT_CODE=$?

if [ $CURL_EXIT_CODE -ne 0 ]; then
    send_error_to_discord "Failed to send file: curl exit code $CURL_EXIT_CODE" "Additional message: Curl command failed."
    exit 1
fi

Remove the log file
rm "$RUTA_ORIGEN/$ARCHIVO_ORIGINAL"
if [ $? -ne 0 ]; then
    send_error_to_discord "Failed to remove file: $RUTA_ORIGEN/$ARCHIVO_ORIGINAL" "Additional message: File removal failed."
    exit 1
fi

send_error_to_discord "Backup completed successfully" "Additional message: Backup process completed."