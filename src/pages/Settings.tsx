import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { AppConfig, MoraConfig } from '../types';
import { Save, AlertCircle, Plus, Trash2 } from 'lucide-react';

const DEFAULT_CONFIG: AppConfig = {
  availableRates: [6, 10, 20],
  defaultMora: { type: 'daily', value: 5000 },
  defaultLoanDays: 30
};

export function Settings() {
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [newRate, setNewRate] = useState('');

  useEffect(() => {
    async function loadConfig() {
      const docSnap = await getDoc(doc(db, 'config', 'settings'));
      if (docSnap.exists()) {
        setConfig(docSnap.data() as AppConfig);
      }
      setLoading(false);
    }
    loadConfig();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await setDoc(doc(db, 'config', 'settings'), config);
      alert("Configuración guardada correctamente");
    } catch (error) {
      console.error("Error saving config:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const addRate = () => {
    if (!newRate || isNaN(Number(newRate))) return;
    const rate = Number(newRate);
    if (!config.availableRates.includes(rate)) {
      setConfig({ ...config, availableRates: [...config.availableRates, rate].sort((a,b) => a-b) });
      setNewRate('');
    }
  };

  const removeRate = (rate: number) => {
    setConfig({ ...config, availableRates: config.availableRates.filter(r => r !== rate) });
  };

  if (loading) return <div className="h-96 flex items-center justify-center">Cargando configuración...</div>;

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Configuración</h2>
        <p className="text-gray-500 mt-1">Personaliza las reglas de negocio y parámetros financieros.</p>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-8 space-y-8">
          
          {/* Interest Rates */}
          <section className="space-y-4">
             <div className="flex items-center justify-between">
                <div>
                   <h3 className="font-bold text-gray-900">Tasas de Interés Disponibles</h3>
                   <p className="text-sm text-gray-500">Estas aparecerán al crear nuevos préstamos.</p>
                </div>
             </div>
             <div className="flex flex-wrap gap-2 pt-2">
                {config.availableRates.map(rate => (
                  <div key={rate} className="flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-xl font-bold">
                     {rate}%
                     <button onClick={() => removeRate(rate)} className="hover:text-red-600 transition-colors">
                        <Trash2 className="w-4 h-4" />
                     </button>
                  </div>
                ))}
                <div className="flex items-center gap-2 bg-gray-50 border border-dashed border-gray-300 rounded-xl px-2">
                   <input 
                     type="number"
                     placeholder="Nuevo %"
                     value={newRate}
                     onChange={e => setNewRate(e.target.value)}
                     className="w-20 bg-transparent border-none text-sm font-bold focus:ring-0"
                   />
                   <button onClick={addRate} className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors">
                      <Plus className="w-4 h-4" />
                   </button>
                </div>
             </div>
          </section>

          <hr className="border-gray-100" />

          {/* Mora Settings */}
          <section className="space-y-4">
             <h3 className="font-bold text-gray-900">Reglas de Mora por Defecto</h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                <div className="space-y-2">
                   <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Tipo de Mora</label>
                   <select 
                     value={config.defaultMora.type}
                     onChange={e => setConfig({ ...config, defaultMora: { ...config.defaultMora, type: e.target.value as any }})}
                     className="w-full bg-gray-50 border-none rounded-xl py-3 px-4 focus:ring-2 focus:ring-blue-500 font-medium"
                   >
                      <option value="fixed">Multa Fija</option>
                      <option value="daily">Recargo Diario</option>
                   </select>
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Valor ($)</label>
                   <input 
                     type="number"
                     value={config.defaultMora.value}
                     onChange={e => setConfig({ ...config, defaultMora: { ...config.defaultMora, value: Number(e.target.value) }})}
                     className="w-full bg-gray-50 border-none rounded-xl py-3 px-4 focus:ring-2 focus:ring-blue-500 font-bold"
                   />
                </div>
             </div>
          </section>

          <hr className="border-gray-100" />

          {/* Loan Defaults */}
          <section className="space-y-4">
             <h3 className="font-bold text-gray-900">Parámetros de Préstamo</h3>
             <div className="space-y-2 pt-2">
                <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Plazo por Defecto (Días)</label>
                <input 
                  type="number"
                  value={config.defaultLoanDays}
                  onChange={e => setConfig({ ...config, defaultLoanDays: Number(e.target.value) })}
                  className="w-full bg-gray-50 border-none rounded-xl py-3 px-4 focus:ring-2 focus:ring-blue-500 font-bold max-w-[200px]"
                />
             </div>
          </section>

        </div>

        <div className="bg-gray-50 px-8 py-6 border-t border-gray-100 flex items-center justify-between">
           <div className="flex items-center gap-2 text-amber-600">
              <AlertCircle className="w-5 h-5" />
              <span className="text-xs font-bold uppercase tracking-wider">Cambios globales</span>
           </div>
           <button 
             onClick={handleSave}
             disabled={isSaving}
             className="px-8 py-3 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 flex items-center gap-2 disabled:bg-gray-400"
           >
              <Save className="w-5 h-5" />
              {isSaving ? 'Guardando...' : 'Guardar Todo'}
           </button>
        </div>
      </div>
    </div>
  );
}
