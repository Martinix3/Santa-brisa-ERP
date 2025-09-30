
"use client";

import React, { useState } from "react";
import { SBButton, Input } from '@/components/ui/ui-primitives';
import { Mail, Lock, Loader } from 'lucide-react';
import Image from 'next/image';

type AuthFormProps = {
  onEmailLogin: (email: string, pass: string) => Promise<any>;
  onEmailSignup: (email: string, pass: string) => Promise<any>;
  onGoogleSubmit: () => Promise<void>;
};

export function AuthForm({ onEmailLogin, onEmailSignup, onGoogleSubmit }: AuthFormProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    console.log(`[AuthForm] handleSubmit: mode is ${isLogin ? 'LOGIN' : 'SIGNUP'}`);
    try {
      if (isLogin) {
        console.log(`[AuthForm] Calling onEmailLogin with ${email}`);
        await onEmailLogin(email, password);
      } else {
        console.log(`[AuthForm] Calling onEmailSignup with ${email}`);
        await onEmailSignup(email, password);
      }
      console.log(`[AuthForm] Auth operation successful (client-side).`);
      // El DataProvider se encargará de la redirección
    } catch (err: any) {
      console.error("[AuthForm] Submit Error:", err);
      let friendlyError = 'Error en la autenticación.';
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
        friendlyError = 'El correo o la contraseña son incorrectos.';
      } else if (err.code === 'auth/email-already-in-use') {
        friendlyError = 'Este correo electrónico ya está registrado.';
      } else if (err.code === 'auth/weak-password') {
        friendlyError = 'La contraseña debe tener al menos 6 caracteres.';
      }
      setError(friendlyError);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setError(null);
  }

  return (
    <div className="flex min-h-[100svh] items-center justify-center bg-zinc-50 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-8 shadow-lg">
        <div className="text-center mb-6">
            <Image 
                src="https://santabrisa.es/cdn/shop/files/clavista_300x_36b708f6-4606-4a51-9f65-e4b379531ff8_300x.svg?v=1752413726" 
                alt="Santa Brisa"
                width={120}
                height={40}
                priority
                className="mx-auto h-10 w-auto" 
            />
          <h1 className="mt-4 text-2xl font-bold text-zinc-900">
            {isLogin ? 'Bienvenido de nuevo' : 'Crea tu cuenta'}
          </h1>
          <p className="mt-2 text-sm text-zinc-600">
            {isLogin ? 'Accede a tu cuenta de Santa Brisa.' : 'Empieza a gestionar tus operaciones.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-zinc-700" htmlFor="email">Email</label>
            <div className="relative mt-1">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <Input type="email" id="email" value={email} onChange={e => setEmail(e.target.value)} required className="pl-9" disabled={isLoading} autoComplete="email"/>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-zinc-700" htmlFor="password">Contraseña</label>
            <div className="relative mt-1">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <Input type="password" id="password" value={password} onChange={e => setPassword(e.target.value)} required className="pl-9" disabled={isLoading} autoComplete={isLogin ? "current-password" : "new-password"}/>
            </div>
          </div>

          {error && <p className="text-xs text-red-600 bg-red-50 p-2 rounded-md">{error}</p>}

          <SBButton type="submit" className="w-full" disabled={isLoading}>
             {isLoading && <Loader className="h-4 w-4 mr-2 animate-spin" />}
            {isLoading ? (isLogin ? 'Iniciando sesión...' : 'Creando cuenta...') : (isLogin ? 'Iniciar Sesión' : 'Crear Cuenta')}
          </SBButton>
        </form>

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-zinc-500">O continúa con</span>
            </div>
          </div>

          <div className="mt-4">
            <SBButton type="button" variant="secondary" className="w-full" onClick={onGoogleSubmit} disabled={isLoading}>
              <svg className="mr-2 -ml-1 h-5 w-5" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512"><path fill="currentColor" d="M488 261.8C488 403.3 381.5 512 244 512S0 403.3 0 261.8 102.5 0 244 0s244 118.5 244 261.8zM97.2 258.9c0 40.2 16.9 76.2 43.8 102.3l-31.5 31.5C74.3 360.3 49 313.2 49 258.9c0-57.8 28.9-108.5 73.2-139.1l31.5 31.5c-28.9 25.8-46.7 62.5-46.7 105.6zM244 388.3c-23.7 0-44.5-8.5-61.3-22.3l-31.5 31.5c24.6 21.6 57.2 34.6 92.8 34.6 62.9 0 115.8-40.9 133.7-98.3l-31.5-31.5c-15.1 27.2-44.1 45.8-77.4 45.8zM438.2 258.9c0 30.7-10.8 58.9-29.2 81.3l-31.5-31.5c15.1-19.3 24.3-43.1 24.3-69.1s-9.2-49.8-24.3-69.1l31.5-31.5c18.4 22.4 29.2 50.5 29.2 81.3z"></path></svg>
              Google
            </SBButton>
          </div>
        </div>

        <p className="mt-6 text-center text-sm text-zinc-600">
          {isLogin ? '¿No tienes cuenta?' : '¿Ya tienes una cuenta?'}
          <button type="button" onClick={toggleMode} className="font-semibold text-yellow-600 hover:text-yellow-500 ml-1 bg-transparent border-none p-0 cursor-pointer">
            {isLogin ? 'Regístrate' : 'Inicia sesión'}
          </button>
        </p>
      </div>
    </div>
  );
}
