import { useAuth } from '../context/AuthContext';
import { Wallet, LogIn } from 'lucide-react';
import { motion } from 'motion/react';

export function Login() {
  const { login, loading } = useAuth();

  return (
    <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-[2.5rem] p-10 shadow-xl border border-gray-100 text-center"
      >
        <div className="w-20 h-20 bg-blue-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
          <Wallet className="w-10 h-10 text-blue-600" />
        </div>
        
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Prestafácil</h1>
        <p className="text-gray-500 mt-2 font-medium">Gestión profesional para prestamistas independientes.</p>

        <div className="mt-10 space-y-4">
          <button
            onClick={login}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-4 bg-blue-600 text-white rounded-2xl font-bold text-lg hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 group"
          >
            <div className="bg-white p-1 rounded-lg">
               <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
            </div>
            Entrar con Google
          </button>
          
          <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest leading-relaxed">
            Al ingresar, aceptas los términos de gestión interna y seguridad de datos.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
