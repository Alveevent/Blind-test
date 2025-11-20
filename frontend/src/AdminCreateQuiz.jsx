// frontend/src/AdminCreateQuiz.jsx

import React, { useState } from 'react';
import axios from 'axios';

const BASE_URL = 'http://localhost:3000'; // Votre serveur Backend

function AdminCreateQuiz() {
    const [title, setTitle] = useState('');
    const [questions, setQuestions] = useState([{ text: '', options: ['', '', '', ''], correctAnswerIndex: 0 }]);
    const [message, setMessage] = useState('');

    const addQuestion = () => {
        setQuestions([...questions, { text: '', options: ['', '', '', ''], correctAnswerIndex: 0 }]);
    };
    
    // Fonction utilitaire pour gérer les changements d'une question (texte ou index correct)
    const handleQuestionChange = (index, field, value) => {
        const newQuestions = [...questions];
        if (field === 'correctAnswerIndex') {
            // Assurez-vous que l'index est bien un nombre entier
            newQuestions[index][field] = parseInt(value, 10);
        } else {
            newQuestions[index][field] = value;
        }
        setQuestions(newQuestions);
    };

    // Fonction utilitaire pour gérer les changements des options (A, B, C, D)
    const handleOptionChange = (qIndex, oIndex, value) => {
        const newQuestions = [...questions];
        newQuestions[qIndex].options[oIndex] = value;
        setQuestions(newQuestions);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('Sauvegarde en cours...');
        
        // Validation basique (un quiz doit avoir au moins une question)
        if (!title || questions.length === 0) {
            setMessage('Le titre et au moins une question sont requis.');
            return;
        }

        try {
            const quizData = { title, questions };
            // Envoie les données du quiz au serveur (Backend)
            const response = await axios.post(`${BASE_URL}/api/quizzes`, quizData);
            
            setMessage(`✅ Quiz "${response.data.title}" créé avec succès! Vous pouvez le lancer depuis le Dashboard.`);
            
            // Réinitialiser le formulaire
            setTitle('');
            setQuestions([{ text: '', options: ['', '', '', ''], correctAnswerIndex: 0 }]);
            
        } catch (error) {
            // Affiche l'erreur renvoyée par le serveur (par exemple si la validation Mongoose échoue)
            setMessage(`❌ Erreur: ${error.response?.data?.message || 'Erreur de connexion au serveur.'}`);
            console.error(error);
        }
    };

    return (
        <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto', border: '1px solid #ccc', borderRadius: '8px', marginBottom: '30px' }}>
            <h2>✍️ Créer un Nouveau Quiz</h2>
            {message && <p style={{ fontWeight: 'bold', color: message.startsWith('❌') ? 'red' : 'green' }}>{message}</p>}
            
            <form onSubmit={handleSubmit}>
                <label style={{ display: 'block', fontWeight: 'bold', marginTop: '15px' }}>Titre du Quiz:</label>
                <input 
                    type="text" 
                    value={title} 
                    onChange={(e) => setTitle(e.target.value)} 
                    required 
                    style={{ display: 'block', margin: '10px 0', padding: '8px', width: '100%', boxSizing: 'border-box' }}
                />

                {questions.map((q, qIndex) => (
                    <div key={qIndex} style={{ border: '2px solid #ddd', padding: '15px', margin: '15px 0', borderRadius: '6px' }}>
                        <h4 style={{ borderBottom: '1px solid #eee', paddingBottom: '10px' }}>Question {qIndex + 1}</h4>
                        
                        <label style={{ display: 'block', marginTop: '10px' }}>Texte de la Question: </label>
                        <input 
                            type="text" 
                            value={q.text} 
                            onChange={(e) => handleQuestionChange(qIndex, 'text', e.target.value)} 
                            required 
                            style={{ display: 'block', margin: '10px 0', padding: '8px', width: '100%', boxSizing: 'border-box' }}
                        />

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                            {q.options.map((option, oIndex) => (
                                <div key={oIndex} style={{ display: 'flex', alignItems: 'center', background: oIndex % 2 === 0 ? '#f9f9f9' : '#f5f5f5', padding: '5px', borderRadius: '4px' }}>
                                    <label style={{ marginRight: '5px', fontWeight: 'bold', color: ['red', 'blue', 'orange', 'green'][oIndex] }}>{['A', 'B', 'C', 'D'][oIndex]}:</label>
                                    <input
                                        type="text"
                                        value={option}
                                        onChange={(e) => handleOptionChange(qIndex, oIndex, e.target.value)}
                                        required
                                        style={{ padding: '5px', width: '100%' }}
                                    />
                                </div>
                            ))}
                        </div>
                        
                        <label style={{ marginTop: '15px', display: 'block' }}>
                            Réponse Correcte (Index 1 à 4):
                            <select 
                                value={q.correctAnswerIndex + 1} 
                                onChange={(e) => handleQuestionChange(qIndex, 'correctAnswerIndex', e.target.value - 1)}
                                style={{ marginLeft: '10px', padding: '8px' }}
                            >
                                <option value={1}>1 - {q.options[0] || 'Option 1'}</option>
                                <option value={2}>2 - {q.options[1] || 'Option 2'}</option>
                                <option value={3}>3 - {q.options[2] || 'Option 3'}</option>
                                <option value={4}>4 - {q.options[3] || 'Option 4'}</option>
                            </select>
                        </label>
                    </div>
                ))}

                <button type="button" onClick={addQuestion} style={{ padding: '10px 20px', marginRight: '10px', marginTop: '15px' }}>
                    + Ajouter une Question
                </button>
                <button type="submit" style={{ padding: '10px 20px', background: 'green', color: 'white', border: 'none', cursor: 'pointer' }}>
                    Sauvegarder le Quiz
                </button>
            </form>
        </div>
    );
}

export default AdminCreateQuiz;