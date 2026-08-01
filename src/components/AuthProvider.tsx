import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signInWithPhoneNumber,
  googleProvider,
  RecaptchaVerifier,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  type User,
  type ConfirmationResult,
} from '../lib/firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string) => Promise<{ error?: string }>;
  signInWithGoogle: () => Promise<{ error?: string }>;
  signInWithPhone: (phoneNumber: string) => Promise<{ error?: string; confirmationResult?: ConfirmationResult }>;
  confirmPhoneCode: (confirmationResult: ConfirmationResult, code: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      return {};
    } catch (error: any) {
      const messages: Record<string, string> = {
        'auth/user-not-found': 'No existe una cuenta con este correo.',
        'auth/wrong-password': 'Contrasena incorrecta.',
        'auth/invalid-email': 'Correo electronico invalido.',
        'auth/too-many-requests': 'Demasiados intentos. Intenta de nuevo mas tarde.',
        'auth/invalid-credential': 'Credenciales invalidas.',
      };
      return { error: messages[error.code] || 'Error al iniciar sesion.' };
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      return {};
    } catch (error: any) {
      const messages: Record<string, string> = {
        'auth/email-already-in-use': 'Ya existe una cuenta con este correo.',
        'auth/invalid-email': 'Correo electronico invalido.',
        'auth/weak-password': 'La contrasena es muy debil.',
      };
      return { error: messages[error.code] || 'Error al crear la cuenta.' };
    }
  };

  const signInWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      return {};
    } catch (error: any) {
      const messages: Record<string, string> = {
        'auth/popup-closed-by-user': 'Ventana de login cerrada.',
        'auth/popup-blocked': 'Popup bloqueado por el navegador.',
        'auth/cancelled-popup-request': 'Login cancelado.',
        'auth/unauthorized-domain': 'Dominio no autorizado. Agrega localhost en Firebase Console.',
      };
      return { error: messages[error.code] || 'Error al iniciar sesion con Google.' };
    }
  };

  const signInWithPhone = async (phoneNumber: string) => {
    try {
      if (!(window as any).__recaptchaVerifier) {
        (window as any).__recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
          size: 'invisible',
        });
      }
      const confirmationResult = await signInWithPhoneNumber(
        auth,
        phoneNumber,
        (window as any).__recaptchaVerifier,
      );
      return { confirmationResult };
    } catch (error: any) {
      const messages: Record<string, string> = {
        'auth/invalid-phone-number': 'Numero de telefono invalido.',
        'auth/too-many-requests': 'Demasiados intentos. Intenta de nuevo mas tarde.',
        'auth/quota-exceeded': 'Cuota de SMS excedida.',
      };
      return { error: messages[error.code] || 'Error al enviar codigo SMS.' };
    }
  };

  const confirmPhoneCode = async (confirmationResult: ConfirmationResult, code: string) => {
    try {
      await confirmationResult.confirm(code);
      return {};
    } catch (error: any) {
      return { error: 'Codigo de verificacion incorrecto.' };
    }
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signIn,
        signUp,
        signInWithGoogle,
        signInWithPhone,
        confirmPhoneCode,
        signOut,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
