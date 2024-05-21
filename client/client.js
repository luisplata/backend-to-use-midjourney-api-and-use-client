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
if (preloader) {
    window.addEventListener('load', () => {
        fetch('/api/get-token', {
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
    });
}


document.getElementById('sendPrompt').addEventListener('click', function () {
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

    fetch('/api/imagine', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiToken}`,
        },
        body: JSON.stringify({ prompt }),
    })
        .then(response => {
            if (!response.ok) {
                throw new Error('Error de autenticación');
            }
            return response.json();
        })
        .then(data => {
            /*
            {
                "message": "Imagine",
                "result": "https://media.discordapp.net/attachments/1241165530090700931/1242502457041359049/servipublicitarios_37759_A_young_culinary_student_cooking_Chine_b6f27ebd-fcd1-4c47-8f3b-7fe51ab5bfe5.png?ex=664e1216&is=664cc096&hm=9d326a72e95e399cbacb15a8ad65d876e04238896dffd079ecbf548822f27d41&",
                "upscale": [
                    "https://media.discordapp.net/attachments/1241165530090700931/1242502464645763214/servipublicitarios_37759_A_young_culinary_student_cooking_Chine_bf83f136-585f-4cfd-888e-a2820ac6cf94.png?ex=664e1218&is=664cc098&hm=097f3c61ee14071003fc781db653904c73ff5e6bc243e3fcd67baca30fd0d62f&",
                    "https://media.discordapp.net/attachments/1241165530090700931/1242502470983487619/servipublicitarios_37759_A_young_culinary_student_cooking_Chine_9bde0db0-67ba-42dd-8756-395d2fcb3581.png?ex=664e1219&is=664cc099&hm=65beca7936a1c58670f8c8056a2ae3d5ce969e42ed3e732eba71b283f18e0436&",
                    "https://media.discordapp.net/attachments/1241165530090700931/1242502476582621304/servipublicitarios_37759_A_young_culinary_student_cooking_Chine_9c7e6e5e-bbfd-4743-b96f-76008a91b48e.png?ex=664e121a&is=664cc09a&hm=1969c3953ccc39b732a52d336571562073a7a9128af513b44590ed5080c1d86f&",
                    "https://media.discordapp.net/attachments/1241165530090700931/1242502485726462093/servipublicitarios_37759_A_young_culinary_student_cooking_Chine_ad783575-56ec-47ff-b1db-5f6a1ed12e4a.png?ex=664e121d&is=664cc09d&hm=63a2755e8166eb5b190f8df034dd1c025b45ef3774f17f3731a7c88a5f988958&"
                ],
                "prompt": "A young culinary student cooking Chinese fried rice, the photo is taken from behind a shelf looking at the student as he shakes the bowl of rice over the flame, he is smiling at the camera, vibrant colors highlighting the steam rising from the wok, stainless steel kitchen equipment reflecting light, bustling atmosphere of a professional kitchen with other chefs in the background, the scene exudes excitement and passion for cooking, Photography, captured with a Canon EOS R5 and a 35mm f/1.8 lens, --ar 16:9 --v 5"
            }
            */
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
        })
        .catch((error) => {
            console.error('Error:', error);
            errorText.textContent = `Error: No token ${error.message}`;
        });
});

function LoadDataFromStorage() {
    const promptList = document.getElementById('content-prompts');
    //clean the prompt list
    promptList.innerHTML = '';
    const prompt = localStorage.getItem('prompts');
    if (prompt) {
        const prompts = JSON.parse(prompt);
        //sort the prompts by timestamp the most recent first
        console.log("before",prompts);
        prompts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        console.log("after",prompts);
        prompts.forEach((prompt, index) => {
            promptList.innerHTML += createHtmlFromJson(prompt);
        });
    }
    const glightbox = GLightbox({
        selector: '.glightbox'
    });
}

// whent the user click the button save prompt, save it in the local storage and list it in the prompt list
function createHtmlFromJson(json) {
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