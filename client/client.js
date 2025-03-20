// Obtén la contraseña de los parámetros GET
const urlParams = new URLSearchParams(window.location.search);
const password = urlParams.get('password');

/**
 * Preloader
 */
const preloader = document.querySelector('#preloader');
var errorText = document.getElementById('message');
var promptPanel = document.getElementById('prompt-fill');
promptPanel.classList.add('visually-hidden');

window.addEventListener('load', () => {
    if (preloader) {
        fetch('/auth/get-token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ password }),
        })
            .then(response => {
                if (!response.ok) {
                    return response.json().then(err => {
                        throw new Error(err.error);
                    });
                }
                return response.json();
            })
            .then(data => {
                // Guarda el token en localStorage
                localStorage.setItem('apiToken', data.token);
                promptPanel.classList.remove('visually-hidden');
                //Read from local storage and list the prompts
                LoadDataFromStorage();
                setTimeout(() => {
                    preloader.classList.add('loaded');
                }, 1000);
                setTimeout(() => {
                    preloader.remove();
                }, 2000);
            })
            .catch((error) => {
                localStorage.setItem('apiToken', null);
                console.error('Error:', error);
                errorText.textContent = `Error: ${error.message}`;
                setTimeout(() => {
                    preloader.classList.add('loaded');
                }, 1000);
                setTimeout(() => {
                    preloader.remove();
                }, 2000);
            });
    }
});


document.getElementById('sendPrompt').addEventListener('click', async function () {
    const promptInput = document.getElementById('prompt');
    const prompt = promptInput.value;
    promptPanel.classList.add('visually-hidden');
    errorText.textContent = `Loading! Please wait...`;

    // Obtén el token de localStorage
    const apiToken = localStorage.getItem('apiToken');

    if (!apiToken || apiToken === 'null' || apiToken === 'undefined' || apiToken === '' || apiToken === null || apiToken === undefined) {
        errorText.textContent = 'Error: No token';
        return;
    }
    let retries = 3;
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const response = await fetch('/api/imagine', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiToken}`,
                },
                body: JSON.stringify({ prompt }),
            });
            if (!response.ok) throw new Error(`Error de autenticación (Intento ${attempt})`);
            let data = await response.json();
            await data.upscale.forEach(async (element, index) => {

                if (/^(ftp|http|https):\/\/[^ "]+$/.test(data.result)) {

                }
                if (/^(ftp|http|https):\/\/[^ "]+$/.test(element)) {

                }

                SaveDataToStorage({
                    "result": await saveImageToIndexedDB(await imageToBase64(data.result), generateUUID()),
                    "upscale": await saveImageToIndexedDB(await imageToBase64(element), generateUUID()),
                    "prompt": data.prompt,
                    "upscaler": "U" + (index + 1),
                    "timestamp": new Date().toISOString(),
                });
            });
            promptInput.value = '';
            promptPanel.classList.remove('visually-hidden');
            errorText.textContent = `Prompt saved! write a new one...`;
        } catch (error) {
            console.error(error);
            if (attempt === retries) throw error;
        }
    }
});

async function LoadDataFromStorage() {
    const promptList = document.getElementById('content-prompts');
    promptList.innerHTML = '';

    const prompt = localStorage.getItem('prompts');
    if (prompt) {
        const prompts = JSON.parse(prompt);
        prompts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        for (const prompt of prompts) {
            const html = await createHtmlFromJson(prompt);
            promptList.innerHTML += html;
        }
    }
}


// whent the user click the button save prompt, save it in the local storage and list it in the prompt list
async function createHtmlFromJson(json) {
    let imageBase64 = await getImageFromIndexedDB(json.upscale);

    return `
        <div class="col-xl-3 col-lg-4 col-md-6">
            <div class="gallery-item h-100">
                <img src="${imageBase64}" class="img-fluid" alt="" onclick="showImageModal('${imageBase64}', '${json.upscaler}')">
                <div class="gallery-links d-flex align-items-center justify-content-center">
                    <button class="btn btn-primary" onclick="showImageModal('${imageBase64}', '${json.prompt}')">
                        <i class="bi bi-arrows-angle-expand"></i> Ver
                    </button>
                </div>
            </div>
        </div>
    `;
}

function showImageModal(imageUrl, description) {
    document.getElementById("modalImage").src = imageUrl; // Cargar la imagen en el modal
    document.getElementById("modalDescription").textContent = description; // Mostrar descripción
    document.getElementById("downloadButton").href = imageUrl; // Enlace para descargar la imagen

    let imageModal = new bootstrap.Modal(document.getElementById("imageModal"));
    imageModal.show();
}

function base64ToBlobUrl(base64) {
    let arr = base64.split(',');
    let mime = arr[0].match(/:(.*?);/)[1]; // Extraer el tipo MIME
    let byteCharacters = atob(arr[1]); // Decodificar Base64
    let byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    let byteArray = new Uint8Array(byteNumbers);
    let blob = new Blob([byteArray], { type: mime }); // Usar el tipo MIME correcto
    return URL.createObjectURL(blob);
}

function copyToClipboard(text) {
    var textarea = document.createElement("textarea");
    textarea.textContent = text;
    document.body.appendChild(textarea);
    textarea.select();
    try {
        return document.execCommand("copy");  // Security exception may be thrown by some browsers.
    } catch (ex) {
        console.warn("Copy to clipboard failed.", ex);
        return false;
    } finally {
        document.body.removeChild(textarea);
    }
}

function SaveDataToStorage(data) {
    const prompt = localStorage.getItem('prompts');
    if (prompt) {
        const prompts = JSON.parse(prompt);
        prompts.push(data);
        localStorage.setItem('prompts', JSON.stringify(prompts));
    }
    else {
        const prompts = [];
        prompts.push(data);
        localStorage.setItem('prompts', JSON.stringify(prompts));
    }
    LoadDataFromStorage();
}

async function imageToBase64(url) {
    try {
        const response = await fetch(url);
        const blob = await response.blob();
        return await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.error('Error al convertir la imagen:', error);
        return null;
    }
}

function saveToLocalStorage(key, value) {
    try {
        localStorage.setItem(key, value);
        console.log('Imagen guardada en localStorage');
    } catch (e) {
        console.error('Error guardando en localStorage:', e);
    }
}

function getFromLocalStorage(key) {
    return localStorage.getItem(key);
}

function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

async function saveImageToIndexedDB(imageData, imageKey) {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open("ImageDB", 1);

        request.onupgradeneeded = function (event) {
            let db = event.target.result;
            if (!db.objectStoreNames.contains("images")) {
                db.createObjectStore("images", { keyPath: "id" });
            }
        };

        request.onsuccess = function (event) {
            let db = event.target.result;
            let transaction = db.transaction("images", "readwrite");
            let store = transaction.objectStore("images");
            let putRequest = store.put({ id: imageKey, data: imageData });

            putRequest.onsuccess = function () {
                //console.log("Imagen guardada en IndexedDB con key:", imageKey);
                resolve(imageKey); // Retorna la clave
            };

            putRequest.onerror = function (event) {
                console.error("Error al guardar la imagen:", event);
                reject(event);
            };
        };

        request.onerror = function (event) {
            console.error("Error al abrir IndexedDB:", event);
            reject(event);
        };
    });
}

async function getImageFromIndexedDB(imageKey) {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open("ImageDB", 1);

        request.onsuccess = function (event) {
            let db = event.target.result;
            let transaction = db.transaction("images", "readonly");
            let store = transaction.objectStore("images");
            let getRequest = store.get(imageKey);

            getRequest.onsuccess = function () {
                if (getRequest.result) {
                    console.log("Imagen recuperada:", getRequest.result.data);
                    resolve(getRequest.result.data); // Retorna la imagen en Base64
                } else {
                    console.warn("No se encontró la imagen en IndexedDB con key:", imageKey);
                    resolve(null); // Retorna null si la imagen no existe
                }
            };

            getRequest.onerror = function (event) {
                console.error("Error al obtener la imagen:", event);
                reject(event);
            };
        };

        request.onerror = function (event) {
            console.error("Error al abrir IndexedDB:", event);
            reject(event);
        };
    });
}
// Ver la imagen en Base64
//console.log(getFromLocalStorage('imageData'));

// Para usar la imagen en un <img>
//document.getElementById('miImagen').src = getFromLocalStorage('imageData');