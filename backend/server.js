// backend/server.js

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors'); 
const Quiz = require('./models/Quiz'); 

// --- 1. CONFIGURATION DE BASE ---

// N'oubliez pas de remplacer <username> et <password> par vos vraies identifiants!
const MONGODB_URI = 'mongodb+srv://alvernhematthias_db_user:ALV-eventTheboss240911@blindtest.0rua28u.mongodb.net/?appName=blindtest'; 
const PORT = process.env.PORT || 3000;

const app = express();
const server = http.createServer(app);

// >>> État global du jeu (simule un stockage en mémoire)
const activeGames = {}; 

// --- 2. MIDDLEWARES ---

// Configuration de CORS pour autoriser le Frontend (http://localhost:5173) pour les requêtes HTTP REST
app.use(cors({
    origin: 'http://localhost:5173', 
    methods: ['GET', 'POST']
}));

// Middleware pour analyser le JSON entrant
app.use(express.json());

// --- 3. CONNEXION MONGODB ---

mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ Connecté à MongoDB'))
  .catch(err => console.error('❌ Erreur de connexion DB:', err));

// --- 4. CONFIGURATION SOCKET.IO ---

const io = new Server(server, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST"]
  }
});

// --- 5. ROUTES API REST (pour la gestion des quiz par l'Admin) ---

app.post('/api/quizzes', async (req, res) => {
    try {
        const newQuiz = new Quiz(req.body);
        await newQuiz.save();
        res.status(201).json(newQuiz);
    } catch (error) {
        console.error("Erreur lors de la création du quiz:", error);
        res.status(400).json({ message: error.message });
    }
});

app.get('/api/quizzes', async (req, res) => {
    try {
        const quizzes = await Quiz.find().select('title questions createdAt');
        res.json(quizzes);
    } catch (error) {
        console.error("Erreur lors de la récupération des quizzes:", error);
        res.status(500).json({ message: "Erreur interne du serveur." });
    }
});


// --- 6. LOGIQUE SOCKET.IO (le cœur du jeu) ---

function generatePin() {
    let pin;
    do {
        pin = Math.floor(1000 + Math.random() * 9000).toString();
    } while (activeGames[pin]);
    return pin;
}

io.on('connection', (socket) => {
    console.log(`Nouvel utilisateur connecté: ${socket.id}`);

    // Événement 1: L'Admin crée une nouvelle partie
    socket.on('create_game', async (quizId) => {
        try {
            const quiz = await Quiz.findById(quizId);
            if (!quiz) {
                return socket.emit('creation_failed', 'Quiz non trouvé');
            }

            const pin = generatePin();
            
            activeGames[pin] = {
                quizId: quizId,
                quizData: quiz,
                currentQuestionIndex: -1, 
                players: {}, 
                playerSockets: new Set(), 
                pin: pin
            };
            
            console.log(`Partie créée. PIN: ${pin} pour quiz: ${quiz.title}`);
            socket.emit('game_created', { pin: pin });
            
        } catch (error) {
            console.error('Erreur lors de la création du jeu:', error);
            socket.emit('creation_failed', 'Erreur serveur.');
        }
    });
    
    // >>> NOUVEL ÉVÉNEMENT : L'Admin rejoint la room Socket.IO
    socket.on('admin_join_room', ({ pin }) => {
        const game = activeGames[pin];
        if (!game) return;

        socket.join(pin); 
        console.log(`Admin (Socket ${socket.id}) a rejoint la room du PIN ${pin}.`);
        
        // Envoyer immédiatement la liste des joueurs déjà présents (si le joueur s'est connecté en premier)
        const playerList = Object.values(game.players).map(p => ({ name: p.name, score: p.score }));
        socket.emit('player_joined', playerList);
    });

    // Événement 2: Un joueur rejoint la partie
    socket.on('join_game', ({ pin, playerName }) => {
        const game = activeGames[pin];
        if (!game) {
            return socket.emit('join_failed', 'PIN de jeu invalide.');
        }
        
        game.players[socket.id] = { 
            name: playerName, 
            score: 0, 
            latestAnswer: null, 
            isAdmin: false 
        };
        game.playerSockets.add(socket.id);
        socket.join(pin); 
        
        socket.emit('join_success');
        
        // Informer la room (Admin et autres joueurs) du nouveau joueur
        const playerList = Object.values(game.players).map(p => ({ name: p.name, score: p.score }));
        io.to(pin).emit('player_joined', playerList);
        console.log(`Joueur ${playerName} a rejoint le PIN ${pin}.`);
    });
    
    // Événement 3: L'Admin lance la prochaine question
    socket.on('start_next_question', ({ pin }) => {
        const game = activeGames[pin];
        if (!game) return;
        
        game.currentQuestionIndex++;
        
        if (game.currentQuestionIndex >= game.quizData.questions.length) {
            const finalPodium = Object.values(game.players).sort((a, b) => b.score - a.score);
            io.to(pin).emit('game_finished', finalPodium);
            delete activeGames[pin]; 
            return;
        }

        const question = game.quizData.questions[game.currentQuestionIndex];
        
        const qData = {
            index: game.currentQuestionIndex,
            text: question.text,
            options: question.options
        };
        
        Object.keys(game.players).forEach(id => {
            game.players[id].latestAnswer = null;
        });

        io.to(pin).emit('new_question', qData);
        console.log(`Question ${game.currentQuestionIndex + 1} lancée dans le PIN ${pin}.`);
    });

    // Événement 4: Un joueur soumet une réponse
    socket.on('submit_answer', ({ pin, answerIndex, timeTaken }) => {
        const game = activeGames[pin];
        const player = game.players[socket.id];
        
        if (!game || !player) return;
        
        if (game.currentQuestionIndex !== -1 && player.latestAnswer === null) {
            
            player.latestAnswer = answerIndex;
            
            const currentQuestion = game.quizData.questions[game.currentQuestionIndex];
            const isCorrect = answerIndex === currentQuestion.correctAnswerIndex;
            
            let pointsGained = 0;
            if (isCorrect) {
                const MAX_TIME = 10000; 
                pointsGained = Math.round(1000 * (1 - Math.min(timeTaken, MAX_TIME) / MAX_TIME)); 
                
                player.score += pointsGained;
            }
            
            const scoresUpdate = [{
                socketId: socket.id,
                isCorrect: isCorrect,
                pointsGained: pointsGained,
                newScore: player.score
            }];
            
            socket.emit('question_results', { 
                correctIndex: currentQuestion.correctAnswerIndex, 
                scoresUpdate 
            });
            
            const totalPlayers = game.playerSockets.size;
            const answeredPlayers = Object.values(game.players).filter(p => p.latestAnswer !== null).length;
            
            if (answeredPlayers === totalPlayers) {
                const podium = Object.values(game.players).sort((a, b) => b.score - a.score);
                io.to(pin).emit('podium_update', podium);
            }
        }
    });

    // Événement 5: Déconnexion
    socket.on('disconnect', () => {
        console.log(`Utilisateur déconnecté: ${socket.id}`);
        for (const pin in activeGames) {
            const game = activeGames[pin];
            if (game.players[socket.id]) {
                delete game.players[socket.id];
                game.playerSockets.delete(socket.id);

                const playerList = Object.values(game.players).map(p => ({ name: p.name, score: p.score }));
                io.to(pin).emit('player_joined', playerList);
                break; 
            }
        }
    });
});

// --- 7. DÉMARRAGE DU SERVEUR ---

server.listen(PORT, () => {
  console.log(`🚀 Serveur en écoute sur http://localhost:${PORT}`);
});