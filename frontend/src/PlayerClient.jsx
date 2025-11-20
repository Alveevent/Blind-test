import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';

// >>> URL DU BACKEND DÉPLOYÉ SUR RENDER
const BASE_URL = 'https://blind-test-xttc.onrender.com';

// Initialisation de Socket.IO
const socket = io(BASE_URL);

const PlayerClient = () => {
    const [pin, setPin] = useState('');
    const [name, setName] = useState('');
    const [isConnected, setIsConnected] = useState(false);
    const [gameStatus, setGameStatus] = useState(null); // Contient l'état du jeu (question, score)
    const [message, setMessage] = useState('');
    const [hasAnswered, setHasAnswered] = useState(false);

    // 1. Gestion des connexions Socket.IO
    useEffect(() => {
        socket.on('connect', () => {
            console.log('Connecté au serveur Socket.IO');
        });

        socket.on('disconnect', () => {
            console.log('Déconnecté du serveur.');
            setIsConnected(false);
            setGameStatus(null);
        });

        // 2. Mises à Jour du Jeu
        socket.on('gameUpdate', (data) => {
            if (data.pin === parseInt(pin)) {
                setGameStatus(data);
                
                // Si la question change ou est le lobby
                if (data.currentQuestionIndex !== gameStatus?.currentQuestionIndex) {
                    setHasAnswered(false); // Réinitialiser le statut de réponse à chaque nouvelle question
                    setMessage(data.currentQuestionIndex === -1 ? 'En attente du lancement de la partie...' : 'Nouvelle question !');
                }
            }
        });

        // 3. Confirmation de Réponse
        socket.on('answerResult', (data) => {
            if (data.isCorrect) {
                setMessage(`Réponse correcte ! +${data.points} points !`);
            } else {
                setMessage('Réponse incorrecte ou trop lente.');
            }
            // Mettre à jour le score local si besoin, ou attendre gameUpdate
        });

        return () => {
            socket.off('connect');
            socket.off('disconnect');
            socket.off('gameUpdate');
            socket.off('answerResult');
        };
    }, [pin, gameStatus?.currentQuestionIndex]);


    // 4. Fonction de Connexion
    const handleJoinGame = (e) => {
        e.preventDefault();
        if (!pin || !name) {
            setMessage('Veuillez entrer un PIN et un nom.');
            return;
        }

        setMessage(`Tentative de connexion au PIN ${pin} avec le nom ${name}...`);
        
        // Envoie les infos de connexion au serveur
        socket.emit('joinGame', { pin: parseInt(pin), name });
        
        // Le serveur répondra avec 'gameUpdate' si la connexion est réussie.
        setIsConnected(true);
    };

    // 5. Fonction pour Envoyer la Réponse
    const handleAnswer = (answerIndex) => {
        if (hasAnswered) return;

        setMessage('Réponse envoyée, attente des résultats...');
        setHasAnswered(true);

        socket.emit('submitAnswer', {
            pin: parseInt(pin),
            playerId: socket.id,
            answerIndex: answerIndex,
        });
    };

    // Affichage du composant
    const currentQuestion = gameStatus?.questions?.[gameStatus.currentQuestionIndex];
    const player = gameStatus?.players?.find(p => p.id === socket.id);

    return (
        <div style={styles.container}>
            <h1 style={styles.header}>🎮 Client Joueur</h1>
            
            {message && <p style={styles.message}>{message}</p>}

            {!isConnected ? (
                // FORMULAIRE DE CONNEXION
                <form onSubmit={handleJoinGame} style={styles.form}>
                    <input
                        type="number"
                        placeholder="PIN de Jeu"
                        value={pin}
                        onChange={(e) => setPin(e.target.value)}
                        required
                        style={styles.input}
                    />
                    <input
                        type="text"
                        placeholder="Votre Nom"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        style={styles.input}
                    />
                    <button type="submit" style={styles.joinButton}>
                        Rejoindre la Partie
                    </button>
                </form>
            ) : (
                // INTERFACE DU JEU
                <div style={styles.gameInterface}>
                    <p style={styles.status}>Connecté au Lobby : {gameStatus?.quizTitle || '...'}</p>
                    <p style={styles.pinText}>PIN: <span style={styles.pinNumber}>{pin}</span></p>
                    <p style={styles.scoreText}>Score actuel: <span style={styles.scoreValue}>{player?.score || 0}</span> points</p>
                    
                    {currentQuestion && gameStatus.currentQuestionIndex !== -1 ? (
                        // AFFICHAGE DE LA QUESTION
                        <div style={styles.questionSection}>
                            <h2 style={styles.questionText}>Question {gameStatus.currentQuestionIndex + 1} :</h2>
                            <p style={styles.questionTextDetail}>{currentQuestion.text}</p>
                            
                            <div style={styles.answerGrid}>
                                {currentQuestion.answers.map((answer, index) => (
                                    <button
                                        key={index}
                                        onClick={() => handleAnswer(index)}
                                        disabled={hasAnswered}
                                        style={{...styles.answerButton, backgroundColor: styles.colors[index]}}
                                    >
                                        {answer}
                                    </button>
                                ))}
                            </div>
                            {hasAnswered && <p style={styles.answered}>Réponse Soumise !</p>}
                        </div>
                    ) : (
                        // LOBBY / FIN DE PARTIE
                        <div style={styles.waitingScreen}>
                            {gameStatus && gameStatus.currentQuestionIndex === -1 ? (
                                <p>En attente du lancement de la partie par l'Admin...</p>
                            ) : (
                                <p>Fin de partie ou affichage du classement. Attente de l'Admin.</p>
                            )}
                            
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// Styles simples pour l'esthétique
const styles = {
    colors: ['#007bff', '#dc3545', '#ffc107', '#28a745'], // Bleu, Rouge, Jaune, Vert
    container: {
        padding: '30px',
        backgroundColor: '#fff',
        borderRadius: '12px',
        maxWidth: '500px',
        margin: '40px auto',
        boxShadow: '0 8px 16px rgba(0,0,0,0.15)',
        border: '3px solid #4E0187'
    },
    header: {
        color: '#4E0187',
        textAlign: 'center',
        marginBottom: '25px',
        fontSize: '1.8rem'
    },
    message: {
        padding: '12px',
        backgroundColor: '#fff0f0',
        border: '1px solid #dc3545',
        color: '#dc3545',
        borderRadius: '6px',
        textAlign: 'center',
        marginBottom: '20px',
        fontWeight: 'bold'
    },
    form: {
        display: 'flex',
        flexDirection: 'column',
        gap: '15px'
    },
    input: {
        padding: '12px',
        borderRadius: '6px',
        border: '1px solid #ccc',
        fontSize: '1rem',
        textAlign: 'center'
    },
    joinButton: {
        backgroundColor: '#8A2BE2',
        color: 'white',
        padding: '15px',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer',
        fontWeight: 'bold',
        fontSize: '1.1rem',
        transition: 'background-color 0.2s'
    },
    gameInterface: {
        textAlign: 'center'
    },
    status: {
        color: '#28a745',
        fontWeight: 'bold',
        marginBottom: '10px'
    },
    pinText: {
        fontSize: '1.1rem',
        color: '#555'
    },
    pinNumber: {
        color: '#FF0055',
        fontWeight: 'bold'
    },
    scoreText: {
        fontSize: '1.1rem',
        marginTop: '10px',
        borderTop: '1px solid #eee',
        paddingTop: '10px'
    },
    scoreValue: {
        color: '#007bff',
        fontWeight: 'bold',
        marginLeft: '5px'
    },
    questionSection: {
        marginTop: '30px',
        padding: '20px',
        border: '1px solid #8A2BE2',
        borderRadius: '8px',
        backgroundColor: '#f9f9ff'
    },
    questionText: {
        color: '#4E0187',
        fontSize: '1.4rem'
    },
    questionTextDetail: {
        fontWeight: 'bold',
        fontSize: '1.2rem',
        marginBottom: '20px'
    },
    answerGrid: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '15px'
    },
    answerButton: {
        color: 'white',
        padding: '20px 10px',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        fontWeight: 'bold',
        fontSize: '1rem',
        transition: 'opacity 0.2s',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
    },
    answered: {
        marginTop: '15px',
        color: '#8A2BE2',
        fontWeight: 'bold'
    },
    waitingScreen: {
        marginTop: '30px',
        padding: '20px',
        backgroundColor: '#f0f0f0',
        borderRadius: '8px'
    }
};

export default PlayerClient;