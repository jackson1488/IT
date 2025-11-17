import { create } from 'zustand';
import { api } from '../api/api';

export const useAuthStore = create((set, get) => ({
    user: null,
    token: localStorage.getItem('token'),
    theme: localStorage.getItem('theme') || 'light',
    isLoading: false,
    error: null,

    setTheme: (theme) => {
        localStorage.setItem('theme', theme);
        set({ theme });
        document.body.setAttribute('data-theme', theme);
    },

    register: async (username, password) => {
        set({ isLoading: true, error: null });
        try {
            const response = await api.post('/api/auth/register', { username, password });
            set({ isLoading: false });
            return response.data;
        } catch (error) {
            const message = error.response?.data?.detail || 'Registration failed';
            set({ error: message, isLoading: false });
            throw new Error(message);
        }
    },

    login: async (username, password) => {
        set({ isLoading: true, error: null });
        try {
            const response = await api.post('/api/auth/login', { username, password });
            const { access_token } = response.data;

            localStorage.setItem('token', access_token);
            set({ token: access_token });

            // Get user info
            const userResponse = await api.get('/api/users/me', {
                headers: { Authorization: `Bearer ${access_token}` }
            });

            const user = userResponse.data;
            set({ user, theme: user.theme, isLoading: false });

            // Apply theme
            localStorage.setItem('theme', user.theme);
            document.body.setAttribute('data-theme', user.theme);

            return user;
        } catch (error) {
            const message = error.response?.data?.detail || 'Login failed';
            set({ error: message, isLoading: false });
            throw new Error(message);
        }
    },

    logout: () => {
        localStorage.removeItem('token');
        set({ user: null, token: null });
        window.location.href = '/login';
    },

    checkAuth: async () => {
        const token = get().token;
        if (!token) {
            set({ user: null });
            return;
        }

        try {
            const response = await api.get('/api/users/me', {
                headers: { Authorization: `Bearer ${token}` }
            });
            const user = response.data;
            set({ user, theme: user.theme });

            // Apply theme
            localStorage.setItem('theme', user.theme);
            document.body.setAttribute('data-theme', user.theme);
        } catch (error) {
            localStorage.removeItem('token');
            set({ user: null, token: null });
        }
    },

    updateProfile: async (updates) => {
        const token = get().token;
        set({ isLoading: true, error: null });

        try {
            const response = await api.put('/api/users/me', updates, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const user = response.data;
            set({ user, isLoading: false });

            if (updates.theme) {
                get().setTheme(updates.theme);
            }

            return user;
        } catch (error) {
            const message = error.response?.data?.detail || 'Update failed';
            set({ error: message, isLoading: false });
            throw new Error(message);
        }
    }
}));
