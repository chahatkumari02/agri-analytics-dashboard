import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import axios from '../api/axios';

interface AuthUser {
  user_id: number;
  name: string;
  email: string;
  role: string;
  farm_id: number | null;
  token: string;
}

interface AuthStore {
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      login: async (email, password) => {
        const res = await axios.post('/auth/login', { email, password });
        const data = res.data;
        set({
          user: {
            user_id: data.user_id,
            name: data.name,
            email: data.email,
            role: data.role,
            farm_id: data.farm_id,
            token: data.access_token,
          },
        });
      },
      logout: () => set({ user: null }),
    }),
    { name: 'agri-auth' }
  )
);
