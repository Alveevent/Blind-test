import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import AdminDashboard from './AdminDashboard';
import AdminCreateQuiz from './AdminCreateQuiz';
import PlayerClient from './PlayerClient';

// Retrait du LOGO_URL comme demandé.

const App = () => {
  return (
    <Router>
      <div style={styles.appContainer}>
        
        {/* BARRE DE NAVIGATION ET TITRE POUR PC */}
        <header style={styles.header}>
            <div style={styles.titleContainer}>
                <h1 style={styles.appTitle}>Quizz ALV-EVENT</h1>
            </div>
            
            <nav style={styles.nav}>
                <Link to="/" style={styles.navLink}>Accueil (Joueur)</Link>
                <Link to="/admin" style={styles.navLink}>Admin Dashboard</Link>
                <Link to="/create" style={styles.navLink}>Créer Quiz</Link>
            </nav>
        </header>

        {/* CONTENU PRINCIPAL CENTRÉ ET ÉLÉGANT */}
        <main style={styles.mainContent}>
            <Routes>
                <Route path="/" element={<PlayerClient />} />
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/create" element={<AdminCreateQuiz />} />
            </Routes>
        </main>
      </div>
    </Router>
  );
};

const styles = {
    appContainer: {
        // Fond léger pour le contexte
        minHeight: '100vh',
        backgroundColor: '#f8f8f8', 
    },
    header: {
        backgroundColor: '#4E0187', // Couleur principale
        padding: '10px 40px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
        position: 'sticky',
        top: 0,
        zIndex: 100
    },
    titleContainer: {
        // Conteneur du titre à la place du logo
    },
    appTitle: {
        color: '#fff',
        fontSize: '1.8rem',
        margin: 0,
        fontWeight: 'bold',
    },
    nav: {
        display: 'flex',
        gap: '25px',
    },
    navLink: {
        color: '#fff',
        textDecoration: 'none',
        fontSize: '1.1rem',
        padding: '5px 10px',
        borderRadius: '4px',
        transition: 'background-color 0.2s',
        // Note: Les pseudo-classes comme ':hover' ne sont pas supportées directement dans les objets style JS.
        // On les gère souvent via useState ou un fichier CSS externe, mais pour la simplicité, on les laisse
        // comme mémo ici (elles seront ignorées par React Style).
    },
    mainContent: {
        // Contenu centré avec une largeur maximale pour l'affichage PC
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '20px',
    }
};

export default App;