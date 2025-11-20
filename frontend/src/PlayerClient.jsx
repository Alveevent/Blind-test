// frontend/src/PlayerClient.jsx

import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';

const BASE_URL = 'http://localhost:3000';
const socket = io(BASE_URL);

// États possibles du joueur
const GAME_STATES = {
    DISCONNECTED: 'DISCONNECTED',
    LOBBY: 'LOBBY',
    WAITING_QUESTION: 'WAITING_QUESTION',
    QUESTION_ACTIVE: 'QUESTION_ACTIVE',
    QUESTION_RESULT: 'QUESTION_RESULT',
    GAME_FINISHED: 'GAME_FINISHED'
};

function PlayerClient() {
    const [gameState, setGameState] = useState(GAME_STATES.DISCONNECTED);
    const [pin, setPin] = useState('');
    const [playerName, setPlayerName] = useState('');
    const [currentQuestion, setCurrentQuestion] = useState(null);
    const [selectedAnswerIndex, setSelectedAnswerIndex] = useState(null);
    const [result, setResult] = useState(null); // Pour afficher si la réponse était bonne/mauvaise
    const [playerScore, setPlayerScore] = useState(0);

    // --- 1. Gestion des Listeners Socket.IO ---

    useEffect(() => {
        // 1. Succès de la connexion au lobby
        socket.on('join_success', () => {
            setGameState(GAME_STATES.LOBBY);
            setResult(null);
        });

        // 2. Échec de la connexion
        socket.on('join_failed', (message) => {
            alert(`Échec de la connexion : ${message}`);
            setGameState(GAME_STATES.DISCONNECTED);
        });

        // 3. Réception d'une nouvelle question
        socket.on('new_question', (qData) => {
            setCurrentQuestion(qData);
            setSelectedAnswerIndex(null); // Réinitialiser le choix
            setGameState(GAME_STATES.QUESTION_ACTIVE);
        });

        // 4. Réception des résultats de la question
        socket.on('question_results', ({ correctIndex, scoresUpdate }) => {
            const playerUpdate = scoresUpdate.find(s => s.socketId === socket.id);
            if (playerUpdate) {
                setPlayerScore(playerUpdate.newScore);
                setResult({
                    isCorrect: playerUpdate.isCorrect,
                    pointsGained: playerUpdate.pointsGained,
                    correctIndex: correctIndex,
                });
            }
            setGameState(GAME_STATES.QUESTION_RESULT);
        });
        
        // 5. Fin du jeu
        socket.on('game_finished', (finalPodium) => {
             setCurrentQuestion({text: "La partie est terminée ! Voir l'écran de l'Admin pour le classement final."});
             setResult(finalPodium);
             setGameState(GAME_STATES.GAME_FINISHED);
        });


        return () => {
            socket.off('join_success');
            socket.off('join_failed');
            socket.off('new_question');
            socket.off('question_results');
            socket.off('game_finished');
        };
    }, []);

    // --- 2. Fonctions d'Action ---

    const handleJoin = (e) => {
        e.preventDefault();
        if (pin && playerName) {
            // Envoi de la requête de connexion au serveur
            socket.emit('join_game', { pin: pin.trim(), playerName: playerName.trim() });
        }
    };

    const handleAnswerSubmit = (index) => {
        if (selectedAnswerIndex === null) {
            setSelectedAnswerIndex(index);
            const timeTaken = 500; // Simuler le temps de réponse (doit être calculé en réalité)
            
            // Envoyer la réponse au serveur
            socket.emit('submit_answer', { 
                pin: pin, 
                answerIndex: index, 
                timeTaken: timeTaken 
            });
            // Le joueur attend maintenant les résultats
            setGameState(GAME_STATES.WAITING_QUESTION);
        }
    };

    // --- 3. Rendu par État de Jeu ---
    
    // Rendu 1: Connexion (État initial)
    if (gameState === GAME_STATES.DISCONNECTED) {
        return (
            <div style={{ padding: '20px', maxWidth: '400px', margin: '50px auto', textAlign: 'center' }}>
                <h2>🔑 Rejoindre une Partie</h2>
                <form onSubmit={handleJoin}>
                    <input 
                        type="text" 
                        placeholder="PIN de Jeu (4 chiffres)" 
                        value={pin} 
                        onChange={(e) => setPin(e.target.value)} 
                        required 
                        style={{ padding: '10px', margin: '10px 0', width: '100%', fontSize: '1.2em' }}
                    />
                    <input 
                        type="text" 
                        placeholder="Votre Pseudo" 
                        value={playerName} 
                        onChange={(e) => setPlayerName(e.target.value)} 
                        required 
                        style={{ padding: '10px', margin: '10px 0', width: '100%', fontSize: '1.2em' }}
                    />
                    <button type="submit" style={{ padding: '15px', background: 'purple', color: 'white', border: 'none', width: '100%', fontSize: '1.2em', cursor: 'pointer' }}>
                        Connecter
                    </button>
                </form>
            </div>
        );
    }
    
    // Rendu 2: Lobby (En attente du début)
    if (gameState === GAME_STATES.LOBBY || gameState === GAME_STATES.WAITING_QUESTION) {
        return (
            <div style={{ padding: '20px', maxWidth: '600px', margin: '50px auto', textAlign: 'center' }}>
                <h2 style={{ color: '#4CAF50' }}>✅ Connecté au Lobby</h2>
                <p>PIN : **{pin}**</p>
                <h3>Bienvenue, **{playerName}** !</h3>
                <p>Score actuel : {playerScore} points</p>
                <div style={{ padding: '20px', border: '1px solid #ccc', marginTop: '20px' }}>
                    {gameState === GAME_STATES.LOBBY 
                        ? "En attente du lancement de la partie par l'Admin..."
                        : "Réponse envoyée. Attente des résultats..."}
                </div>
            </div>
        );
    }

    // Rendu 3: Question Active
    if (gameState === GAME_STATES.QUESTION_ACTIVE) {
        return (
            <div style={{ padding: '20px', maxWidth: '600px', margin: '20px auto', textAlign: 'center' }}>
                <h2>Question {currentQuestion.index + 1}</h2>
                <h3 style={{ padding: '20px', background: '#f0f0f0', borderRadius: '10px' }}>
                    {currentQuestion.text}
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '20px' }}>
                    {currentQuestion.options.map((option, index) => (
                        <button 
                            key={index}
                            onClick={() => handleAnswerSubmit(index)}
                            disabled={selectedAnswerIndex !== null}
                            style={{ 
                                padding: '30px 10px', 
                                fontSize: '1.1em', 
                                border: 'none', 
                                cursor: 'pointer',
                                background: selectedAnswerIndex === index ? 'orange' : ['red', 'blue', 'orange', 'green'][index],
                                color: 'white',
                                opacity: selectedAnswerIndex !== null && selectedAnswerIndex !== index ? 0.5 : 1
                            }}
                        >
                            {/* NOTE: Le joueur de Kahoot ne voit normalement pas le texte de la réponse, juste le symbole/couleur. 
                                 Nous laissons le texte pour le moment pour faciliter le test. */}
                            {option}
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    // Rendu 4: Résultat de la Question
    if (gameState === GAME_STATES.QUESTION_RESULT) {
        const isCorrect = result.isCorrect;
        const correctOption = currentQuestion.options[result.correctIndex];
        const statusStyle = { padding: '20px', borderRadius: '10px', margin: '20px 0' };

        return (
            <div style={{ padding: '20px', maxWidth: '600px', margin: '20px auto', textAlign: 'center' }}>
                <h2 style={{ ...statusStyle, background: isCorrect ? '#4CAF50' : '#F44336', color: 'white' }}>
                    {isCorrect ? '🥳 CORRECT !' : '❌ FAUX !'}
                </h2>
                <p>La bonne réponse était : **{correctOption}**</p>
                {isCorrect && <p>Vous gagnez **{result.pointsGained}** points !</p>}
                
                <h3 style={{ marginTop: '30px' }}>Votre Score Total : **{playerScore}**</h3>
                <p>En attente de la prochaine question par l'Admin...</p>
            </div>
        );
    }
    
    // Rendu 5: Fin du Jeu
    if (gameState === GAME_STATES.GAME_FINISHED) {
        return (
            <div style={{ padding: '20px', maxWidth: '600px', margin: '50px auto', textAlign: 'center' }}>
                 <h2>🎉 FIN DE LA PARTIE !</h2>
                 <p>{currentQuestion.text}</p>
                 <h3>Votre Score Final : **{playerScore}**</h3>
                 <p>Merci d'avoir joué !</p>
            </div>
        );
    }
    
    // Rendu par défaut
    return null;
}

export default PlayerClient;