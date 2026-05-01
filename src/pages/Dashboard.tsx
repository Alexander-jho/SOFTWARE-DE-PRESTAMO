import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { Loan } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { ArrowUpRight, ArrowDownRight, Users, Activity, Clock, CheckCircle, FileText, Download } from 'lucide-react';
import { motion } from 'motion/react';
import { syncLoanStatus } from '../lib/finance';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import { useAuth } from '../context/AuthContext';

export function Dashboard() {
  const { user } = useAuth();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'loans'),
      where('ownerId', '==', user.uid)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loanData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Loan[];
      
      // Update statuses and mora locally for the view if needed
      const updatedLoans = loanData.map(l => ({
        ...l,
        ...syncLoanStatus(l)
      }));

      setLoans(updatedLoans);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const stats = {
    totalLent: loans.reduce((acc, l) => acc + l.principal, 0),
    totalRecovered: loans.reduce((acc, l) => acc + l.totalPaid, 0),
    activeLoans: loans.filter(l => l.status === 'active').length,
    overdueLoans: loans.filter(l => l.status === 'overdue').length,
    totalProfit: loans.reduce((acc, l) => acc + (l.totalToPay - l.principal), 0),
    expectedTotal: loans.reduce((acc, l) => acc + l.totalToPay, 0),
  };

  const generateReport = () => {
    const doc = new jsPDF();
    const now = new Date().toLocaleString();

    // Header
    doc.setFontSize(22);
    doc.text('Reporte Financiero Consolidado', 14, 20);
    doc.setFontSize(10);
    doc.text(`Generado: ${now}`, 14, 28);
    doc.text(`Administrador: ${user?.email}`, 14, 33);

    // Summary Table
    autoTable(doc, {
      startY: 40,
      head: [['Concepto', 'Monto']],
      body: [
        ['Total Prestado', formatCurrency(stats.totalLent)],
        ['Total Recuperado', formatCurrency(stats.totalRecovered)],
        ['Ganancias Estimadas', formatCurrency(stats.totalProfit)],
        ['Saldo Pendiente', formatCurrency(stats.expectedTotal - stats.totalRecovered)],
        ['Préstamos Activos', stats.activeLoans.toString()],
        ['Préstamos Vencidos', stats.overdueLoans.toString()],
      ],
      theme: 'striped',
      headStyles: { fillColor: [37, 99, 235] }
    });

    // Loans List
    doc.setFontSize(16);
    doc.text('Detalle de Préstamos Activos y Vencidos', 14, (doc as any).lastAutoTable.finalY + 15);

    const loanRows = loans
      .filter(l => l.status !== 'paid')
      .map(l => [
        l.clientName,
        formatCurrency(l.principal),
        formatCurrency(l.remainingBalance),
        l.status === 'overdue' ? 'Vencido' : 'Activo',
        new Date(l.dueDate).toLocaleDateString()
      ]);

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 20,
      head: [['Cliente', 'Principal', 'Saldo Pendiente', 'Estado', 'Vencimiento']],
      body: loanRows,
      theme: 'grid',
      headStyles: { fillColor: [100, 116, 139] }
    });

    doc.save(`reporte-financiero-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const cards = [
    { label: 'Total Prestado', value: stats.totalLent, icon: ArrowUpRight, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Total Recuperado', value: stats.totalRecovered, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Ganancias Estimadas', value: stats.totalProfit, icon: Activity, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Saldo Pendiente', value: stats.expectedTotal - stats.totalRecovered, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard Financiero</h2>
          <p className="text-gray-500 mt-1">Resumen del estado actual de tus préstamos.</p>
        </div>
        <button
          onClick={generateReport}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-2xl font-bold hover:bg-gray-800 transition-all active:scale-95 shadow-lg shadow-gray-200"
        >
          <FileText className="w-5 h-5" />
          Generar Reporte PDF
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card, idx) => (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            key={card.label}
            className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={cn("p-3 rounded-2xl", card.bg)}>
                <card.icon className={cn("w-6 h-6", card.color)} />
              </div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Histórico</span>
            </div>
            <p className="text-sm font-medium text-gray-500">{card.label}</p>
            <p className="text-2xl font-bold mt-1">{formatCurrency(card.value)}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Status Breakdown */}
        <div className="lg:col-span-1 bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
           <h3 className="text-lg font-bold mb-6">Estado de Préstamos</h3>
           <div className="space-y-6">
              <StatusItem label="Activos" count={stats.activeLoans} total={loans.length} color="bg-blue-500" />
              <StatusItem label="Vencidos" count={stats.overdueLoans} total={loans.length} color="bg-red-500" />
              <StatusItem label="Pagados" count={loans.filter(l => l.status === 'paid').length} total={loans.length} color="bg-green-500" />
           </div>
        </div>

        {/* Recent Alerts */}
        <div className="lg:col-span-2 bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
           <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold">Alertas Críticas</h3>
              <span className="px-3 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full uppercase tracking-wider">Requiere Atención</span>
           </div>
           
           <div className="space-y-4">
              {loans.filter(l => l.status === 'overdue').slice(0, 5).map(loan => (
                <div key={loan.id} className="flex items-center justify-between p-4 rounded-2xl bg-red-50 border border-red-100">
                   <div className="flex items-center gap-4">
                      <div className="p-2 bg-white rounded-xl shadow-sm">
                         <AlertCircle className="w-5 h-5 text-red-600" />
                      </div>
                      <div>
                         <p className="font-bold text-red-900">{loan.clientName}</p>
                         <p className="text-xs text-red-700">Vencimiento: {new Date(loan.dueDate).toLocaleDateString()}</p>
                      </div>
                   </div>
                   <div className="text-right">
                      <p className="font-bold text-red-900">{formatCurrency(loan.remainingBalance)}</p>
                      <button className="text-[10px] font-bold uppercase text-red-600 hover:underline">Ver Detalle</button>
                   </div>
                </div>
              ))}
              {loans.filter(l => l.status === 'overdue').length === 0 && (
                <p className="text-center text-gray-400 py-12 italic">No hay préstamos vencidos hoy.</p>
              )}
           </div>
        </div>
      </div>
    </div>
  );
}

function StatusItem({ label, count, total, color }: { label: string, count: number, total: number, color: string }) {
  const percentage = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="font-medium text-gray-600">{label}</span>
        <span className="font-bold">{count}</span>
      </div>
      <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          className={cn("h-full", color)} 
        />
      </div>
    </div>
  );
}

function AlertCircle({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}
