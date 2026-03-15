// API Configuration
const API_KEY = 'YOUR_TMDB_API_KEY'; // Get from https://www.themoviedb.org/documentation/api
const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

// State management
let currentMovies = [];
let currentPage = 1;
let isLoading = false;
let hasMore = true;
let currentSearch = '';
let currentFilters = {
    genre: 'all',
    year: 'all',
    rating: 'all'
};

// DOM Elements
const moviesGrid = document.getElementById('moviesGrid');
const searchInput = document.getElementById('searchInput');
const genreFilter = document.getElementById('genreFilter');
const yearFilter = document.getElementById('yearFilter');
const ratingFilter = document.getElementById('ratingFilter');
const loadingIndicator = document.getElementById('loading');
const errorMessage = document.getElementById('errorMessage');
const noResults = document.getElementById('noResults');
const themeToggle = document.getElementById('themeToggle');
const movieModal = document.getElementById('movieModal');
const modalBody = document.getElementById('modalBody');

// Theme Management
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
}

function updateThemeIcon(theme) {
    const icon = themeToggle.querySelector('i');
    icon.className = theme === 'light' ? 'fas fa-moon' : 'fas fa-sun';
}

// API Functions
async function fetchMovies(page = 1, search = '', filters = {}) {
    try {
        let url;
        if (search) {
            url = `${BASE_URL}/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(search)}&page=${page}`;
        } else {
            url = `${BASE_URL}/movie/popular?api_key=${API_KEY}&page=${page}`;
        }
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error('Failed to fetch movies');
        }
        
        const data = await response.json();
        
        // Apply filters
        let filteredResults = data.results;
        
        if (filters.genre && filters.genre !== 'all') {
            filteredResults = filteredResults.filter(movie => 
                movie.genre_ids && movie.genre_ids.includes(parseInt(filters.genre))
            );
        }
        
        if (filters.year && filters.year !== 'all') {
            filteredResults = filteredResults.filter(movie => 
                movie.release_date && movie.release_date.startsWith(filters.year)
            );
        }
        
        if (filters.rating && filters.rating !== 'all') {
            const minRating = parseInt(filters.rating);
            filteredResults = filteredResults.filter(movie => 
                movie.vote_average >= minRating
            );
        }
        
        return {
            results: filteredResults,
            totalPages: data.total_pages,
            page: data.page
        };
    } catch (error) {
        console.error('Error fetching movies:', error);
        throw error;
    }
}

async function fetchMovieDetails(movieId) {
    try {
        const response = await fetch(`${BASE_URL}/movie/${movieId}?api_key=${API_KEY}&append_to_response=credits,videos`);
        
        if (!response.ok) {
            throw new Error('Failed to fetch movie details');
        }
        
        return await response.json();
    } catch (error) {
        console.error('Error fetching movie details:', error);
        throw error;
    }
}

// UI Functions
function displayMovies(movies, append = false) {
    if (!append) {
        moviesGrid.innerHTML = '';
    }
    
    if (movies.length === 0) {
        noResults.style.display = 'block';
        moviesGrid.style.display = 'none';
        return;
    }
    
    noResults.style.display = 'none';
    moviesGrid.style.display = 'grid';
    
    movies.forEach((movie, index) => {
        const movieCard = createMovieCard(movie, index);
        moviesGrid.appendChild(movieCard);
    });
}

function createMovieCard(movie, index) {
    const card = document.createElement('div');
    card.className = 'movie-card';
    card.style.animationDelay = `${index * 0.1}s`;
    card.onclick = () => showMovieDetails(movie.id);
    
    const posterPath = movie.poster_path 
        ? `${IMAGE_BASE_URL}${movie.poster_path}`
        : 'https://via.placeholder.com/500x750?text=No+Poster';
    
    const year = movie.release_date ? movie.release_date.split('-')[0] : 'N/A';
    const rating = movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A';
    
    card.innerHTML = `
        <div class="movie-poster">
            <img src="${posterPath}" alt="${movie.title}" loading="lazy">
            <div class="movie-rating">
                <i class="fas fa-star"></i> ${rating}
            </div>
        </div>
        <div class="movie-info">
            <h3>${movie.title}</h3>
            <div class="movie-year">${year}</div>
            <div class="movie-genres">
                ${getGenreTags(movie.genre_ids || [])}
            </div>
            <p class="movie-overview">${movie.overview || 'No overview available.'}</p>
        </div>
    `;
    
    return card;
}

function getGenreTags(genreIds) {
    const genreMap = {
        28: 'Action',
        35: 'Comedy',
        18: 'Drama',
        27: 'Horror',
        10749: 'Romance',
        878: 'Sci-Fi'
    };
    
    return genreIds.slice(0, 2).map(id => 
        `<span class="genre-tag">${genreMap[id] || 'Other'}</span>`
    ).join('');
}

async function showMovieDetails(movieId) {
    try {
        showLoading();
        const movie = await fetchMovieDetails(movieId);
        hideLoading();
        
        displayMovieModal(movie);
    } catch (error) {
        hideLoading();
        showError('Failed to load movie details');
    }
}

function displayMovieModal(movie) {
    const posterPath = movie.poster_path 
        ? `${IMAGE_BASE_URL}${movie.poster_path}`
        : 'https://via.placeholder.com/500x750?text=No+Poster';
    
    const director = movie.credits?.crew?.find(person => person.job === 'Director')?.name || 'N/A';
    const cast = movie.credits?.cast?.slice(0, 5).map(actor => actor.name).join(', ') || 'N/A';
    const runtime = movie.runtime ? `${Math.floor(movie.runtime / 60)}h ${movie.runtime % 60}m` : 'N/A';
    const year = movie.release_date ? movie.release_date.split('-')[0] : 'N/A';
    
    modalBody.innerHTML = `
        <div class="modal-movie">
            <div class="modal-movie-poster">
                <img src="${posterPath}" alt="${movie.title}">
            </div>
            <div class="modal-movie-info">
                <h2>${movie.title}</h2>
                <div class="modal-meta">
                    <span>${year}</span>
                    <span>•</span>
                    <span>${runtime}</span>
                    <span>•</span>
                    <span class="modal-rating">
                        <i class="fas fa-star"></i> ${movie.vote_average?.toFixed(1)}/10
                    </span>
                </div>
                
                <p class="modal-overview">${movie.overview || 'No overview available.'}</p>
                
                <div class="modal-details">
                    <div class="detail-item">
                        <span class="detail-label">Director</span>
                        <span class="detail-value">${director}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Cast</span>
                        <span class="detail-value">${cast}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Budget</span>
                        <span class="detail-value">$${movie.budget?.toLocaleString() || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Revenue</span>
                        <span class="detail-value">$${movie.revenue?.toLocaleString() || 'N/A'}</span>
                    </div>
                </div>
                
                ${movie.homepage ? `
                    <a href="${movie.homepage}" target="_blank" class="btn" style="display: inline-block; margin-top: 20px;">
                        Visit Official Website
                    </a>
                ` : ''}
            </div>
        </div>
    `;
    
    openModal();
}

function openModal() {
    movieModal.classList.add('show');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    movieModal.classList.remove('show');
    document.body.style.overflow = '';
}

// Event Handlers
async function loadMovies(reset = true) {
    if (isLoading) return;
    
    if (reset) {
        currentPage = 1;
        currentMovies = [];
        hasMore = true;
    }
    
    if (!hasMore) return;
    
    try {
        isLoading = true;
        showLoading();
        hideError();
        
        const data = await fetchMovies(currentPage, currentSearch, currentFilters);
        
        if (data.results.length > 0) {
            currentMovies = reset ? data.results : [...currentMovies, ...data.results];
            displayMovies(data.results, !reset);
            hasMore = currentPage < data.totalPages;
            currentPage++;
        } else {
            displayMovies([]);
            hasMore = false;
        }
        
        hideLoading();
    } catch (error) {
        hideLoading();
        showError('Failed to load movies. Please try again.');
    } finally {
        isLoading = false;
    }
}

function handleSearch() {
    currentSearch = searchInput.value.trim();
    loadMovies(true);
}

function handleFilterChange() {
    currentFilters = {
        genre: genreFilter.value,
        year: yearFilter.value,
        rating: ratingFilter.value
    };
    loadMovies(true);
}

// Utility Functions
function showLoading() {
    loadingIndicator.style.display = 'block';
}

function hideLoading() {
    loadingIndicator.style.display = 'none';
}

function showError(message) {
    errorMessage.style.display = 'block';
    errorMessage.querySelector('p').textContent = message;
}

function hideError() {
    errorMessage.style.display = 'none';
}

// Infinite Scroll
function handleScroll() {
    const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
    
    if (scrollTop + clientHeight >= scrollHeight - 100 && !isLoading && hasMore) {
        loadMovies(false);
    }
}

// Debounce function for search
function debounce(func, delay) {
    let timeoutId;
    return function (...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    loadMovies();
    
    // Event Listeners
    themeToggle.addEventListener('click', toggleTheme);
    searchInput.addEventListener('input', debounce(handleSearch, 500));
    genreFilter.addEventListener('change', handleFilterChange);
    yearFilter.addEventListener('change', handleFilterChange);
    ratingFilter.addEventListener('change', handleFilterChange);
    window.addEventListener('scroll', handleScroll);
    
    // Close modal when clicking outside
    movieModal.addEventListener('click', (e) => {
        if (e.target === movieModal) {
            closeModal();
        }
    });
    
    // Close modal with Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && movieModal.classList.contains('show')) {
            closeModal();
        }
    });
});

// Make functions globally available
window.closeModal = closeModal;
window.loadMovies = loadMovies;
