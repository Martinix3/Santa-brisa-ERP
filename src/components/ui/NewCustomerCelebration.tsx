
"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';

export function NewCustomerCelebration({ accountName, onClose }: { accountName: string; onClose: () => void; }) {
    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.8, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    transition={{ type: 'spring', damping: 15, stiffness: 200 }}
                    className="text-center p-8"
                >
                    <Image
                        src="https://i.pinimg.com/originals/89/8d/6f/898d6f8726ba02f41bec46ae5df45000.gif"
                        alt="Confeti de celebración"
                        width={320}
                        height={320}
                        className="w-80 h-80 object-cover rounded-full mx-auto shadow-2xl"
                    />
                    <h2 className="text-4xl font-bold text-white mt-8" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>¡Nueva Cuenta Conseguida!</h2>
                    <p className="text-xl text-yellow-200 mt-2">¡Felicidades por el primer pedido de <span className="font-bold">{accountName}</span>!</p>
                    <button
                        onClick={onClose}
                        className="mt-8 px-8 py-3 bg-white text-zinc-900 font-semibold rounded-full shadow-lg transition-transform hover:scale-105"
                    >
                        ¡Genial!
                    </button>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
