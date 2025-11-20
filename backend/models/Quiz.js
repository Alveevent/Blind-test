// backend/models/Quiz.js (CODE À INSÉRER)
const mongoose = require('mongoose');

function arrayLimit(val) {
    return val.length === 4;
}

const QuestionSchema = new mongoose.Schema({
    text: { type: String, required: true },
    options: { 
        type: [String], 
        required: true, 
        validate: [arrayLimit, 'Les questions doivent avoir exactement 4 options.'] 
    }, 
    correctAnswerIndex: { 
        type: Number, 
        required: true, 
        min: 0, 
        max: 3 
    } 
});

const QuizSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    questions: [QuestionSchema], 
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Quiz', QuizSchema);