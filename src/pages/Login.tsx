import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Wallet, AlertCircle, ShieldCheck, Mail, Lock, LogIn, UserPlus, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function Login() {
  const { user, login, loginRedirect, signInWithEmail, signUpWithEmail, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      navigate('/', { replace: true });
    }
  }, [user, navigate]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    
    setError(null);
    setIsSubmitting(true);
    
    try {
      if (isRegistering) {
        // Explicit registration
        await signUpWithEmail(email, password);
      } else {
        // Smart Auth: Try sign in, if not found or invalid, try to create (unified flow)
        try {
          await signInWithEmail(email, password);
        } catch (signInErr: any) {
          // If the error suggests the user might not exist, try creating the account
          // Note: invalid-credential often covers both user-not-found and wrong-password
          if (signInErr.code === 'auth/user-not-found' || signInErr.code === 'auth/invalid-credential') {
            try {
              await signUpWithEmail(email, password);
            } catch (signUpErr: any) {
              // If signup fails with email-already-in-use, it means the password was actually wrong
              if (signUpErr.code === 'auth/email-already-in-use') {
                setError('Contraseña incorrecta para esta cuenta. Por favor verifica tus datos.');
                return;
              }
              // Otherwise, throw the original sign-in error or the signup error
              throw signUpErr;
            }
          } else {
            throw signInErr;
          }
        }
      }
    } catch (err: any) {
      console.error("Auth Error:", err.code);
      let msg = 'Ocurrió un error inesperado';
      if (err.code === 'auth/user-not-found') msg = 'Usuario no encontrado';
      if (err.code === 'auth/wrong-password') msg = 'Contraseña incorrecta';
      if (err.code === 'auth/invalid-email') msg = 'Email inválido';
      if (err.code === 'auth/email-already-in-use') msg = 'El email ya está registrado';
      if (err.code === 'auth/weak-password') msg = 'La contraseña debe tener al menos 6 caracteres';
      if (err.code === 'auth/invalid-credential') msg = 'Email o contraseña incorrectos.';
      if (err.code === 'auth/operation-not-allowed') msg = 'El inicio de sesión con email no está habilitado en Firebase. Actívalo en la consola.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      await login();
    } catch (err: any) {
      setError('No se pudo iniciar sesión con Google. Intente con email.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f1f5f9] flex items-center justify-center p-4 font-sans">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-[2.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] overflow-hidden flex flex-col"
      >
        <div className="p-10 pt-12 text-center flex-1">
          <div className="w-20 h-20 bg-blue-600 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-blue-200">
            <Wallet className="w-10 h-10 text-white" />
          </div>
          
          <h1 className="text-4xl font-black text-gray-900 tracking-tight mb-2">Prestafácil</h1>
          <p className="text-gray-500 font-medium text-sm leading-relaxed mb-10">
            {isRegistering ? 'Crea tu cuenta de administrador' : 'Inicia sesión para gestionar tus préstamos'}
          </p>

          <AnimatePresence mode="wait">
            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-8 p-4 bg-red-50 border border-red-100 rounded-2xl text-left flex items-start gap-3"
              >
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <p className="text-xs text-red-700 font-bold leading-tight">{error}</p>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleAuth} className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input 
                type="email"
                placeholder="Email corporativo"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-blue-500 transition-all font-bold text-gray-900 outline-none"
              />
            </div>
            
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input 
                type="password"
                placeholder="Contraseña"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-blue-500 transition-all font-bold text-gray-900 outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting || authLoading}
              className="w-full py-5 bg-blue-600 text-white rounded-[1.5rem] font-black text-lg hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 disabled:opacity-50 flex items-center justify-center gap-3 active:scale-95"
            >
              {isSubmitting ? (
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  {isRegistering ? <UserPlus className="w-6 h-6" /> : <LogIn className="w-6 h-6" />}
                  {isRegistering ? 'Crear Cuenta' : 'Ingresar'}
                </>
              )}
            </button>
          </form>

          <div className="mt-8 flex items-center justify-center gap-2">
            <p className="text-gray-400 text-sm font-medium">
              {isRegistering ? '¿Ya tienes cuenta?' : '¿Nuevo en el sistema?'}
            </p>
            <button 
              type="button"
              onClick={() => {
                setIsRegistering(!isRegistering);
                setError(null);
              }}
              className="text-blue-600 font-bold text-sm hover:underline"
            >
              {isRegistering ? 'Inicia Sesión' : 'Regístrate aquí'}
            </button>
          </div>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center text-gray-200">
               <div className="w-full border-t"></div>
            </div>
            <div className="relative flex justify-center text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 bg-white px-4">
              Métodos alternativos
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isSubmitting || authLoading}
              className="flex items-center justify-center gap-2 py-3 bg-gray-50 text-gray-700 rounded-xl font-bold text-xs hover:bg-gray-100 transition-all active:scale-95 disabled:opacity-50"
            >
              <img src="https://www.google.com/favicon.ico" alt="Google" className="w-4 h-4" />
              Google
            </button>
            <button
              type="button"
              onClick={async () => {
                setError(null);
                setIsSubmitting(true);
                try {
                  await loginRedirect();
                } catch (err) {
                  setError('Error al redirigir.');
                } finally {
                  setIsSubmitting(false);
                }
              }}
              className="flex items-center justify-center gap-2 py-3 bg-gray-50 text-gray-700 rounded-xl font-bold text-xs hover:bg-gray-100 transition-all active:scale-95 disabled:opacity-50"
            >
              <Globe className="w-4 h-4" />
              Redirección
            </button>
          </div>
        </div>

        <div className="bg-gray-50 p-6 flex items-center justify-center gap-8 border-t border-gray-100">
           <div className="flex items-center gap-2 opacity-50">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-900">Encriptado AES-256</span>
           </div>
           <div className="flex items-center gap-2 opacity-50">
              <Globe className="w-4 h-4 text-blue-600" />
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-900">Cloud Auth</span>
           </div>
        </div>
      </motion.div>
    </div>
  );
}
