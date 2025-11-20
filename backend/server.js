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
// MODIFICATION CRUCIALE POUR LE CORS
// Remplacez 'VOTRE_URL_NETLIFY' par l'URL exacte de votre site Netlify
const FRONTEND_URL = 'https://blind-test-by-alv-event.netlify.app'; 
// Si vous testez en local, vous pouvez aussi ajouter: 'http://localhost:5173'
// >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

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
        res.status(400).send({ message: 'Erreur lors de la création du quiz', error: error.message });
    }
});

// 2. GET /api/quizzes : Récupérer tous les titres de quiz
app.get('/api/quizzes', async (req, res) => {
    try {
        const quizzes = await Quiz.find({}, 'title questions'); // Récupère le titre et le contenu des questions
        res.status(200).send(quizzes);
    } catch (error) {
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

            // Créer un PIN aléatoire unique
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

            // L'administrateur rejoint la "room" (salle) du PIN pour recevoir les mises à jour
            socket.join(pin); 
            
            // Envoyer la première mise à jour à l'admin (pour afficher le PIN)
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
            // Le joueur n'est pas informé directement ici. L'admin peut voir l'échec.
            // Pour une meilleure expérience, le joueur devrait recevoir un message.
            socket.emit('joinFailed', { message: 'PIN invalide ou nom déjà pris.' });
            return;
        }

        const newPlayer = {
            id: socket.id,
            name: name,
            score: 0
        };

        game.players.push(newPlayer);
        socket.join(pin); // Le joueur rejoint la room du PIN

        // Notifier l'administrateur et les autres joueurs de la room
        io.to(pin).emit('gameUpdate', game); 
        io.to(pin).emit('playerJoined', newPlayer); 

        console.log(`Joueur ${name} a rejoint le PIN ${pin}`);
    });

    // [ADMIN] Passer à la question suivante
    socket.on('nextQuestion', ({ pin }) => {
        const game = activeGames[pin];
        if (!game) return;

        // Passer à l'index suivant (du lobby à Q1, de Q1 à Q2, etc.)
        game.currentQuestionIndex += 1; 

        // Notifier toute la room (Admin + Joueurs)
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

        // VÉRIFICATION DE LA RÉPONSE (simplifiée: 100 points pour la bonne réponse)
        const isCorrect = answerIndex === currentQuestion.correctIndex;
        let pointsEarned = 0;

        if (isCorrect) {
            pointsEarned = 100; // Vous pouvez ajouter une logique de rapidité ici si vous voulez
            player.score += pointsEarned;
        }

        // Notifier UNIQUEMENT le joueur de son résultat (optionnel, 'gameUpdate' met déjà à jour le score)
        socket.emit('answerResult', { isCorrect, points: pointsEarned }); 

        // Notifier la room (Admin) pour mettre à jour la liste des joueurs
        io.to(pin).emit('gameUpdate', game);

        console.log(`PIN ${pin}: ${player.name} a répondu. Correcte: ${isCorrect}, Points: ${pointsEarned}`);
    });


    // Gérer la déconnexion
    socket.on('disconnect', () => {
        console.log(`Utilisateur déconnecté: ${socket.id}`);
        // Supprimer le joueur de toutes les parties actives si nécessaire
        for (const pin in activeGames) {
            const game = activeGames[pin];
            const initialLength = game.players.length;
            game.players = game.players.filter(p => p.id !== socket.id);

            // Si un joueur a été retiré, notifier la room
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