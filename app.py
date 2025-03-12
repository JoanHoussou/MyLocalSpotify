import os
from flask import Flask, render_template, send_file, jsonify, request, redirect, url_for
import json
from mutagen.mp3 import MP3
from mutagen.id3 import ID3
from mutagen.flac import FLAC
from mutagen.mp4 import MP4
import base64
import io
import requests  # Import the requests library for making HTTP requests


class MusicFile:
    """Classe représentant un fichier musical avec ses métadonnées"""

    def __init__(self, file_path, root_folder):
        """
        Initialise un fichier musical

        Args:
            file_path (str): Chemin complet du fichier
            root_folder (str): Dossier racine de la musique
        """
        self.full_path = file_path
        self.relative_path = os.path.relpath(file_path, root_folder)
        self.name = os.path.splitext(os.path.basename(file_path))[0]
        self.extension = os.path.splitext(file_path)[1][1:].lower()
        self.folder = os.path.relpath(os.path.dirname(file_path), root_folder) if os.path.dirname(
            file_path) != root_folder else ''

        # Métadonnées par défaut
        self.title = self.name
        self.artist = 'Inconnu'
        self.album = 'Inconnu'
        self.has_cover = False

        # Charger les métadonnées
        self._load_metadata()

    def _load_metadata(self):
        """Charge les métadonnées du fichier musical"""
        try:
            if self.extension == 'mp3':
                self._load_mp3_metadata()
            elif self.extension == 'flac':
                self._load_flac_metadata()
            elif self.extension in ['m4a', 'aac']:
                self._load_mp4_metadata()
        except Exception as e:
            print(f"Erreur lors de l'extraction des métadonnées pour {self.relative_path}: {e}")

    def _load_mp3_metadata(self):
        """Charge les métadonnées d'un fichier MP3"""
        audio = MP3(self.full_path)
        try:
            tags = ID3(self.full_path)

            if 'TIT2' in tags:
                self.title = str(tags['TIT2'])
            if 'TPE1' in tags:
                self.artist = str(tags['TPE1'])
            if 'TALB' in tags:
                self.album = str(tags['TALB'])

            # Vérifier s'il y a une pochette
            if 'APIC:' in tags or 'APIC:Cover' in tags:
                self.has_cover = True
        except Exception as e:
            print(f"Erreur ID3 pour {self.relative_path}: {e}")

    def _load_flac_metadata(self):
        """Charge les métadonnées d'un fichier FLAC"""
        audio = FLAC(self.full_path)

        if 'title' in audio:
            self.title = audio['title'][0]
        if 'artist' in audio:
            self.artist = audio['artist'][0]
        if 'album' in audio:
            self.album = audio['album'][0]

        # Vérifier s'il y a une pochette
        if audio.pictures:
            self.has_cover = True

    def _load_mp4_metadata(self):
        """Charge les métadonnées d'un fichier MP4/M4A"""
        audio = MP4(self.full_path)

        if '\xa9nam' in audio:
            self.title = audio['\xa9nam'][0]
        if '\xa9ART' in audio:
            self.artist = audio['\xa9ART'][0]
        if '\xa9alb' in audio:
            self.album = audio['\xa9alb'][0]

        # Vérifier s'il y a une pochette
        if 'covr' in audio:
            self.has_cover = True

    def get_cover_art(self):
        """
        Récupère la pochette d'album si disponible

        Returns:
            str: Données de l'image encodées en base64 ou None si pas de pochette
        """
        try:
            if self.extension == 'mp3':
                return self._get_mp3_cover()
            elif self.extension == 'flac':
                return self._get_flac_cover()
            elif self.extension in ['m4a', 'aac']:
                return self._get_mp4_cover()
        except Exception as e:
            print(f"Erreur lors de la récupération de la pochette pour {self.relative_path}: {e}")

        return None

    def _get_mp3_cover(self):
        """Récupère la pochette d'un fichier MP3"""
        tags = ID3(self.full_path)
        for key in tags.keys():
            if key.startswith('APIC:'):
                art = tags[key].data
                return base64.b64encode(art).decode('utf-8')
        return None

    def _get_flac_cover(self):
        """Récupère la pochette d'un fichier FLAC"""
        audio = FLAC(self.full_path)
        if audio.pictures:
            picture = audio.pictures[0]
            return base64.b64encode(picture.data).decode('utf-8')
        return None

    def _get_mp4_cover(self):
        """Récupère la pochette d'un fichier MP4/M4A"""
        audio = MP4(self.full_path)
        if 'covr' in audio:
            art = audio['covr'][0]
            return base64.b64encode(art).decode('utf-8')
        return None

    def to_dict(self):
        """
        Convertit l'objet en dictionnaire pour l'API

        Returns:
            dict: Représentation du fichier musical
        """
        return {
            'path': self.relative_path,
            'name': self.name,
            'folder': self.folder
        }

    def get_metadata_dict(self):
        """
        Récupère les métadonnées sous forme de dictionnaire

        Returns:
            dict: Métadonnées du fichier musical
        """
        return {
            'title': self.title,
            'artist': self.artist,
            'album': self.album,
            'has_cover': self.has_cover
        }


class MusicLibrary:
    """Classe gérant la bibliothèque musicale"""

    def __init__(self, music_folder):
        """
        Initialise la bibliothèque musicale

        Args:
            music_folder (str): Dossier racine de la musique
        """
        self.music_folder = music_folder
        self.allowed_extensions = {'mp3', 'flac', 'wav', 'ogg', 'm4a', 'aac'}
        self.cover_cache = {}  # Cache pour les pochettes d'album

    def set_music_folder(self, new_folder):
        """
        Change le dossier de musique

        Args:
            new_folder (str): Nouveau dossier de musique

        Returns:
            bool: True si le changement a réussi, False sinon
        """
        if os.path.exists(new_folder) and os.path.isdir(new_folder):
            self.music_folder = new_folder
            self.cover_cache.clear()  # Vider le cache des pochettes
            return True
        return False

    def get_music_files(self):
        """
        Récupère tous les fichiers audio autorisés

        Returns:
            list: Liste des fichiers musicaux (sous forme de dictionnaires)
        """
        music_files = []

        for root, _, files in os.walk(self.music_folder):
            for file in files:
                if file.split('.')[-1].lower() in self.allowed_extensions:
                    file_path = os.path.join(root, file)
                    music_file = MusicFile(file_path, self.music_folder)
                    music_files.append(music_file.to_dict())

        return music_files

    def get_music_file(self, file_path):
        """
        Récupère un fichier musical par son chemin relatif

        Args:
            file_path (str): Chemin relatif du fichier

        Returns:
            MusicFile: Objet représentant le fichier musical ou None si non trouvé
        """
        full_path = os.path.join(self.music_folder, file_path)
        if os.path.exists(full_path) and os.path.isfile(full_path):
            return MusicFile(full_path, self.music_folder)
        return None

    def get_cover_art(self, file_path):
        """
        Récupère la pochette d'album avec mise en cache

        Args:
            file_path (str): Chemin relatif du fichier

        Returns:
            str: Données de l'image encodées en base64 ou None si pas de pochette
        """
        if file_path in self.cover_cache:
            return self.cover_cache[file_path]

        music_file = self.get_music_file(file_path)
        if music_file:
            cover_art = music_file.get_cover_art()
            if cover_art:
                self.cover_cache[file_path] = cover_art
                return cover_art

        return None


# Création de l'application Flask
app = Flask(__name__)

# Initialisation de la bibliothèque musicale
music_library = MusicLibrary(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'musique'))


@app.route('/')
def index():
    """Page d'accueil de l'application."""
    return render_template('index.html')


@app.route('/list')
def list_music():
    """Liste tous les fichiers musicaux disponibles."""
    music_files = music_library.get_music_files()
    return jsonify(music_files)


@app.route('/metadata/<path:file_path>')
def metadata(file_path):
    """Récupère les métadonnées d'un fichier musical."""
    music_file = music_library.get_music_file(file_path)
    if music_file:
        return jsonify(music_file.get_metadata_dict())
    else:
        return jsonify({'error': 'Fichier non trouvé'}), 404


@app.route('/cover/<path:file_path>')
def cover(file_path):
    """Récupère la pochette d'album."""
    image_data = music_library.get_cover_art(file_path)

    if image_data:
        return jsonify({'cover': image_data})
    else:
        return jsonify({'error': 'Pas de pochette disponible'}), 404


@app.route('/play/<path:file_path>')
def play(file_path):
    """Lit un fichier musical."""
    try:
        return send_file(os.path.join(music_library.music_folder, file_path))
    except Exception as e:
        return jsonify({'error': str(e)}), 404


@app.route('/set_music_folder', methods=['POST'])
def set_music_folder():
    """Change le dossier de musique."""
    new_folder = request.form.get('folder')
    if music_library.set_music_folder(new_folder):
        return redirect(url_for('index'))
    else:
        return jsonify({'error': 'Dossier invalide'}), 400


@app.route('/lyrics/<path:file_path>')
def lyrics(file_path):
    """Récupère les paroles d'une chanson en utilisant l'API Lyrics.ovh."""
    music_file = music_library.get_music_file(file_path)
    if not music_file:
        return jsonify({'error': 'Fichier non trouvé'}), 404

    artist = music_file.artist
    title = music_file.title
    # Clean up artist and song title for URL
    artist = artist.lower().strip()
    title = title.lower().strip()

    # Remove special characters and replace spaces with underscores
    artist = "".join(c for c in artist if c.isalnum() or c.isspace()).replace(" ", "_")
    title = "".join(c for c in title if c.isalnum() or c.isspace()).replace(" ", "_")

    # Check if cleaned up name is not empty
    if not artist or not title:
        return jsonify({'error': 'impossible de trouver l artiste ou la musique'}), 404

    url = f'https://api.lyrics.ovh/v1/{artist}/{title}'
    try:
        response = requests.get(url)
        response.raise_for_status()  # Raise an exception for bad status codes

        data = response.json()
        if 'lyrics' in data:
            return jsonify({'lyrics': data['lyrics']})
        else:
            return jsonify({'error': 'Paroles non trouvées', 'details': data}), 404

    except requests.exceptions.HTTPError as http_err:
        if http_err.response.status_code == 404:
             return jsonify({'error': "Paroles non trouvées"}), 404
        else:
             return jsonify({'error': f'Erreur HTTP: {http_err}'}), 500
    except requests.exceptions.RequestException as req_err:
        return jsonify({'error': f'Erreur de connexion: {req_err}'}), 500
    except json.JSONDecodeError as json_err:
        return jsonify({'error': f"Erreur lors de l'analyse de la réponse: {json_err}"}), 500
    except Exception as e:
        return jsonify({'error': f'Erreur inattendue: {e}'}), 500


if __name__ == '__main__':
    # Créer le dossier de musique s'il n'existe pas
    os.makedirs(music_library.music_folder, exist_ok=True)
    app.run(debug=True, host='127.0.0.1', port=5000)
