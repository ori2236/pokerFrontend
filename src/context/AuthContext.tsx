import React, { createContext, useContext, useEffect, useState } from "react";
import { api, setApiToken } from "../lib/api";
import { deleteToken, getToken, saveToken } from "../lib/storage";

type User = {
    id: number;
    username: string;
    role: "ADMIN" | "USER";
    profile_image_base64?: string | null;
    secondary_profile_image_base64?: string | null;
};

type RegisterPayload = {
    username: string;
    password: string;
    confirmPassword?: string;
    profileImageBase64: string;
};

type AuthContextType = {
    user: User | null;
    loading: boolean;
    login: (username: string, password: string) => Promise<void>;
    register: (payload: RegisterPayload) => Promise<void>;
    logout: () => Promise<void>;
    refreshMe: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    async function refreshMe() {
        try {
            const response = await api.get("/auth/me");
            setUser(response.data.user);
        } catch (error: any) {
            if (error?.response?.status === 401) {
                await deleteToken();
                setApiToken(null);
                setUser(null);
                return;
            }
            throw error;
        }
    }

    async function login(username: string, password: string) {
        const response = await api.post("/auth/login", { username, password });
        const token = response.data.token;

        await saveToken(token);
        setApiToken(token);
        await refreshMe();
    }

    async function register(payload: RegisterPayload) {
        await api.post("/auth/register", payload);
        await login(payload.username, payload.password);
    }

    async function logout() {
        await deleteToken();
        setApiToken(null);
        setUser(null);
    }

    useEffect(() => {
        async function init() {
            try {
                const token = await getToken();

                if (!token) {
                    setLoading(false);
                    return;
                }

                setApiToken(token);
                await refreshMe();
            } catch (error) {
                await deleteToken();
                setApiToken(null);
                setUser(null);
            } finally {
                setLoading(false);
            }
        }

        init();
    }, []);

    return (
        <AuthContext.Provider
            value={{ user, loading, login, register, logout, refreshMe }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) {
        throw new Error("useAuth must be used inside AuthProvider");
    }
    return ctx;
}
