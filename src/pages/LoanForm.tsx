import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { doc, getDoc, setDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Loan, AppConfig, MoraConfig } from '../types';
import { calculateTotalToPay } from '../lib/finance';
import { ChevronLeft, Save, Info, Calendar } from 'lucide-react';
import { addDays, format } from 'date-fns';

const DEFAULT_CONFIG: AppConfig = {
  availableRates: [6, 10, 20],
  defaultMora: { type: 'daily', value: 5000 },
  defaultLoanDays: 30
};

export function LoanForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(!!id);
  
  const [formData, setFormData] = useState({
    clientName: '',
    principal: 0,
    interestRate: 10,
    startDate: format(new Date(), 'yyyy-MM-dd'),
    dueDate: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
    moraType: 'daily' as 'fixed' | 'daily',
    moraValue: 5000,
  });

  useEffect(() => {
    async function loadData() {
      // Load config
      const configDoc = await getDoc(doc(db, 'config', 'settings'));
      if (configDoc.exists()) {
        setConfig(configDoc.data() as AppConfig);
        setFormData(prev => ({
          ...prev,
          interestRate: configDoc.data().availableRates[1] || 10,
          moraValue: configDoc.data().defaultMora.value,
          moraType: configDoc.data().defaultMora.type,
          dueDate: format(addDays(new Date(), configDoc.data().defaultLoanDays), 'yyyy-MM-dd')
        }));
      }

      // Load loan if editing
      if (id) {
        const loanDoc = await getDoc(doc(db, 'loans', id));
        if (loanDoc.exists()) {
          const l = loanDoc.data() as Loan;
          setFormData({
            clientName: l.clientName,
            principal: l.principal,
            interestRate: l.interestRate,
            startDate: l.startDate.split('T')[0],
            dueDate: l.dueDate.split('T')[0],
            moraType: l.moraConfig.type,
            moraValue: l.moraConfig.value,
          });
        }
        setLoading(false);
      }
    }
    loadData();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.clientName || formData.principal <= 0) return;

    const totalToPay = calculateTotalToPay(formData.principal, formData.interestRate);
    
    const loanData: any = {
      clientName: formData.clientName,
      principal: Number(formData.principal),
      interestRate: Number(formData.interestRate),
      startDate: new Date(formData.startDate).toISOString(),
      dueDate: new Date(formData.dueDate).toISOString(),
      totalToPay,
      remainingBalance: totalToPay,
      totalPaid: 0,
      status: 'active',
      moraConfig: {
        type: formData.moraType,
        value: Number(formData.moraValue)
      },
      updatedAt: new Date().toISOString(),
    };

    try {
      if (id) {
        await setDoc(doc(db, 'loans', id), { ...loanData }, { merge: true });
      } else {
        loanData.createdAt = new Date().toISOString();
        await addDoc(collection(db, 'loans'), loanData);
      }
      navigate('/loans');
    } catch (error) {
      console.error('Error saving loan:', error);
    }
  };

  const totalCalculated = calculateTotalToPay(formData.principal, formData.interestRate);

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
          <ChevronLeft className="w-6 h-6 text-gray-500" />
        </button>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{id ? 'Editar' : 'Nuevo'} Préstamo</h2>
          <p className="text-gray-500 mt-1">Completa la información para registrar el crédito.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-8">
        {/* Client Info */}
        <div className="space-y-4">
          <label className="block text-sm font-bold text-gray-700 uppercase tracking-widest">Información del Cliente</label>
          <input 
            required
            type="text"
            placeholder="Nombre completo del cliente"
            value={formData.clientName}
            onChange={e => setFormData({ ...formData, clientName: e.target.value })}
            className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 transition-all font-medium"
          />
        </div>

        {/* Financial Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <label className="block text-sm font-bold text-gray-700 uppercase tracking-widest">Capital a Prestar</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-gray-400">$</span>
              <input 
                required
                type="number"
                placeholder="0"
                value={formData.principal || ''}
                onChange={e => setFormData({ ...formData, principal: Number(e.target.value) })}
                className="w-full pl-9 pr-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 font-bold"
              />
            </div>
          </div>
          <div className="space-y-4">
            <label className="block text-sm font-bold text-gray-700 uppercase tracking-widest">Tasa de Interés (%)</label>
            <div className="flex gap-2">
              {config.availableRates.map(rate => (
                <button
                  key={rate}
                  type="button"
                  onClick={() => setFormData({ ...formData, interestRate: rate })}
                  className={`flex-1 py-3 rounded-2xl font-bold transition-all ${
                    formData.interestRate === rate 
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' 
                      : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  {rate}%
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <label className="block text-sm font-bold text-gray-700 uppercase tracking-widest">Fecha de Inicio</label>
            <div className="relative">
              <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                required
                type="date"
                value={formData.startDate}
                onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 font-medium"
              />
            </div>
          </div>
          <div className="space-y-4">
            <label className="block text-sm font-bold text-gray-700 uppercase tracking-widest">Fecha de Pago</label>
            <div className="relative">
              <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                required
                type="date"
                value={formData.dueDate}
                onChange={e => setFormData({ ...formData, dueDate: e.target.value })}
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 font-medium"
              />
            </div>
          </div>
        </div>

        {/* Mora Config */}
        <div className="p-6 bg-amber-50 rounded-3xl space-y-4 border border-amber-100">
           <div className="flex items-center gap-2">
              <Info className="w-5 h-5 text-amber-600" />
              <span className="font-bold text-amber-900 text-sm uppercase tracking-wider">Configuración de Mora</span>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <select 
                value={formData.moraType}
                onChange={e => setFormData({ ...formData, moraType: e.target.value as any })}
                className="w-full bg-white border-none rounded-xl py-2 px-3 text-sm focus:ring-2 focus:ring-amber-500"
              >
                <option value="fixed">Multa Fija Única</option>
                <option value="daily">Multa Diaria por Vencimiento</option>
              </select>
              <input 
                type="number"
                placeholder="Valor multa"
                value={formData.moraValue || ''}
                onChange={e => setFormData({ ...formData, moraValue: Number(e.target.value) })}
                className="w-full bg-white border-none rounded-xl py-2 px-3 text-sm focus:ring-2 focus:ring-amber-500 font-bold"
              />
           </div>
        </div>

        {/* Summary Footer */}
        <div className="pt-8 border-t border-gray-100 flex items-center justify-between">
           <div>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Total proyectado</p>
              <p className="text-2xl font-black text-blue-900">
                {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(totalCalculated)}
              </p>
           </div>
           <button 
             type="submit"
             className="px-10 py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-xl shadow-blue-200 flex items-center gap-2"
           >
              <Save className="w-5 h-5" />
              Guardar Préstamo
           </button>
        </div>
      </form>
    </div>
  );
}
