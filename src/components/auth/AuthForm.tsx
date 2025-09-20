
"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useData } from '@/lib/dataprovider';

type AuthFormProps = {
    onEmailLogin: (email: string, pass: string) => Promise<any>;
    onEmailSignup: (email: string, pass: string) => Promise<any>;
    onGoogleSubmit: () => Promise<any>;
};

export function AuthForm({ onEmailLogin, onEmailSignup, onGoogleSubmit }: AuthFormProps) {
    const { currentUser } = useData();
    const router = useRouter();
    const [mode, setMode] = useState<'login' | 'signup'>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Redirect if user is already logged in or after a successful login.
    useEffect(() => {
        if (currentUser) {
            router.replace('/');
        }
    }, [currentUser, router]);

    const title = mode === 'login' ? 'Santa Brisa CRM' : 'Crear Cuenta';
    const description = mode === 'login' ? 'Por favor, inicia sesión para continuar.' : 'Regístrate para acceder al CRM de Santa Brisa.';
    const buttonText = mode === 'login' ? 'Iniciar Sesión' : 'Crear Cuenta';
    const loadingText = mode === 'login' ? 'Iniciando sesión...' : 'Creando cuenta...';
    const toggleButtonText = mode === 'login' ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia sesión';
    const onEmailSubmit = mode === 'login' ? onEmailLogin : onEmailSignup;
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            await onEmailSubmit(email, password);
            // Redirection is now handled by the useEffect
        } catch (err: any) {
            setError(err.message || 'Ha ocurrido un error.');
        } finally {
            setLoading(false);
        }
    };
    
    const handleGoogle = async () => {
        setLoading(true);
        setError(null);
        try {
            await onGoogleSubmit();
            // Redirection is now handled by the useEffect
        } catch (err: any) {
             setError(err.message || 'Error con el login de Google.');
        } finally {
            setLoading(false);
        }
    }

    const toggleMode = () => {
        setMode(prev => prev === 'login' ? 'signup' : 'login');
        setError(null);
    }

    return (
        <div className="h-screen w-screen flex items-center justify-center bg-zinc-50 p-4">
            <div className="w-full max-w-sm text-center p-8 bg-white shadow-xl rounded-2xl border">
                <h1 className="text-2xl font-bold text-zinc-800">{title}</h1>
                <p className="text-zinc-600 mt-2 mb-6">{description}</p>
                
                <form onSubmit={handleSubmit} className="space-y-4 text-left">
                    <div>
                        <label htmlFor="email" className="text-sm font-medium text-zinc-700">Email</label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            autoComplete="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="mt-1 w-full px-3 py-2 border border-zinc-300 rounded-md shadow-sm focus:outline-none focus:ring-yellow-500 focus:border-yellow-500"
                            required
                        />
                    </div>
                    <div>
                        <label htmlFor="password" className="text-sm font-medium text-zinc-700">Contraseña</label>
                        <input
                            id="password"
                            name="password"
                            type="password"
                            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="mt-1 w-full px-3 py-2 border border-zinc-300 rounded-md shadow-sm focus:outline-none focus:ring-yellow-500 focus:border-yellow-500"
                            required
                            minLength={6}
                        />
                    </div>
                    {error && <p className="text-xs text-red-600 text-center">{error}</p>}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full px-6 py-3 bg-zinc-800 text-white font-semibold rounded-lg hover:bg-zinc-700 transition-colors disabled:bg-zinc-400"
                    >
                        {loading ? loadingText : buttonText}
                    </button>
                </form>

                <div className="my-4 flex items-center">
                    <div className="flex-grow border-t border-zinc-200"></div>
                    <span className="flex-shrink mx-4 text-zinc-400 text-sm">o</span>
                    <div className="flex-grow border-t border-zinc-200"></div>
                </div>
                
                <button
                    onClick={handleGoogle}
                    className="w-full px-6 py-3 bg-yellow-400 text-zinc-900 font-semibold rounded-lg hover:bg-yellow-500 transition-colors flex items-center justify-center gap-2"
                >
                    <svg className="w-5 h-5" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.42-4.55H24v8.51h13.04c-.58 2.77-2.26 5.14-4.8 6.7l7.65 5.94c4.51-4.18 7.14-10.34 7.14-17.65z"></path><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24s.92 7.54 2.56 10.78l7.97-6.19z"></path><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.65-5.94c-2.13 1.42-4.84 2.27-7.98 2.27-6.28 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path><path fill="none" d="M0 0h48v48H0z"></path></svg>
                    Continuar con Google
                </button>
                 <p className="mt-6 text-sm text-center text-zinc-600">
                    <button onClick={toggleMode} className="font-medium text-yellow-600 hover:underline">
                        {toggleButtonText}
                    </button>
                </p>
            </div>
        </div>
    );
}
