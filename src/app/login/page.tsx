/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */


"use client";

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useData } from '@/lib/dataprovider';
import { AuthForm } from '@/components/auth/AuthForm';

export default function LoginPage() {
    const { loginWithEmail, login, signupWithEmail, firebaseUser, authReady } = useData();
    const router = useRouter();

    // If the user is already logged in, redirect to the dashboard.
    // This now runs as an effect after the component renders.
    useEffect(() => {
        if (authReady && firebaseUser) {
            router.replace('/dashboard');
        }
    }, [authReady, firebaseUser, router]);

    // While redirecting or if auth state is not ready, show nothing or a loader
    if (authReady && firebaseUser) {
        return null; // Or a loading spinner
    }

    return (
        <AuthForm
            onEmailLogin={loginWithEmail}
            onEmailSignup={signupWithEmail}
            onGoogleSubmit={login}
        />
    );
}
