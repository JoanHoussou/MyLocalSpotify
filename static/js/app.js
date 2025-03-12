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

    // État de l'application
    let currentPlaylist = [];
    let currentIndex = -1;
    let isPlaying = false;
    let folderStructure = {}; // Pour organiser les fichiers par dossier

    // Initialisation
    loadMusicLibrary();
    setupEventListeners();

    // Fonctions
    function loadMusicLibrary() {
        fetch('/list')
            .then(response => response.json())
            .then(data => {
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
            })
            .catch(error => console.error('Erreur lors du chargement de la bibliothèque:', error));
    }

    function displayMusicLibrary() {
        musicLibraryElement.innerHTML = '';
        
        // Trier les dossiers
        const sortedFolders = Object.keys(folderStructure).sort();
        
        sortedFolders.forEach(folder => {
            const folderElement = document.createElement('div');
            folderElement.className = 'folder';
            
            const folderHeader = document.createElement('div');
            folderHeader.className = 'folder-header';
            folderHeader.innerHTML = `<span class="folder-name">${folder}</span>`;
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
                fileElement.textContent = file.name;
                fileElement.addEventListener('click', () => {
                    playFile(file);
                });
                folderContent.appendChild(fileElement);
            });
            
            folderElement.appendChild(folderHeader);
            folderElement.appendChild(folderContent);
            musicLibraryElement.appendChild(folderElement);
        });
    }

    function playFile(file) {
        // Mettre à jour l'index et la playlist si nécessaire
        const folder = file.folder || 'Racine';
        currentPlaylist = folderStructure[folder];
        currentIndex = currentPlaylist.findIndex(item => item.path === file.path);
        
        // Charger et jouer le fichier
        loadCurrentTrack();
    }

    function loadCurrentTrack() {
        if (currentIndex < 0 || currentIndex >= currentPlaylist.length) {
            return;
        }
        
        const file = currentPlaylist[currentIndex];
        
        // Charger le fichier audio
        audioPlayer.src = `/play/${encodeURIComponent(file.path)}`;
        
        // Charger les métadonnées
        fetch(`/metadata/${encodeURIComponent(file.path)}`)
            .then(response => response.json())
            .then(metadata => {
                currentTitle.textContent = metadata.title || file.name;
                currentArtist.textContent = metadata.artist || 'Inconnu';
                currentAlbum.textContent = metadata.album || 'Inconnu';
                
                // Charger la pochette si disponible
                if (metadata.has_cover) {
                    fetch(`/cover/${encodeURIComponent(file.path)}`)
                        .then(response => response.json())
                        .then(data => {
                            if (data.cover) {
                                currentCover.src = `data:image/jpeg;base64,${data.cover}`;
                            } else {
                                currentCover.src = "{{ url_for('static', filename='img/default-cover.jpg') }}";
                            }
                        })
                        .catch(() => {
                            currentCover.src = "{{ url_for('static', filename='img/default-cover.jpg') }}";
                        });
                } else {
                    currentCover.src = "{{ url_for('static', filename='img/default-cover.jpg') }}";
                }
            })
            .catch(error => {
                console.error('Erreur lors du chargement des métadonnées:', error);
                currentTitle.textContent = file.name;
                currentArtist.textContent = 'Inconnu';
                currentAlbum.textContent = 'Inconnu';
                currentCover.src = "{{ url_for('static', filename='img/default-cover.jpg') }}";
            });
        
        // Jouer le fichier
        audioPlayer.play()
            .then(() => {
                isPlaying = true;
                updatePlayButton();
            })
            .catch(error => {
                console.error('Erreur lors de la lecture:', error);
            });
    }

    function playPrevious() {
        if (currentPlaylist.length === 0) return;
        
        currentIndex = (currentIndex - 1 + currentPlaylist.length) % currentPlaylist.length;
        loadCurrentTrack();
    }

    function playNext() {
        if (currentPlaylist.length === 0) return;
        
        currentIndex = (currentIndex + 1) % currentPlaylist.length;
        loadCurrentTrack();
    }

    function togglePlay() {
        if (currentPlaylist.length === 0) return;
        
        if (audioPlayer.paused) {
            audioPlayer.play();
            isPlaying = true;
        } else {
            audioPlayer.pause();
            isPlaying = false;
        }
        
        updatePlayButton();
    }

    function updatePlayButton() {
        playButton.innerHTML = isPlaying ? '<i class="icon-pause">⏸</i>' : '<i class="icon-play">▶</i>';
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

    function setupEventListeners() {
        // Boutons de lecture
        playButton.addEventListener('click', togglePlay);
        prevButton.addEventListener('click', playPrevious);
        nextButton.addEventListener('click', playNext);
        
        // Contrôle du volume
        volumeControl.addEventListener('input', () => {
            audioPlayer.volume = volumeControl.value;
        });
        
        // Définir le volume initial
        audioPlayer.volume = volumeControl.value;
        
        // Barre de progression
        const progressContainer = document.querySelector('.progress-bar');
        progressContainer.addEventListener('click', (e) => {
            const rect = progressContainer.getBoundingClientRect();
            const percent = (e.clientX - rect.left) / rect.width;
            audioPlayer.currentTime = percent * audioPlayer.duration;
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
    }
});