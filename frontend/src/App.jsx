import React from 'react';
// Importez les composants que vous avez créés
import AdminCreateQuiz from './AdminCreateQuiz.jsx'; 
import AdminDashboard from './AdminDashboard.jsx'; 
import PlayerClient from './PlayerClient.jsx'; 

// Importez les outils de routage de React Router DOM
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';

function App() {
  return (
    // Le Router enveloppe toute l'application
    <Router>
      <div style={{ textAlign: 'center', fontFamily: 'Inter, Arial, sans-serif', minHeight: '100vh', backgroundColor: '#f0f2f5' }}>
        
        {/* En-tête de navigation simple pour basculer entre les vues */}
        <header style={{ 
          backgroundColor: '#4E0187', 
          padding: '15px 0', 
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)' 
        }}>
            <h1 style={{ color: 'white', margin: '0', fontSize: '1.5rem' }}>
                Mon Kahoot Clone
            </h1>
            <nav style={{ marginTop: '10px' }}>
                <Link to="/" style={linkStyle}>
                    JOUER (Client)
                </Link>
                <Link to="/admin" style={linkStyle}>
                    ADMINISTRATION
                </Link>
            </nav>
        </header>

        <main style={{ padding: '20px' }}>
            {/* Définition des Routes */}
            <Routes>
                {/* Route principale : L'interface JoueurClient est sur la racine "/" */}
                <Route path="/" element={<PlayerClient />} />

                {/* Route Admin : Les deux interfaces Admin sont regroupées sur "/admin" */}
                <Route 
                    path="/admin" 
                    element={
                        <div style={{ maxWidth: '900px', margin: '0 auto', padding: '20px', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                            <h2 style={{ color: '#4E0187', borderBottom: '2px solid #ddd', paddingBottom: '10px' }}>
                                Espace Administration
                            </h2>
                            <AdminCreateQuiz /> 
                            <hr style={{ margin: '30px 0' }}/>
                            <AdminDashboard />
                        </div>
                    } 
                />
                
                {/* Route optionnelle pour gérer les erreurs 404 */}
                <Route path="*" element={<NotFound />} />
            </Routes>
        </main>
      </div>
    </Router>
  );
}

// Styles pour les liens de navigation
const linkStyle = {
    color: 'white',
    textDecoration: 'none',
    margin: '0 15px',
    padding: '5px 10px',
    borderRadius: '4px',
    transition: 'background-color 0.3s',
    fontWeight: 'bold'
};

// Composant simple pour les pages non trouvées
function NotFound() {
    return (
        <div style={{ padding: '50px', color: '#333' }}>
            <h2>404 - Page Non Trouvée</h2>
            <p>Veuillez utiliser la navigation ci-dessus pour retourner à l'accueil ou à l'administration.</p>
        </div>
    );
}

export default App;