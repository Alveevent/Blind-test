import React, { useState } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';

// >>> URL DU BACKEND DÉPLOYÉ SUR RENDER
const BASE_URL = 'https://blind-test-xttc.onrender.com';
const API_URL = `${BASE_URL}/api/quizzes`;

// Initialisation de Socket.IO
const socket = io(BASE_URL);

const AdminCreateQuiz = () => {
    const [title, setTitle] = useState('');
    const [questions, setQuestions] = useState([
        { text: '', answers: ['', '', '', ''], correctIndex: 0 }
    ]);
    const [message, setMessage] = useState('');

    const handleQuestionChange = (index, field, value) => {
        const newQuestions = [...questions];
        newQuestions[index][field] = value;
        setQuestions(newQuestions);
    };

    const handleAnswerChange = (qIndex, aIndex, value) => {
        const newQuestions = [...questions];
        newQuestions[qIndex].answers[aIndex] = value;
        setQuestions(newQuestions);
    };

    const addQuestion = () => {
        setQuestions([...questions, { text: '', answers: ['', '', '', ''], correctIndex: 0 }]);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('Sauvegarde en cours...');
        
        try {
            const response = await axios.post(API_URL, { title, questions });
            setMessage(`Quiz créé avec succès ! ID: ${response.data._id}`);
            // Nettoyage du formulaire après succès
            setTitle('');
            setQuestions([{ text: '', answers: ['', '', '', ''], correctIndex: 0 }]);
        } catch (error) {
            console.error('Erreur lors de la création du quiz:', error);
            setMessage('Erreur lors de la création. Voir la console pour les détails.');
        }
    };

    return (
        <div style={styles.container}>
            <h2 style={styles.header}>Créer un Nouveau Blind-Test (Quiz)</h2>
            <form onSubmit={handleSubmit} style={styles.form}>
                
                <div style={styles.inputGroup}>
                    <label style={styles.label}>Titre du Quiz :</label>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        required
                        style={styles.input}
                        placeholder="Ex: Hits des années 90"
                    />
                </div>

                {questions.map((q, qIndex) => (
                    <div key={qIndex} style={styles.questionCard}>
                        <h3 style={styles.questionHeader}>Question {qIndex + 1}</h3>
                        <input
                            type="text"
                            value={q.text}
                            onChange={(e) => handleQuestionChange(qIndex, 'text', e.target.value)}
                            required
                            style={styles.input}
                            placeholder="Ex: Quel est le titre de cette chanson ?"
                        />
                        
                        <div style={styles.answersGrid}>
                            {q.answers.map((a, aIndex) => (
                                <div key={aIndex} style={styles.answerItem}>
                                    <input
                                        type="radio"
                                        name={`correct-${qIndex}`}
                                        checked={q.correctIndex === aIndex}
                                        onChange={() => handleQuestionChange(qIndex, 'correctIndex', aIndex)}
                                        style={styles.radio}
                                    />
                                    <input
                                        type="text"
                                        value={a}
                                        onChange={(e) => handleAnswerChange(qIndex, aIndex, e.target.value)}
                                        required
                                        style={{...styles.input, ...styles.answerInput}}
                                        placeholder={`Option ${aIndex + 1}`}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                ))}

                <button type="button" onClick={addQuestion} style={styles.addButton}>
                    + Ajouter une Question
                </button>
                
                <button type="submit" style={styles.submitButton}>
                    Sauvegarder le Quiz
                </button>
            </form>

            {message && <p style={styles.message}>{message}</p>}
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
    form: {
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
    },
    inputGroup: {
        marginBottom: '15px',
    },
    label: {
        display: 'block',
        marginBottom: '5px',
        fontWeight: 'bold',
        color: '#333'
    },
    input: {
        width: '100%',
        padding: '10px',
        borderRadius: '4px',
        border: '1px solid #ccc',
        boxSizing: 'border-box'
    },
    questionCard: {
        border: '2px solid #f0f0f0',
        borderRadius: '8px',
        padding: '15px',
        backgroundColor: '#fafafa'
    },
    questionHeader: {
        color: '#8A2BE2',
        marginTop: 0,
        fontSize: '1.1rem'
    },
    answersGrid: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '10px',
        marginTop: '15px'
    },
    answerItem: {
        display: 'flex',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: '5px',
        borderRadius: '4px',
        border: '1px solid #eee'
    },
    answerInput: {
        marginLeft: '10px',
        flexGrow: 1,
        padding: '8px'
    },
    radio: {
        transform: 'scale(1.2)'
    },
    addButton: {
        backgroundColor: '#387c38',
        color: 'white',
        padding: '12px',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer',
        fontWeight: 'bold',
        transition: 'background-color 0.2s'
    },
    submitButton: {
        backgroundColor: '#4E0187',
        color: 'white',
        padding: '15px',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer',
        fontWeight: 'bold',
        fontSize: '1.1rem',
        transition: 'background-color 0.2s',
        marginTop: '20px'
    },
    message: {
        marginTop: '20px',
        textAlign: 'center',
        color: 'green',
        fontWeight: 'bold'
    }
};

export default AdminCreateQuiz;