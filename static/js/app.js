document.addEventListener('DOMContentLoaded', function() {
    // Éléments du DOM
    const musicLibraryElement = document.getElementById('music-library');
    const audioPlayer = document.getElementById('audio-player');
    const playButton = document.getElementById('play-btn');
    const prevButton = document.getElementById('prev-btn');
    const nextButton = document.getElementById('next-btn');
    const volumeControl = document.getElementById('volume');
    const progressBar = document.getElementById('progress');
    const currentTimeDisplay = document.getElementById('current-time');
    const totalTimeDisplay = document.getElementById('total-time');
    const currentCover = document.getElementById('current-cover');
    const currentTitle = document.getElementById('current-title');
    const currentArtist = document.getElementById('current-artist');
    const currentAlbum = document.getElementById('current-album');
    const container = document.querySelector('.container');

    // État de l'application
    let currentPlaylist = [];
    let currentIndex = -1;
    let isPlaying = false;
    let folderStructure = {}; // Pour organiser les fichiers par dossier
    let metadataCache = {}; // Cache pour les métadonnées
    let audioPreload = new Audio(); // Pour précharger le morceau suivant
    let userPlaylists = {}; // Pour stocker les playlists personnalisées

    // Créer un élément de notification
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.style.display = 'none';
    container.appendChild(notification);

    // Ajouter une barre de recherche
    const searchContainer = document.createElement('div');
    searchContainer.className = 'search-container';
    searchContainer.innerHTML = `
        <input type="text" id="search-input" placeholder="Rechercher...">
        <button id="search-button">🔍</button>
    `;
    document.querySelector('.sidebar .section').insertBefore(searchContainer, musicLibraryElement);
    
    const searchInput = document.getElementById('search-input');
    const searchButton = document.getElementById('search-button');

    // Initialisation
    init();

    async function init() {
        try {
            showNotification('Chargement de la bibliothèque...', 'info');
            await loadMusicLibrary();
            setupEventListeners();
            loadPlaylistsFromLocalStorage();
            hideNotification();
        } catch (error) {
            showNotification('Erreur lors de l\'initialisation: ' + error.message, 'error');
            console.error('Erreur d\'initialisation:', error);
        }
    }

    // Fonctions
    async function loadMusicLibrary() {
        try {
            const response = await fetch('/list');
            if (!response.ok) throw new Error(`Erreur HTTP: ${response.status}`);
            
            const data = await response.json();
            
            // Organiser les fichiers par dossier
            folderStructure = {};
            data.forEach(file => {
                const folder = file.folder || 'Racine';
                if (!folderStructure[folder]) {
                    folderStructure[folder] = [];
                }
                folderStructure[folder].push(file);
            });
            
            // Afficher la bibliothèque
            displayMusicLibrary();
        } catch (error) {
            showNotification('Erreur lors du chargement de la bibliothèque', 'error');
            console.error('Erreur lors du chargement de la bibliothèque:', error);
            throw error;
        }
    }

    function displayMusicLibrary(filter = '') {
        musicLibraryElement.innerHTML = '';
        
        // Créer l'élément pour les playlists
        if (Object.keys(userPlaylists).length > 0) {
            const playlistsElement = document.createElement('div');
            playlistsElement.className = 'folder';
            
            const playlistsHeader = document.createElement('div');
            playlistsHeader.className = 'folder-header';
            playlistsHeader.innerHTML = `<span class="folder-name">Playlists</span>`;
            playlistsHeader.addEventListener('click', () => {
                playlistsElement.classList.toggle('expanded');
            });
            
            const playlistsContent = document.createElement('div');
            playlistsContent.className = 'folder-content';
            
            Object.keys(userPlaylists).forEach(playlistName => {
                const playlistElement = document.createElement('div');
                playlistElement.className = 'playlist-item';
                playlistElement.textContent = playlistName;
                playlistElement.addEventListener('click', () => {
                    loadPlaylist(playlistName);
                });
                playlistsContent.appendChild(playlistElement);
            });
            
            playlistsElement.appendChild(playlistsHeader);
            playlistsElement.appendChild(playlistsContent);
            musicLibraryElement.appendChild(playlistsElement);
        }
        
        // Filtrer les dossiers et fichiers si nécessaire
        let filteredFolders = Object.keys(folderStructure).sort();
        
        if (filter) {
            const filterLower = filter.toLowerCase();
            const filteredStructure = {};
            
            Object.keys(folderStructure).forEach(folder => {
                const matchingFiles = folderStructure[folder].filter(file => 
                    file.name.toLowerCase().includes(filterLower)
                );
                
                if (matchingFiles.length > 0) {
                    filteredStructure[folder] = matchingFiles;
                }
            });
            
            filteredFolders = Object.keys(filteredStructure).sort();
            
            if (filteredFolders.length === 0) {
                const noResultsElement = document.createElement('div');
                noResultsElement.className = 'no-results';
                noResultsElement.textContent = 'Aucun résultat trouvé';
                musicLibraryElement.appendChild(noResultsElement);
                return;
            }
            
            // Utiliser la structure filtrée pour l'affichage
            folderStructure = filteredStructure;
        }
        
        filteredFolders.forEach(folder => {
            const folderElement = document.createElement('div');
            folderElement.className = 'folder';
            
            const folderHeader = document.createElement('div');
            folderHeader.className = 'folder-header';
            folderHeader.innerHTML = `
                <span class="folder-icon">📁</span>
                <span class="folder-name">${folder}</span>
                <span class="folder-count">(${folderStructure[folder].length})</span>
            `;
            folderHeader.addEventListener('click', () => {
                folderElement.classList.toggle('expanded');
            });
            
            const folderContent = document.createElement('div');
            folderContent.className = 'folder-content';
            
            // Trier les fichiers par nom
            const sortedFiles = folderStructure[folder].sort((a, b) => a.name.localeCompare(b.name));
            
            sortedFiles.forEach(file => {
                const fileElement = document.createElement('div');
                fileElement.className = 'music-file';
                fileElement.innerHTML = `
                    <span class="music-icon">🎵</span>
                    <span class="music-name">${file.name}</span>
                    <div class="music-actions">
                        <button class="add-to-playlist" data-path="${file.path}">+</button>
                    </div>
                `;
                fileElement.addEventListener('click', (e) => {
                    // Ignorer si le clic est sur le bouton d'ajout à la playlist
                    if (e.target.classList.contains('add-to-playlist')) return;
                    
                    // Ajouter une classe active au fichier sélectionné
                    document.querySelectorAll('.music-file.active').forEach(el => {
                        el.classList.remove('active');
                    });
                    fileElement.classList.add('active');
                    
                    playFile(file);
                });
                
                // Ajouter un gestionnaire pour le bouton d'ajout à la playlist
                fileElement.querySelector('.add-to-playlist').addEventListener('click', (e) => {
                    e.stopPropagation();
                    showPlaylistModal(file);
                });
                
                folderContent.appendChild(fileElement);
            });
            
            folderElement.appendChild(folderHeader);
            folderElement.appendChild(folderContent);
            musicLibraryElement.appendChild(folderElement);
        });
        
        // Ouvrir le premier dossier par défaut
        if (musicLibraryElement.querySelector('.folder')) {
            musicLibraryElement.querySelector('.folder').classList.add('expanded');
        }
    }

    async function playFile(file) {
        try {
            // Mettre à jour l'index et la playlist si nécessaire
            const folder = file.folder || 'Racine';
            currentPlaylist = folderStructure[folder];
            currentIndex = currentPlaylist.findIndex(item => item.path === file.path);
            
            // Charger et jouer le fichier
            await loadCurrentTrack();
            
            // Précharger le morceau suivant
            preloadNextTrack();
        } catch (error) {
            showNotification('Erreur lors de la lecture du fichier', 'error');
            console.error('Erreur lors de la lecture du fichier:', error);
        }
    }

    async function loadCurrentTrack() {
        if (currentIndex < 0 || currentIndex >= currentPlaylist.length) {
            return;
        }
        
        const file = currentPlaylist[currentIndex];
        
        try {
            // Afficher un indicateur de chargement
            currentTitle.innerHTML = `<span class="loading">Chargement...</span>`;
            currentArtist.textContent = '';
            currentAlbum.textContent = '';
            
            // Charger le fichier audio
            audioPlayer.src = `/play/${encodeURIComponent(file.path)}`;
            
            // Charger les métadonnées (depuis le cache si disponible)
            let metadata;
            if (metadataCache[file.path]) {
                metadata = metadataCache[file.path];
            } else {
                const response = await fetch(`/metadata/${encodeURIComponent(file.path)}`);
                if (!response.ok) throw new Error(`Erreur HTTP: ${response.status}`);
                metadata = await response.json();
                metadataCache[file.path] = metadata; // Mettre en cache
            }
            
            // Mettre à jour l'interface
            currentTitle.textContent = metadata.title || file.name;
            currentArtist.textContent = metadata.artist || 'Inconnu';
            currentAlbum.textContent = metadata.album || 'Inconnu';
            
            // Charger la pochette si disponible
            if (metadata.has_cover) {
                try {
                    const coverResponse = await fetch(`/cover/${encodeURIComponent(file.path)}`);
                    if (!coverResponse.ok) throw new Error(`Erreur HTTP: ${coverResponse.status}`);
                    const coverData = await coverResponse.json();
                    
                    if (coverData.cover) {
                        currentCover.src = `data:image/jpeg;base64,${coverData.cover}`;
                    } else {
                        currentCover.src = "{{ url_for('static', filename='img/default-cover.jpg') }}";
                    }
                } catch (error) {
                    console.error('Erreur lors du chargement de la pochette:', error);
                    currentCover.src = "{{ url_for('static', filename='img/default-cover.jpg') }}";
                }
            } else {
                currentCover.src = "{{ url_for('static', filename='img/default-cover.jpg') }}";
            }
            
            // Mettre à jour le titre de la page
            document.title = `${metadata.title || file.name} - SpotifyLocal`;
            
            // Jouer le fichier
            await audioPlayer.play();
            isPlaying = true;
            updatePlayButton();
            
            // Ajouter une animation de "Now Playing"
            document.querySelector('.now-playing').classList.add('playing');
            setTimeout(() => {
                document.querySelector('.now-playing').classList.remove('playing');
            }, 1000);
            
        } catch (error) {
            showNotification('Erreur lors de la lecture', 'error');
            console.error('Erreur lors du chargement du morceau:', error);
            
            // Rétablir l'interface en cas d'erreur
            currentTitle.textContent = file.name;
            currentArtist.textContent = 'Inconnu';
            currentAlbum.textContent = 'Inconnu';
            currentCover.src = "{{ url_for('static', filename='img/default-cover.jpg') }}";
        }
    }

    function preloadNextTrack() {
        if (currentPlaylist.length <= 1) return;
        
        const nextIndex = (currentIndex + 1) % currentPlaylist.length;
        const nextFile = currentPlaylist[nextIndex];
        
        // Précharger le fichier audio
        audioPreload.src = `/play/${encodeURIComponent(nextFile.path)}`;
        
        // Précharger les métadonnées si pas déjà en cache
        if (!metadataCache[nextFile.path]) {
            fetch(`/metadata/${encodeURIComponent(nextFile.path)}`)
                .then(response => response.json())
                .then(metadata => {
                    metadataCache[nextFile.path] = metadata;
                    
                    // Précharger la pochette si disponible
                    if (metadata.has_cover) {
                        fetch(`/cover/${encodeURIComponent(nextFile.path)}`);
                    }
                })
                .catch(error => {
                    console.error('Erreur lors du préchargement des métadonnées:', error);
                });
        }
    }

    function playPrevious() {
        if (currentPlaylist.length === 0) return;
        
        // Si on est au début du morceau, revenir au morceau précédent
        // Sinon, revenir au début du morceau actuel
        if (audioPlayer.currentTime > 3) {
            audioPlayer.currentTime = 0;
        } else {
            currentIndex = (currentIndex - 1 + currentPlaylist.length) % currentPlaylist.length;
            loadCurrentTrack();
        }
    }

    function playNext() {
        if (currentPlaylist.length === 0) return;
        
        currentIndex = (currentIndex + 1) % currentPlaylist.length;
        loadCurrentTrack()
            .then(() => preloadNextTrack())
            .catch(error => {
                console.error('Erreur lors du passage au morceau suivant:', error);
                showNotification('Erreur lors du passage au morceau suivant', 'error');
            });
    }

    function togglePlay() {
        if (currentPlaylist.length === 0) {
            showNotification('Aucun morceau sélectionné', 'info');
            return;
        }
        
        if (audioPlayer.paused) {
            audioPlayer.play()
                .then(() => {
                    isPlaying = true;
                    updatePlayButton();
                })
                .catch(error => {
                    console.error('Erreur lors de la lecture:', error);
                    showNotification('Erreur lors de la lecture', 'error');
                });
        } else {
            audioPlayer.pause();
            isPlaying = false;
            updatePlayButton();
        }
    }

    function updatePlayButton() {
        playButton.innerHTML = isPlaying ? '<i class="icon-pause">⏸</i>' : '<i class="icon-play">▶</i>';
        if (isPlaying) {
            playButton.classList.add('playing');
        } else {
            playButton.classList.remove('playing');
        }
    }

    function formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    function updateProgress() {
        if (audioPlayer.duration) {
            const progress = (audioPlayer.currentTime / audioPlayer.duration) * 100;
            progressBar.style.width = `${progress}%`;
            currentTimeDisplay.textContent = formatTime(audioPlayer.currentTime);
            totalTimeDisplay.textContent = formatTime(audioPlayer.duration);
        } else {
            progressBar.style.width = '0%';
            currentTimeDisplay.textContent = '0:00';
            totalTimeDisplay.textContent = '0:00';
        }
    }

    function showNotification(message, type = 'info') {
        notification.textContent = message;
        notification.className = `notification ${type}`;
        notification.style.display = 'block';
        
        // Faire apparaître avec animation
        notification.style.opacity = '0';
        setTimeout(() => {
            notification.style.opacity = '1';
        }, 10);
        
        // Masquer après 3 secondes
        setTimeout(hideNotification, 3000);
    }
    
    function hideNotification() {
        notification.style.opacity = '0';
        setTimeout(() => {
            notification.style.display = 'none';
        }, 300);
    }

    // Fonctions pour les playlists
    function showPlaylistModal(file) {
        // Créer ou récupérer le modal
        let modal = document.getElementById('playlist-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'playlist-modal';
            modal.className = 'modal';
            modal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Ajouter à une playlist</h3>
                        <span class="close">&times;</span>
                    </div>
                    <div class="modal-body">
                        <div id="playlist-list"></div>
                        <div class="new-playlist">
                            <input type="text" id="new-playlist-name" placeholder="Nom de la nouvelle playlist">
                            <button id="create-playlist">Créer</button>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
            
            // Gestionnaire pour fermer le modal
            modal.querySelector('.close').addEventListener('click', () => {
                modal.style.display = 'none';
            });
        }
        
        // Remplir la liste des playlists existantes
        const playlistList = modal.querySelector('#playlist-list');
        playlistList.innerHTML = '';
        
        if (Object.keys(userPlaylists).length === 0) {
            playlistList.innerHTML = '<p>Aucune playlist existante</p>';
        } else {
            Object.keys(userPlaylists).forEach(playlistName => {
                const playlistItem = document.createElement('div');
                playlistItem.className = 'playlist-modal-item';
                playlistItem.textContent = playlistName;
                playlistItem.addEventListener('click', () => {
                    addToPlaylist(playlistName, file);
                    modal.style.display = 'none';
                });
                playlistList.appendChild(playlistItem);
            });
        }
        
        // Gestionnaire pour créer une nouvelle playlist
        const newPlaylistBtn = modal.querySelector('#create-playlist');
        const newPlaylistInput = modal.querySelector('#new-playlist-name');
        
        newPlaylistBtn.onclick = () => {
            const playlistName = newPlaylistInput.value.trim();
            if (playlistName) {
                createPlaylist(playlistName);
                addToPlaylist(playlistName, file);
                modal.style.display = 'none';
            } else {
                showNotification('Veuillez entrer un nom de playlist', 'error');
            }
        };
        
        // Afficher le modal
        modal.style.display = 'block';
    }
    
    function createPlaylist(name) {
        if (!userPlaylists[name]) {
            userPlaylists[name] = [];
            showNotification(`Playlist "${name}" créée`);
            savePlaylistsToLocalStorage();
            displayMusicLibrary();
        }
    }
    
    function addToPlaylist(playlistName, file) {
        // Vérifier si le fichier est déjà dans la playlist
        const isAlreadyInPlaylist = userPlaylists[playlistName].some(
            item => item.path === file.path
        );
        
        if (!isAlreadyInPlaylist) {
            userPlaylists[playlistName].push(file);
            showNotification(`"${file.name}" ajouté à "${playlistName}"`);
            savePlaylistsToLocalStorage();
        } else {
            showNotification(`Ce morceau est déjà dans la playlist "${playlistName}"`, 'info');
        }
    }
    
    function loadPlaylist(playlistName) {
        if (userPlaylists[playlistName] && userPlaylists[playlistName].length > 0) {
            currentPlaylist = [...userPlaylists[playlistName]];
            currentIndex = 0;
            loadCurrentTrack();
            
            // Marquer tous les fichiers de la playlist
            document.querySelectorAll('.music-file.in-playlist').forEach(el => {
                el.classList.remove('in-playlist');
            });
            
            currentPlaylist.forEach(file => {
                const fileElements = document.querySelectorAll(`.music-file .music-name`);
                fileElements.forEach(el => {
                    if (el.textContent === file.name) {
                        el.closest('.music-file').classList.add('in-playlist');
                    }
                });
            });
            
            showNotification(`Lecture de la playlist "${playlistName}"`);
        } else {
            showNotification(`La playlist "${playlistName}" est vide`, 'info');
        }
    }
    
    function savePlaylistsToLocalStorage() {
        localStorage.setItem('userPlaylists', JSON.stringify(userPlaylists));
    }
    
    function loadPlaylistsFromLocalStorage() {
        const savedPlaylists = localStorage.getItem('userPlaylists');
        if (savedPlaylists) {
            try {
                userPlaylists = JSON.parse(savedPlaylists);
            } catch (error) {
                console.error('Erreur lors du chargement des playlists:', error);
                userPlaylists = {};
            }
        }
    }

    function setupEventListeners() {
        // Boutons de lecture
        playButton.addEventListener('click', togglePlay);
        prevButton.addEventListener('click', playPrevious);
        nextButton.addEventListener('click', playNext);
        
        // Raccourcis clavier
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT') return; // Ignorer si dans un champ de texte
            
            switch (e.code) {
                case 'Space':
                    e.preventDefault();
                    togglePlay();
                    break;
                case 'ArrowLeft':
                    if (e.ctrlKey) {
                        playPrevious();
                    } else {
                        audioPlayer.currentTime -= 10; // Reculer de 10 secondes
                    }
                    break;
                case 'ArrowRight':
                    if (e.ctrlKey) {
                        playNext();
                    } else {
                        audioPlayer.currentTime += 10; // Avancer de 10 secondes
                    }
                    break;
                case 'ArrowUp':
                    volumeControl.value = Math.min(1, parseFloat(volumeControl.value) + 0.1);
                    audioPlayer.volume = volumeControl.value;
                    break;
                case 'ArrowDown':
                    volumeControl.value = Math.max(0, parseFloat(volumeControl.value) - 0.1);
                    audioPlayer.volume = volumeControl.value;
                    break;
            }
        });
        
        // Contrôle du volume
        volumeControl.addEventListener('input', () => {
            audioPlayer.volume = volumeControl.value;
            localStorage.setItem('volume', volumeControl.value);
        });
        
        // Charger le volume sauvegardé
        const savedVolume = localStorage.getItem('volume');
        if (savedVolume !== null) {
            volumeControl.value = savedVolume;
            audioPlayer.volume = savedVolume;
        } else {
            // Définir le volume initial
            audioPlayer.volume = volumeControl.value;
        }
        
        // Barre de progression
        const progressContainer = document.querySelector('.progress-bar');
        progressContainer.addEventListener('click', (e) => {
            const rect = progressContainer.getBoundingClientRect();
            const percent = (e.clientX - rect.left) / rect.width;
            audioPlayer.currentTime = percent * audioPlayer.duration;
        });
        
        // Recherche
        searchButton.addEventListener('click', () => {
            const searchTerm = searchInput.value.trim();
            displayMusicLibrary(searchTerm);
        });
        
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const searchTerm = searchInput.value.trim();
                displayMusicLibrary(searchTerm);
            }
        });
        
        // Effacer la recherche
        searchInput.addEventListener('input', () => {
            if (searchInput.value === '') {
                displayMusicLibrary();
            }
        });
        
        // Événements de l'audio
        audioPlayer.addEventListener('timeupdate', updateProgress);
        audioPlayer.addEventListener('ended', playNext);
        audioPlayer.addEventListener('play', () => {
            isPlaying = true;
            updatePlayButton();
        });
        audioPlayer.addEventListener('pause', () => {
            isPlaying = false;
            updatePlayButton();
        });
        audioPlayer.addEventListener('error', (e) => {
            console.error('Erreur du lecteur audio:', e);
            showNotification('Erreur de lecture du fichier audio', 'error');
            
            // Essayer de passer au morceau suivant après une erreur
            setTimeout(playNext, 2000);
        });
    }
});