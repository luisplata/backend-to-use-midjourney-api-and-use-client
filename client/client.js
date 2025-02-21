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
                console.log('Token guardado:', localStorage.getItem('apiToken'));
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
            console.log(data);
            data.upscale.forEach((element, index) => {
                SaveDataToStorage({
                    "result": data.result,
                    "upscale": element,
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

function LoadDataFromStorage() {
    const promptList = document.getElementById('content-prompts');
    //clean the prompt list
    promptList.innerHTML = '';
    const prompt = localStorage.getItem('prompts');
    if (prompt) {
        const prompts = JSON.parse(prompt);
        //sort the prompts by timestamp the most recent first
        console.log("before", prompts);
        prompts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        console.log("after", prompts);
        prompts.forEach((prompt, index) => {
            if (/^(ftp|http|https):\/\/[^ "]+$/.test(prompt.upscale)) {
                promptList.innerHTML += createHtmlFromJson(prompt);
            }
        });
    }
    GLightbox({
        selector: '.glightbox'
    });
}

// whent the user click the button save prompt, save it in the local storage and list it in the prompt list
function createHtmlFromJson(json) {
    console.log(json);
    return `
            <div class="col-xl-3 col-lg-4 col-md-6">
                <div class="gallery-item h-100">
                    <img src="${json.upscale}" class="img-fluid" alt="">
                    <div class="gallery-links d-flex align-items-center justify-content-center">
                        <a href="${json.upscale}"
                            title="${json.upscaler} ${json.prompt}"
                            class="glightbox preview-link">
                            <i class="bi bi-arrows-angle-expand"></i>
                        </a>
                        <button class='btn btn-primary' onclick='copyToClipboard(JSON.stringify(${JSON.stringify(json)}))'>Copy</button>
                    </div>
                </div>
            </div>
    `;
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