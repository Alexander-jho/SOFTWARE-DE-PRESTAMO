import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, orderBy, where } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { Loan, LoanStatus } from '../types';
import { formatCurrency, formatDate, cn } from '../lib/utils';
import { Search, Filter, ChevronRight, Plus, Download } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';

import { useAuth } from '../context/AuthContext';

const STATUS_LABELS: Record<LoanStatus, { label: string, color: string, bg: string }> = {
  active: { label: 'Activo', color: 'text-blue-700', bg: 'bg-blue-100' },
  overdue: { label: 'Vencido', color: 'text-red-700', bg: 'bg-red-100' },
  paid: { label: 'Pagado', color: 'text-green-700', bg: 'bg-green-100' },
};

export function LoanList() {
  const { user } = useAuth();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<LoanStatus | 'all'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'loans'), 
      where('ownerId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loanData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Loan[];
      setLoans(loanData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const filteredLoans = loans.filter(l => {
    const matchesSearch = l.clientName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || l.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const exportToCSV = () => {
    const headers = ['Cliente', 'Capital', 'Interés %', 'Total a Pagar', 'Pagado', 'Saldo', 'Estado', 'Fecha Inicio', 'Fecha Vencimiento'];
    const rows = filteredLoans.map(l => [
      l.clientName,
      l.principal,
      l.interestRate,
      l.totalToPay,
      l.totalPaid,
      l.remainingBalance,
      l.status,
      l.startDate,
      l.dueDate
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n"
      + rows.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `prestamos_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Préstamos</h2>
          <p className="text-gray-500 mt-1">Listado histórico y seguimiento de clientes.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={exportToCSV}
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl bg-white text-gray-700 font-bold text-sm hover:bg-gray-50 transition-colors"
          >
            <Download className="w-4 h-4" />
            Exportar
          </button>
          <Link 
            to="/loans/new"
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
          >
            <Plus className="w-4 h-4" />
            Nuevo Préstamo
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="text"
            placeholder="Buscar por cliente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500 py-2 pl-3 pr-8"
          >
            <option value="all">Todos los estados</option>
            <option value="active">Activos</option>
            <option value="overdue">Vencidos</option>
            <option value="paid">Pagados</option>
          </select>
        </div>
      </div>

      {/* List */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Cliente</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Monto</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Vencimiento</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Saldo</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-center">Estado</th>
                <th className="px-6 py-4 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <AnimatePresence mode='popLayout'>
                {filteredLoans.map((loan) => (
                  <motion.tr 
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    key={loan.id} 
                    className="hover:bg-gray-50 transition-colors group cursor-pointer"
                    onClick={() => window.location.href = `/loans/${loan.id}`}
                  >
                    <td className="px-6 py-4">
                      <p className="font-bold text-gray-900">{loan.clientName}</p>
                      <p className="text-xs text-gray-500 font-medium">Ref: {loan.id.slice(0, 8)}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-gray-900">{formatCurrency(loan.principal)}</p>
                      <p className="text-xs text-gray-400 font-medium">+{loan.interestRate}% interés</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-gray-700">{formatDate(loan.dueDate)}</p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p className="font-bold text-gray-900">{formatCurrency(loan.remainingBalance)}</p>
                      <p className="text-[10px] uppercase font-bold text-gray-400 tracking-tighter">Pendiente</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center">
                        <span className={cn(
                          "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest",
                          STATUS_LABELS[loan.status].bg,
                          STATUS_LABELS[loan.status].color
                        )}>
                          {STATUS_LABELS[loan.status].label}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-blue-500 transition-colors" />
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
              {filteredLoans.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center text-gray-400 italic">
                    No se encontraron préstamos para mostrar.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
