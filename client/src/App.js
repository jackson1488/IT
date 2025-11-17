import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import Login from './pages/Login';
import Register from './pages/Register';
import ChatList from './pages/ChatList';
import ChatRoom from './pages/ChatRoom';
import Profile from './pages/Profile';
import './App.css';

function App() {
    const { user, checkAuth, theme } = useAuthStore();

    useEffect(() => {
        checkAuth();
    }, [checkAuth]);

    useEffect(() => {
        document.body.setAttribute('data-theme', theme);
    }, [theme]);

    return (
        <Router>
            <Routes>
                <Route path="/login" element={!user ? <Login /> : <Navigate to="/chat" />} />
                <Route path="/register" element={!user ? <Register /> : <Navigate to="/chat" />} />
                <Route path="/chat" element={user ? <ChatList /> : <Navigate to="/login" />} />
                <Route path="/chat/:chatId" element={user ? <ChatRoom /> : <Navigate to="/login" />} />
                <Route path="/profile" element={user ? <Profile /> : <Navigate to="/login" />} />
                <Route path="/" element={<Navigate to={user ? "/chat" : "/login"} />} />
            </Routes>
        </Router>
    );
}

export default App;
