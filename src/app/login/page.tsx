
"use client";

import React from 'react';
import { useData } from '@/lib/dataprovider';
import { AuthForm } from '@/components/auth/AuthForm';

export default function LoginPage() {
    const { loginWithEmail, signupWithEmail, login } = useData();

    return (
        <AuthForm
            onEmailLogin={loginWithEmail}
            onEmailSignup={signupWithEmail}
            onGoogleSubmit={login}
        />
    );
}
