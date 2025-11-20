const express = require('express');
const mongoose = require('mongoose');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

// Importer le modèle de Quiz
const Quiz = require('./models/Quiz');

// --- Configuration ---
const app = express();
const server = http.createServer(app);

// >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
// AJOUT DE LA ROUTE DE BASE POUR LE HEALTH CHECK DE RENDER
// Ceci est CRUCIAL pour les plans gratuits !
app.get('/', (req, res) => {
    res.status(200).send('Serveur Quizz ALV-EVENT en ligne.');
});
// >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

// CORRECTION CORS : Autoriser votre Frontend Netlify
const FRONTEND_URL = 'https://blind-test-by-alv-event.netlify.app'; 

// Configuration CORS pour Express (API REST)
app.use(cors({
    origin: FRONTEND_URL, 
    methods: ['GET', 'POST'],
    credentials: true 
}));
app.use(express.json()); // Middleware pour parser le JSON

// Port du serveur
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/kahootclone';


// Configuration Socket.IO (WebSockets)
const io = new Server(server, {
    cors: {
        origin: FRONTEND_URL, // Doit correspondre à l'origine du frontend Netlify
        methods: ['GET', 'POST'],
        credentials: true
    }
});


// --- Base de Données MongoDB ---
// Note : Le serveur doit être capable de se connecter, même s'il met 10 secondes.
// Le message 'déconnecté' est étrange si la connexion a réussi. 
// Assurez-vous que l'URL MONGODB_URI sur Render est bien correcte !
mongoose.connect(MONGODB_URI)
    .then(() => console.log('Connecté à MongoDB'))
    .catch(err => console.error('Erreur de connexion DB:', err.message));


// --- État du Jeu Global ---
// { pin: { quizId, questions, players: [{id, name, score}], currentQuestionIndex, quizTitle } }
const activeGames = {};


// --- Routes API REST (pour la gestion des Quizzes) ---

// 1. POST /api/quizzes : Créer un nouveau quiz
app.post('/api/quizzes', async (req, res) => {
    try {
        const newQuiz = new Quiz(req.body);
        await newQuiz.save();
        res.status(201).send(newQuiz);
    } catch (error) {
        // En cas d'erreur ici, le problème est soit DB (MongoDB) soit le schéma de données
        res.status(500).send({ message: 'Erreur lors de la création du quiz', error: error.message });
    }
});

// 2. GET /api/quizzes : Récupérer tous les titres de quiz
app.get('/api/quizzes', async (req, res) => {
    try {
        // Cette ligne peut planter si la connexion DB est coupée.
        const quizzes = await Quiz.find({}, 'title questions'); 
        res.status(200).send(quizzes);
    } catch (error) {
        // L'erreur 500 que vous avez vue venait probablement d'ici si la DB est perdue.
        res.status(500).send({ message: 'Erreur lors de la récupération des quizzes', error: error.message });
    }
});


// --- Logique Socket.IO (WebSockets pour le jeu en temps réel) ---

io.on('connection', (socket) => {
    console.log(`Nouvel utilisateur connecté: ${socket.id}`);

    // [ADMIN] Lancer une nouvelle partie
    socket.on('launchGame', async ({ quizId }) => {
        try {
            const quiz = await Quiz.findById(quizId);
            if (!quiz) return;

            // ... (reste du code Socket.IO inchangé) ...
            let pin;
            do {
                pin = Math.floor(1000 + Math.random() * 9000); 
            } while (activeGames[pin]);

            activeGames[pin] = {
                quizId: quizId,
                questions: quiz.questions,
                players: [],
                currentQuestionIndex: -1, // -1 indique le lobby
                quizTitle: quiz.title,
                pin: pin
            };

            socket.join(pin); 
            
            socket.emit('gameUpdate', activeGames[pin]);
            console.log(`Partie lancée. PIN: ${pin}, Titre: ${quiz.title}`);

        } catch (error) {
            console.error('Erreur lors du lancement du jeu:', error);
        }
    });

    // [JOUEUR] Rejoindre une partie
    socket.on('joinGame', ({ pin, name }) => {
        const game = activeGames[pin];

        if (!game || game.players.some(p => p.name === name)) {
            socket.emit('joinFailed', { message: 'PIN invalide ou nom déjà pris.' });
            return;
        }

        const newPlayer = {
            id: socket.id,
            name: name,
            score: 0
        };

        game.players.push(newPlayer);
        socket.join(pin);

        io.to(pin).emit('gameUpdate', game); 
        io.to(pin).emit('playerJoined', newPlayer); 

        console.log(`Joueur ${name} a rejoint le PIN ${pin}`);
    });

    // [ADMIN] Passer à la question suivante
    socket.on('nextQuestion', ({ pin }) => {
        const game = activeGames[pin];
        if (!game) return;

        game.currentQuestionIndex += 1; 

        io.to(pin).emit('gameUpdate', game); 

        console.log(`PIN ${pin}: Affichage de la question ${game.currentQuestionIndex}`);
    });

    // [JOUEUR] Soumettre une réponse
    socket.on('submitAnswer', ({ pin, playerId, answerIndex }) => {
        const game = activeGames[pin];
        if (!game || game.currentQuestionIndex < 0) return;

        const currentQuestion = game.questions[game.currentQuestionIndex];
        const player = game.players.find(p => p.id === playerId);

        if (!player) return;

        const isCorrect = answerIndex === currentQuestion.correctIndex;
        let pointsEarned = 0;

        if (isCorrect) {
            pointsEarned = 100;
            player.score += pointsEarned;
        }

        socket.emit('answerResult', { isCorrect, points: pointsEarned }); 

        io.to(pin).emit('gameUpdate', game);

        console.log(`PIN ${pin}: ${player.name} a répondu. Correcte: ${isCorrect}, Points: ${pointsEarned}`);
    });


    // Gérer la déconnexion
    socket.on('disconnect', () => {
        console.log(`Utilisateur déconnecté: ${socket.id}`);
        for (const pin in activeGames) {
            const game = activeGames[pin];
            const initialLength = game.players.length;
            game.players = game.players.filter(p => p.id !== socket.id);

            if (game.players.length < initialLength) {
                io.to(pin).emit('gameUpdate', game);
                console.log(`Joueur retiré du PIN ${pin}`);
            }
        }
    });

});


// --- Démarrer le Serveur ---
server.listen(PORT, () => {
    console.log(`Serveur en écoute sur le port ${PORT}`);
});