// src/components/ui/SBToast.tsx
"use client";
import { Toaster, toast } from 'sonner';

export const useSBToast = () => {
    return {
        push: (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
            switch (type) {
                case 'success':
                    toast.success(message);
                    break;
                case 'error':
                    toast.error(message);
                    break;
                case 'warning':
                    toast.warning(message);
                    break;
                case 'info':
                default:
                    toast.info(message);
                    break;
            }
        },
        ui: <Toaster position="bottom-right" />
    };
};
