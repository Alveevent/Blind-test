import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';

// >>> URL DU BACKEND DÉPLOYÉ SUR RENDER
const BASE_URL = 'https://blind-test-xttc.onrender.com';
const API_URL = `${BASE_URL}/api/quizzes`;

// Initialisation de Socket.IO
const socket = io(BASE_URL);

const AdminDashboard = () => {
    const [quizzes, setQuizzes] = useState([]);
    const [selectedQuizId, setSelectedQuizId] = useState('');
    const [gameStatus, setGameStatus] = useState({
        pin: null,
        players: [],
        currentQuestionIndex: -1,
        quizTitle: ''
    });
    const [message, setMessage] = useState('');

    // 1. Récupération des Quizzes
    useEffect(() => {
        const fetchQuizzes = async () => {
            try {
                const response = await axios.get(API_URL);
                setQuizzes(response.data);
            } catch (error) {
                console.error('Erreur lors de la récupération des quizzes:', error);
                setMessage('Erreur de connexion au serveur pour récupérer les quizzes.');
            }
        };
        fetchQuizzes();
    }, []);

    // 2. Gestion des Mises à Jour du Jeu (Socket.IO)
    useEffect(() => {
        socket.on('gameUpdate', (data) => {
            setGameStatus(data);
            setMessage(`Partie PIN ${data.pin} mise à jour.`);
        });

        socket.on('playerJoined', (player) => {
            setMessage(`${player.name} a rejoint la partie.`);
        });

        return () => {
            socket.off('gameUpdate');
            socket.off('playerJoined');
        };
    }, []);

    // 3. Lancement du Jeu
    const handleLaunchGame = () => {
        if (!selectedQuizId) {
            setMessage('Veuillez sélectionner un quiz à lancer.');
            return;
        }
        setMessage('Lancement de la partie...');
        // Envoie l'événement au serveur pour démarrer
        socket.emit('launchGame', { quizId: selectedQuizId });
    };

    // 4. Lancement de la Prochaine Question
    const handleNextQuestion = () => {
        if (!gameStatus.pin) return;
        setMessage('Affichage de la prochaine question...');
        // Envoie l'événement au serveur pour passer à la suite
        socket.emit('nextQuestion', { pin: gameStatus.pin });
    };
    
    // 5. Affichage du Tableau de Bord
    const isGameActive = gameStatus.pin !== null;
    const currentQuestion = gameStatus.quizTitle ? 
        (gameStatus.currentQuestionIndex >= 0 ? 
            gameStatus.currentQuestionIndex + 1 : 
            'Lobby') 
        : null;

    return (
        <div style={styles.container}>
            <h2 style={styles.header}>Tableau de Bord Admin</h2>
            
            {message && <p style={styles.message}>{message}</p>}

            {/* SECTION SÉLECTION ET LANCEMENT */}
            {!isGameActive && (
                <div style={styles.launchSection}>
                    <h3>1. Sélectionner un Quiz</h3>
                    <select
                        value={selectedQuizId}
                        onChange={(e) => setSelectedQuizId(e.target.value)}
                        style={styles.select}
                    >
                        <option value="">-- Choisir un Quiz --</option>
                        {quizzes.map(quiz => (
                            <option key={quiz._id} value={quiz._id}>
                                {quiz.title} ({quiz.questions.length} Q)
                            </option>
                        ))}
                    </select>

                    <button 
                        onClick={handleLaunchGame} 
                        disabled={!selectedQuizId}
                        style={selectedQuizId ? styles.launchButton : styles.disabledButton}
                    >
                        Lancer le Jeu
                    </button>
                </div>
            )}

            {/* SECTION JEU ACTIF */}
            {isGameActive && (
                <div style={styles.activeGameSection}>
                    <h3 style={styles.gameTitle}>Partie Active : {gameStatus.quizTitle}</h3>
                    <div style={styles.pinDisplay}>
                        PIN DE JEU : <span style={styles.pinNumber}>{gameStatus.pin}</span>
                    </div>

                    <p style={styles.statusText}>
                        Statut : Question {currentQuestion} / {gameStatus.questions?.length || '...'}
                    </p>

                    <button 
                        onClick={handleNextQuestion}
                        style={styles.nextButton}
                    >
                        {gameStatus.currentQuestionIndex === -1 ? 'Démarrer la Première Question' : 'Question Suivante / Afficher le Score'}
                    </button>

                    <h4 style={styles.playerHeader}>Joueurs Connectés ({gameStatus.players.length})</h4>
                    <ul style={styles.playerList}>
                        {gameStatus.players.length > 0 ? (
                            gameStatus.players.map(player => (
                                <li key={player.id} style={styles.playerItem}>
                                    {player.name} (Score: {player.score})
                                </li>
                            ))
                        ) : (
                            <li style={{textAlign: 'center', color: '#888'}}>En attente de joueurs...</li>
                        )}
                    </ul>
                </div>
            )}
        </div>
    );
};

// Styles simples pour l'esthétique
const styles = {
    container: {
        padding: '20px',
        backgroundColor: '#fff',
        borderRadius: '8px',
        maxWidth: '800px',
        margin: '20px auto',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        border: '1px solid #ddd'
    },
    header: {
        color: '#4E0187',
        textAlign: 'center',
        marginBottom: '20px'
    },
    message: {
        padding: '10px',
        backgroundColor: '#e6ffe6',
        border: '1px solid #387c38',
        color: '#387c38',
        borderRadius: '4px',
        textAlign: 'center',
        marginBottom: '20px'
    },
    launchSection: {
        textAlign: 'center',
        padding: '20px',
        border: '1px solid #ccc',
        borderRadius: '8px'
    },
    select: {
        padding: '10px',
        marginRight: '10px',
        borderRadius: '4px',
        border: '1px solid #ccc',
        minWidth: '250px'
    },
    launchButton: {
        backgroundColor: '#8A2BE2',
        color: 'white',
        padding: '12px 25px',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer',
        fontWeight: 'bold',
        transition: 'background-color 0.2s',
        marginTop: '15px'
    },
    disabledButton: {
        backgroundColor: '#ccc',
        color: '#666',
        padding: '12px 25px',
        border: 'none',
        borderRadius: '6px',
        cursor: 'not-allowed',
        marginTop: '15px'
    },
    activeGameSection: {
        textAlign: 'center',
        padding: '20px',
        border: '2px solid #4E0187',
        borderRadius: '8px',
        backgroundColor: '#f5f0ff'
    },
    gameTitle: {
        color: '#4E0187'
    },
    pinDisplay: {
        fontSize: '1.2rem',
        fontWeight: 'bold',
        marginBottom: '20px'
    },
    pinNumber: {
        fontSize: '2rem',
        color: '#FF0055',
        marginLeft: '10px'
    },
    statusText: {
        color: '#555',
        marginBottom: '20px'
    },
    nextButton: {
        backgroundColor: '#FF0055',
        color: 'white',
        padding: '15px 30px',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer',
        fontWeight: 'bolder',
        fontSize: '1.1rem',
        transition: 'background-color 0.2s',
        marginBottom: '20px'
    },
    playerHeader: {
        color: '#333',
        borderTop: '1px solid #ccc',
        paddingTop: '15px',
        marginTop: '15px'
    },
    playerList: {
        listStyleType: 'none',
        padding: 0
    },
    playerItem: {
        backgroundColor: '#fff',
        margin: '5px 0',
        padding: '10px',
        borderRadius: '4px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
    }
};

export default AdminDashboard;