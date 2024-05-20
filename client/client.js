// Obtén la contraseña de los parámetros GET
const urlParams = new URLSearchParams(window.location.search);
const password = urlParams.get('password');

// Muestra el panel de error con el mensaje 'obteniendo key'
const errorPanel = document.getElementById('errorPanel');

// Cuando la página termine de cargar, envía la contraseña al servidor y obtén el token
window.addEventListener('load', function () {
    errorPanel.style.display = 'block';
    errorPanel.textContent = 'Obteniendo key';
    fetch('http://localhost:3000/api/get-token', {
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
            localStorage.setItem('apiToken', data.apiToken);

            // Oculta el panel de error y el panel de carga
            errorPanel.style.display = 'none';
            const loadingPanel = document.getElementById('loadingPanel');
            loadingPanel.style.display = 'none';

            // Muestra el contenido de la página
            const content = document.getElementById('content');
            content.style.display = 'block';
        })
        .catch((error) => {
            console.error('Error two:', error);
            console.error('Error:', error);
            errorPanel.textContent = 'Error: ' + error.message;
            errorPanel.style.display = 'block';
        });
});

document.getElementById('sendPrompt').addEventListener('click', function () {
    const promptInput = document.getElementById('promptInput');
    const prompt = promptInput.value;

    // Muestra el panel de carga
    const loadingPanel = document.getElementById('loadingPanel');
    loadingPanel.style.display = 'block';

    // Obtén el token de localStorage
    const apiToken = localStorage.getItem('apiToken');

    fetch('http://localhost:3000/api/imagine', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            // Incluye el token en la cabecera Authorization
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
            const output = document.getElementById('output');
            output.innerHTML += `<p>${data.message}: ${JSON.stringify(data.result)}</p>`;
            if (data.upscale) {
                output.innerHTML += `<p>Upscale: ${JSON.stringify(data.upscale)}</p>`;
            }

            // Assuming the image URL is in data.result.image
            if (data.upscale) {
                const resultImage = document.getElementById('resultImage');
                resultImage.src = data.upscale;
            }

            loadingPanel.style.display = 'none';
        })
        .catch((error) => {
            console.error('Error:', error);

            // Muestra el panel de error
            errorPanel.style.display = 'block';
            errorPanel.textContent = 'Error: ' + error.message;

            loadingPanel.style.display = 'none';
        });
});