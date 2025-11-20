// frontend/src/AdminDashboard.jsx

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';

const BASE_URL = 'http://localhost:3000'; // Votre serveur Backend
const socket = io(BASE_URL); // Connexion Socket.IO

function AdminDashboard() {
    const [quizzes, setQuizzes] = useState([]);
    const [activePin, setActivePin] = useState(null); // Le PIN de la partie en cours
    const [players, setPlayers] = useState([]); // Liste des joueurs connectés
    const [statusMessage, setStatusMessage] = useState('');
    
    // >>> CORRECTION : Ajout de l'état gameStatus
    const [gameStatus, setGameStatus] = useState('lobby'); // 'lobby', 'active', 'finished'
    
    // --- 1. Gestion des Effets de Bord (Chargement des données & Socket Listeners) ---
    useEffect(() => {
        // Chargement initial des quiz
        fetchQuizzes();

        // 1. Événement: La partie est créée par le serveur
        socket.on('game_created', ({ pin }) => {
            setActivePin(pin);
            setPlayers([]); 
            setStatusMessage(`Partie ${pin} créée. En attente des joueurs.`);
            setGameStatus('lobby'); // Le jeu est en lobby
            
            // >>> ACTION CLÉ : L'Admin rejoint la room pour recevoir les mises à jour des joueurs
            socket.emit('admin_join_room', { pin: pin }); 
        });
        
        // 2. Événement: Un joueur a rejoint le lobby
        socket.on('player_joined', (updatedPlayers) => {
            setPlayers(updatedPlayers);
        });

        // 3. Événement: Le serveur envoie les résultats intermédiaires/podium
        socket.on('podium_update', (podium) => {
            console.log("Podium reçu:", podium);
            setStatusMessage("Classement mis à jour ! Prêt pour la prochaine question.");
        });

        // 4. Événement: Le serveur signale la fin du jeu
        socket.on('game_finished', (finalPodium) => {
             setStatusMessage("La partie est terminée. Podium final affiché !");
             setGameStatus('finished'); // Mise à jour de l'état
        });

        // Nettoyage des listeners
        return () => {
            socket.off('game_created');
            socket.off('player_joined');
            socket.off('podium_update');
            socket.off('game_finished');
        };
    }, []);

    // Fonction pour récupérer la liste des quiz via l'API REST
    const fetchQuizzes = async () => {
        try {
            const response = await axios.get(`${BASE_URL}/api/quizzes`);
            setQuizzes(response.data);
        } catch (error) {
            setStatusMessage("Erreur lors de la récupération des quizzes.");
            console.error("Erreur fetch quizzes:", error);
        }
    };

    // --- 2. Gestion des Actions Admin ---
    
    // Action: Lancer une nouvelle partie
    const handleLaunchGame = (quizId) => {
        if (activePin) {
            alert("Une partie est déjà en cours !");
            return;
        }
        // Envoie l'événement au serveur pour créer une partie
        socket.emit('create_game', quizId);
    };

    // Action: Lancer la prochaine question (ou la première)
    const handleNextQuestion = () => {
        if (activePin) {
            // Envoie la commande au serveur via Socket.IO
            socket.emit('start_next_question', { pin: activePin });
            setStatusMessage("Question lancée... Attente des réponses.");
            setGameStatus('active'); // Le jeu est maintenant actif
        }
    };

    // --- 3. Rendu de l'Interface ---
    
    if (activePin) {
        // A. Rendu de l'Interface d'Animation du Jeu (Après le lancement)
        return (
            <div style={{ padding: '20px', textAlign: 'center', backgroundColor: '#333', color: 'white', minHeight: '100vh' }}>
                <h2>Partie Lancée : Affichage Projecteur 📺</h2>
                <h1>PIN DE JEU : **{activePin}**</h1>
                <p>{statusMessage}</p>
                
                <hr style={{ margin: '20px auto' }}/>

                <h3>Joueurs Connectés ({players.length})</h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '10px' }}>
                    {players.map((p, index) => (
                        <span key={index} style={{ background: '#555', padding: '5px 10px', borderRadius: '5px' }}>
                            {p.name}
                        </span>
                    ))}
                </div>
                
                {/* Bouton pour lancer la question suivante */}
                <button 
                    onClick={handleNextQuestion} 
                    // Désactiver le bouton si aucun joueur n'est là, sauf si le jeu est terminé et que l'on veut juste afficher la fin.
                    disabled={players.length === 0 && gameStatus !== 'finished'} 
                    style={{ 
                        padding: '15px 30px', 
                        fontSize: '1.2em', 
                        background: gameStatus === 'finished' ? '#F44336' : (players.length > 0 ? '#4CAF50' : '#888'), 
                        color: 'white', 
                        border: 'none', 
                        cursor: 'pointer', 
                        marginTop: '30px' 
                    }}
                >
                    {gameStatus === 'finished' ? 'TERMINER LA PARTIE' : 'LANÇER LA PROCHAINE QUESTION'}
                </button>
            </div>
        );
    }

    // B. Rendu de l'Interface de Sélection de Quiz (Avant le lancement)
    return (
        <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
            <h2>📋 Dashboard Admin</h2>
            <p style={{ color: 'blue', fontWeight: 'bold' }}>{statusMessage}</p>

            <h3>Quiz Disponibles :</h3>
            {quizzes.length === 0 ? (
                <p>Aucun quiz trouvé. Veuillez en créer un ci-dessus.</p>
            ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '15px' }}>
                    <thead>
                        <tr>
                            <th style={{ borderBottom: '2px solid #333', padding: '10px', textAlign: 'left' }}>Titre</th>
                            <th style={{ borderBottom: '2px solid #333', padding: '10px' }}>Questions</th>
                            <th style={{ borderBottom: '2px solid #333', padding: '10px' }}>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {quizzes.map((quiz) => (
                            <tr key={quiz._id}>
                                <td style={{ borderBottom: '1px solid #eee', padding: '10px', textAlign: 'left' }}>**{quiz.title}**</td>
                                <td style={{ borderBottom: '1px solid #eee', padding: '10px', textAlign: 'center' }}>{quiz.questions ? quiz.questions.length : 'N/A'}</td>
                                <td style={{ borderBottom: '1px solid #eee', padding: '10px', textAlign: 'center' }}>
                                    <button onClick={() => handleLaunchGame(quiz._id)} style={{ padding: '8px 15px', background: 'orange', color: 'white', border: 'none', cursor: 'pointer' }}>
                                        Lancer le Jeu
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
}

export default AdminDashboard;