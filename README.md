# SpotifyLocal

SpotifyLocal est une application web locale qui vous permet de créer votre propre bibliothèque musicale à partir des fichiers présents sur votre ordinateur. Elle offre des fonctionnalités de lecture, de gestion de playlists, de recherche, d'affichage des métadonnées et des pochettes d'albums, ainsi que la possibilité d'afficher les paroles des chansons. Contrairement à Spotify, SpotifyLocal fonctionne directement sur votre machine, sans dépendance à un service de streaming externe.

## Fonctionnalités

*   **Lecture locale :** Lisez les fichiers musicaux stockés sur votre ordinateur.
*   **Gestion de playlists :** Créez, modifiez et supprimez des playlists personnalisées.
*   **Métadonnées :** Affiche les informations (titre, artiste, album) de vos fichiers musicaux.
*   **Pochettes d'album :** Affiche les pochettes d'album intégrées aux fichiers musicaux.
*   **Paroles de chansons :** Recherche et affiche les paroles des chansons en temps réel grâce à l'API Lyrics.ovh.
*   **Recherche :** Recherchez des titres, des artistes ou des albums dans votre bibliothèque.
*   **Contrôle de volume**: régler le volume a votre convenance.
* **Gestionnaire de musique**: selectionner un dossier dans son ordinateur qui contient les musiques.
* **localStorage**: grace au localstorage, les playlists sont sauvegardées.

## Technologies utilisées

*   **Flask :** Micro-framework web en Python pour l'API backend.
*   **HTML/CSS/JavaScript :** Pour l'interface utilisateur web.
*   **Mutagen :** Bibliothèque Python pour la lecture et la manipulation des métadonnées audio.
*   **API Lyrics.ovh :** API pour récupérer les paroles des chansons.
*   **Base64 :** Pour l'encodage des pochettes d'album.
* **Os**: pour parcourir les dossier et fichier dans l'ordinateur.
* **Requests**: pour faire la requete vers l'api lyrics.ovh
* **ID3, MP3, FLAC, M4A**: Formats de métadonnées et de fichier supporté.
* **localStorage**: pour sauvegarder les playlists de l'utilisateur.

## Installation et exécution

Voici les étapes pour lancer SpotifyLocal sur votre machine :

1.  **Cloner le dépôt :**
    ```bash
    git clone [URL_DU_REPOSITORY]
    cd [NOM_DU_DOSSIER_DU_PROJET]
    ```
    (Remplacez `[URL_DU_REPOSITORY]` par l'URL de ton dépôt GitHub et `[NOM_DU_DOSSIER_DU_PROJET]` par le nom du dossier créé lors du clonage).

2.  **Installer Python 3 :**
    Si vous n'avez pas Python 3 installé, téléchargez-le et installez-le depuis [https://www.python.org/downloads/](https://www.python.org/downloads/).

3.  **Installer les dépendances Python :**
    ```bash
    pip install -r requirements.txt
    ```
    (Vous devrez créer un fichier `requirements.txt` qui liste les dépendances de votre projet. Voir la section *Création du fichier `requirements.txt`* ci-dessous).

4. **Ajouter des fichiers audio**
avant de lancer l'application, vous devez mettre des fichiers audio dans le dossier "musique" qui se trouve dans le projet.

5.  **Lancer l'application :**
    ```bash
    python app.py
    ```
    Cela lancera le serveur Flask.

6.  **Ouvrir dans le navigateur :**
    Ouvrez votre navigateur web et allez à l'adresse `http://127.0.0.1:5000/`.

## Configuration du dossier de musique

Par défaut, l'application recherche les fichiers musicaux dans le dossier `musique` à la racine du projet. Vous pouvez changer ce dossier en utilisant le formulaire présent dans l'en-tête de l'application.

## Création du fichier `requirements.txt`

Le fichier `requirements.txt` est essentiel pour que les utilisateurs puissent installer facilement les dépendances de ton projet. Pour le créer :

1.  **Activer l'environnement virtuel (recommandé) :**
    ```bash
    # Linux/macOS
    python3 -m venv venv
    source venv/bin/activate

    # Windows
    python -m venv venv
    venv\Scripts\activate
    ```

2.  **Installer les dépendances :**
    ```bash
    pip install flask mutagen requests
    ```
    
3. **Générer le fichier requirements.txt :**
    ```bash
    pip freeze > requirements.txt
    ```
    Ce fichier sera dans le dossier de votre projet.

## Utilisation

* Une fois l'application lancé, aller dans le dossier musique, il est à la racine du projet. vous pouvez y mettre vos fichier de musique (mp3, flac...)
* L'interface vous permettra de naviguer dans votre bibliotheque de musique.
* Vous pouvez aussi modifier le dossier de musique dans l'application.
* Les différents boutons vous permettront de :
    * Mettre en pause la musique
    * Relancer la musique
    * Mettre la musique précédente.
    * Mettre la musique suivante.
    * Gérer le volume.
    * Créer, ajouter des musiques dans les playlists.
* Vous pouvez également rechercher des musiques dans la bibliotheque.

## Problèmes connus

*   La recherche de paroles peut parfois échouer si l'API Lyrics.ovh ne trouve pas de correspondance exacte.
* Le premier lancement peut être plus long car l'application doit scanner tout les fichier de musique.

## Contribution

Si vous souhaitez contribuer au projet, n'hésitez pas à fork le dépôt et à proposer des pull requests !

## Licence

[MIT ou autre licence de votre choix]
