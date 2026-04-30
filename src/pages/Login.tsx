import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Wallet, AlertCircle, ShieldCheck, Globe } from 'lucide-react';
import { motion } from 'motion/react';

export function Login() {
  const { user, login, loginRedirect, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [errorInfo, setErrorInfo] = useState<{ code: string; message: string } | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    if (user) {
      navigate('/', { replace: true });
    }
  }, [user, navigate]);

  const handleLogin = async (useRedirect = false) => {
    setErrorInfo(null);
    setIsLoggingIn(true);
    try {
      if (useRedirect) {
        await loginRedirect();
      } else {
        await login();
      }
    } catch (err: any) {
      console.error("Login Error:", err.code, err.message);
      setErrorInfo({
        code: err.code || 'unknown',
        message: err.message || 'Error inesperado'
      });
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-white md:bg-[#f8faff] flex flex-col items-center justify-center p-6 font-sans">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-white rounded-[3rem] p-10 md:shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-gray-100 text-center"
      >
        <div className="w-20 h-20 bg-blue-600 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-xl shadow-blue-200">
          <Wallet className="w-10 h-10 text-white" />
        </div>
        
        <h1 className="text-4xl font-black text-gray-900 tracking-tight mb-2">Prestafácil</h1>
        <p className="text-gray-500 font-medium text-sm leading-relaxed">
          Bienvenido al sistema inteligente de gestión de cartera y préstamos.
        </p>

        {errorInfo && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 p-5 bg-red-50 border border-red-100 rounded-3xl text-left"
          >
            <div className="flex items-center gap-3 text-red-700 font-bold text-sm">
               <AlertCircle className="w-5 h-5 shrink-0" />
               Error de Acceso
            </div>
            <p className="text-[11px] text-red-600 mt-2 font-medium leading-relaxed">
              CÓDIGO: <span className="font-mono bg-white px-1 rounded">{errorInfo.code}</span>
              <br />
              {errorInfo.code === 'auth/popup-closed-by-user' 
                ? 'La ventana se cerró antes de terminar. ¿Prefieres usar redirección?' 
                : errorInfo.code === 'auth/unauthorized-domain'
                ? `Este dominio (${window.location.hostname}) no está autorizado en Firebase. Agrégalo en la consola de Firebase > Authentication > Settings > Authorized domains.`
                : 'Inténtalo de nuevo o usa el método alternativo.'}
            </p>
          </motion.div>
        )}

        <div className="mt-10 space-y-3">
          <button
            onClick={() => handleLogin(false)}
            disabled={isLoggingIn || authLoading}
            className="w-full flex items-center justify-center gap-3 py-5 bg-gray-900 text-white rounded-3xl font-bold text-lg hover:bg-black transition-all shadow-xl shadow-gray-200 group disabled:opacity-50"
          >
            {isLoggingIn ? (
              <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <img src="https://www.google.com/favicon.ico" alt="Google" className="w-6 h-6 bg-white p-0.5 rounded shadow-sm" />
                Continuar con Google
              </>
            )}
          </button>

          {errorInfo && (
            <button
              onClick={() => handleLogin(true)}
              className="w-full py-4 text-blue-600 font-bold text-sm bg-blue-50 rounded-2xl hover:bg-blue-100 transition-colors flex items-center justify-center gap-2"
            >
              <Globe className="w-4 h-4" />
              Usar método de redirección
            </button>
          )}
          
          <div className="pt-8 flex items-center justify-center gap-6 opacity-30">
             <div className="flex items-center gap-1">
                <ShieldCheck className="w-4 h-4" />
                <span className="text-[9px] font-black uppercase tracking-widest">Seguro</span>
             </div>
             <div className="flex items-center gap-1">
                <Globe className="w-4 h-4" />
                <span className="text-[9px] font-black uppercase tracking-widest">En la Nube</span>
             </div>
          </div>
        </div>
      </motion.div>

      <footer className="mt-12 text-center">
         <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.3em]">
           Fintech Solutions &copy; 2026
         </p>
      </footer>
    </div>
  );
}
