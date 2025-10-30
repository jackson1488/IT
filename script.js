const NASA_API_KEY = 'cVcoOuT9lNTYVS4SBWLuyXLlmvQM7d5oYXn47sTw';
const NASA_API_URL = 'https://images-api.nasa.gov/search';
let currentPage = 1;
let currentQuery = 'space';
let isLoading = false;
let hasMore = true;
let usedImageIds = new Set();

const gallery = document.getElementById('gallery');
const loader = document.getElementById('loader');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const refreshBtn = document.getElementById('refreshBtn');
const modal = document.getElementById('modal');
const modalImage = document.getElementById('modalImage');
const modalTitle = document.getElementById('modalTitle');
const modalDescription = document.getElementById('modalDescription');
const closeModal = document.getElementById('closeModal');
const downloadBtn = document.getElementById('downloadBtn');

function initSpaceBackground() {
    const canvas = document.getElementById('spaceCanvas');
    const ctx = canvas.getContext('2d');

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const stars = [];
    const numStars = 300;

    class Star {
        constructor() {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.size = Math.random() * 2;
            this.speedX = (Math.random() - 0.5) * 0.3;
            this.speedY = (Math.random() - 0.5) * 0.3;
            this.opacity = Math.random();
            this.twinkleSpeed = Math.random() * 0.02 + 0.01;
            this.twinkleDirection = Math.random() > 0.5 ? 1 : -1;
        }

        update() {
            this.x += this.speedX;
            this.y += this.speedY;

            if (this.x < 0) this.x = canvas.width;
            if (this.x > canvas.width) this.x = 0;
            if (this.y < 0) this.y = canvas.height;
            if (this.y > canvas.height) this.y = 0;

            this.opacity += this.twinkleSpeed * this.twinkleDirection;
            if (this.opacity >= 1 || this.opacity <= 0.3) {
                this.twinkleDirection *= -1;
            }
        }

        draw() {
            ctx.fillStyle = `rgba(255, 255, 255, ${this.opacity})`;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    for (let i = 0; i < numStars; i++) {
        stars.push(new Star());
    }

    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const gradient = ctx.createRadialGradient(
            canvas.width / 2, canvas.height / 2, 0,
            canvas.width / 2, canvas.height / 2, canvas.width / 2
        );
        gradient.addColorStop(0, '#1B2735');
        gradient.addColorStop(1, '#090A0F');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        stars.forEach(star => {
            star.update();
            star.draw();
        });

        requestAnimationFrame(animate);
    }

    animate();

    window.addEventListener('resize', () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    });
}

async function translateText(text, targetLang = 'ru') {
    try {
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
        const response = await fetch(url);

        if (!response.ok) throw new Error('Translation failed');

        const data = await response.json();

        if (Array.isArray(data) && data[0] && Array.isArray(data[0])) {
            return data[0].map(sentence => sentence[0]).join(' ');
        }

        return text;
    } catch (error) {
        console.error('Translation error:', error);
        return text;
    }
}

function getRandomSearchTerms() {
    const terms = [
        'galaxy', 'nebula', 'mars', 'jupiter', 'saturn', 'moon', 'sun',
        'astronaut', 'hubble', 'planet', 'comet', 'asteroid', 'star cluster',
        'milky way', 'apollo', 'ISS', 'earth', 'cosmic', 'universe', 'supernova'
    ];
    return terms[Math.floor(Math.random() * terms.length)];
}

async function fetchImages(query, page = 1, isRefresh = false) {
    if (isLoading || !hasMore) return;

    isLoading = true;
    loader.classList.add('active');

    try {
        const searchQuery = isRefresh ? getRandomSearchTerms() : query;
        const translatedQuery = await translateText(searchQuery, 'en');

        const randomOffset = isRefresh ? Math.floor(Math.random() * 50) : 0;
        const url = `${NASA_API_URL}?q=${encodeURIComponent(translatedQuery)}&page=${page + randomOffset}&media_type=image&year_start=2000`;
        const response = await fetch(url);

        if (!response.ok) throw new Error('Failed to fetch images');

        const data = await response.json();
        let items = data.collection.items;

        if (items.length === 0) {
            hasMore = false;
            loader.innerHTML = '<p>Больше изображений не найдено</p>';
            return;
        }

        items = items.filter(item => {
            const id = item.data[0]?.nasa_id;
            if (usedImageIds.has(id)) return false;
            usedImageIds.add(id);
            return true;
        });

        items.forEach(item => {
            const imageData = item.data[0];
            const imageLink = item.links?.[0]?.href;

            if (imageLink) {
                createGalleryItem(imageData, imageLink, item);
            }
        });

        currentPage++;
    } catch (error) {
        console.error('Error fetching images:', error);
        gallery.innerHTML += '<p style="grid-column: 1/-1; text-align: center;">Ошибка загрузки. Попробуйте позже.</p>';
    } finally {
        isLoading = false;
        loader.classList.remove('active');
    }
}

function createGalleryItem(imageData, imageUrl, fullData) {
    const item = document.createElement('div');
    item.className = 'gallery-item';

    const img = document.createElement('img');
    img.src = imageUrl;
    img.alt = imageData.title || 'NASA Image';
    img.loading = 'lazy';

    const title = document.createElement('div');
    title.className = 'gallery-item-title';
    title.textContent = imageData.title || 'Без названия';

    item.appendChild(img);
    item.appendChild(title);

    item.addEventListener('click', () => openModal(imageData, imageUrl, fullData));

    gallery.appendChild(item);
}

async function openModal(imageData, imageUrl, fullData) {
    modal.classList.add('active');
    modalImage.src = imageUrl;
    modalTitle.textContent = imageData.title || 'Без названия';
    modalDescription.textContent = 'Загрузка описания...';

    let hdImageUrl = imageUrl;
    if (fullData.href) {
        try {
            const manifestResponse = await fetch(fullData.href);
            const manifest = await manifestResponse.json();

            const hdImage = manifest.find(url => url.includes('~large') || url.includes('~orig'));
            if (hdImage) {
                hdImageUrl = hdImage;
                modalImage.src = hdImage;
            }
        } catch (error) {
            console.error('Error fetching HD image:', error);
        }
    }

    if (imageData.description) {
        const translatedDescription = await translateText(imageData.description, 'ru');
        modalDescription.textContent = translatedDescription;
    } else {
        modalDescription.textContent = 'Описание отсутствует';
    }

    downloadBtn.onclick = () => downloadImage(hdImageUrl, imageData.title);
}

closeModal.addEventListener('click', () => {
    modal.classList.remove('active');
});

modal.addEventListener('click', (e) => {
    if (e.target === modal) {
        modal.classList.remove('active');
    }
});

async function downloadImage(url, filename) {
    try {
        const response = await fetch(url);
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = filename ? `${filename.replace(/[^a-zA-Z0-9]/g, '_')}.jpg` : 'nasa_image.jpg';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
        console.error('Download error:', error);
        alert('Ошибка скачивания изображения');
    }
}

searchBtn.addEventListener('click', () => {
    const query = searchInput.value.trim();
    if (query) {
        gallery.innerHTML = '';
        currentQuery = query;
        currentPage = 1;
        hasMore = true;
        usedImageIds.clear();
        fetchImages(currentQuery, currentPage, false);
    }
});

searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        searchBtn.click();
    }
});

refreshBtn.addEventListener('click', () => {
    gallery.innerHTML = '';
    currentPage = 1;
    hasMore = true;
    usedImageIds.clear();
    searchInput.value = '';
    fetchImages('space', currentPage, true);
});

window.addEventListener('scroll', () => {
    const { scrollTop, scrollHeight, clientHeight } = document.documentElement;

    if (scrollTop + clientHeight >= scrollHeight - 300 && !isLoading && hasMore) {
        fetchImages(currentQuery, currentPage, false);
    }
});

initSpaceBackground();
fetchImages(currentQuery, currentPage, false);
