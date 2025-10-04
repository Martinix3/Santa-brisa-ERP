
"use client";

import React from 'react';
import { useData } from '@/lib/dataprovider';
import { AuthForm } from '@/components/auth/AuthForm';
import { useRouter } from 'next/navigation';
import Loading from '../loading';

export default function LoginPage() {
    const { loginWithEmail, signupWithEmail, login, authReady, firebaseUser } = useData();
    const router = useRouter();

    React.useEffect(() => {
      // Si la autenticación está lista y ya hay un usuario, redirige a la app
      if (authReady && firebaseUser) {
        router.replace('/dashboard-personal');
      }
    }, [authReady, firebaseUser, router]);

    // Muestra una pantalla de carga mientras se verifica el estado de autenticación
    if (!authReady || (authReady && firebaseUser)) {
      return <Loading />;
    }

    return (
        <AuthForm
            onEmailLogin={loginWithEmail}
            onEmailSignup={signupWithEmail}
            onGoogleSubmit={login}
        />
    );
}
