import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { doc, onSnapshot, updateDoc, collection, addDoc, deleteDoc, runTransaction } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Loan, Payment } from '../types';
import { formatCurrency, formatDate, cn } from '../lib/utils';
import { ChevronLeft, Trash2, Printer, CreditCard, History, Plus, AlertTriangle, Calendar, User, Edit } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { syncLoanStatus } from '../lib/finance';
import { differenceInDays } from 'date-fns';

import { query as fbQuery, orderBy as fbOrderBy } from 'firebase/firestore';

export function LoanDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loan, setLoan] = useState<Loan | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentNotes, setPaymentNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!id) return;
    
    const unsubscribeLoan = onSnapshot(doc(db, 'loans', id), (doc) => {
      if (doc.exists()) {
        const l = { id: doc.id, ...doc.data() } as Loan;
        // Sync local view (mora/status)
        setLoan({ ...l, ...syncLoanStatus(l) });
      } else {
        navigate('/loans');
      }
      setLoading(false);
    });

    const q = fbQuery(collection(db, `loans/${id}/payments`), fbOrderBy('date', 'desc'));
    const unsubscribePayments = onSnapshot(q, (snapshot) => {
      const paymentData = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data()
      })) as Payment[];
      setPayments(paymentData);
    });

    return () => {
      unsubscribeLoan();
      unsubscribePayments();
    };
  }, [id, navigate]);

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loan || paymentAmount <= 0) return;
    if (paymentAmount > loan.remainingBalance + (loan.currentMoraCharge || 0)) {
       alert("El abono no puede superar el saldo pendiente.");
       return;
    }

    setIsSubmitting(true);
    try {
      await runTransaction(db, async (transaction) => {
        const loanRef = doc(db, 'loans', id!);
        const loanSnap = await transaction.get(loanRef);
        if (!loanSnap.exists()) return;

        const currentData = loanSnap.data() as Loan;
        const newTotalPaid = currentData.totalPaid + paymentAmount;
        const newRemainingBalance = Math.max(0, currentData.totalToPay - newTotalPaid);
        
        // Update loan status if fully paid
        const newStatus = newRemainingBalance <= 0 ? 'paid' : currentData.status;

        transaction.update(loanRef, {
          totalPaid: newTotalPaid,
          remainingBalance: newRemainingBalance,
          status: newStatus,
          updatedAt: new Date().toISOString()
        });

        const paymentRef = doc(collection(db, `loans/${id}/payments`));
        transaction.set(paymentRef, {
          loanId: id,
          amount: paymentAmount,
          date: new Date().toISOString(),
          notes: paymentNotes
        });
      });

      setPaymentAmount(0);
      setPaymentNotes('');
    } catch (error) {
      console.error("Error al registrar pago:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteLoan = async () => {
    if (!id || !confirm("¿Estás seguro de eliminar este préstamo? Esta acción no se puede deshacer.")) return;
    try {
      await deleteDoc(doc(db, 'loans', id));
      navigate('/loans');
    } catch (error) {
      console.error("Error al eliminar préstamo:", error);
    }
  };

  const handlePrintReceipt = (payment?: Payment) => {
     // Simple print window for receipt
     const content = `
       <html>
         <head>
           <title>Recibo de Pago - Prestafácil</title>
           <style>
             body { font-family: sans-serif; padding: 40px; }
             .receipt { border: 2px solid #000; padding: 20px; max-width: 400px; margin: auto; }
             .header { text-align: center; border-bottom: 1px solid #eee; padding-bottom: 20px; }
             .row { display: flex; justify-content: space-between; margin: 10px 0; }
             .footer { text-align: center; margin-top: 40px; font-size: 12px; }
           </style>
         </head>
         <body>
           <div class="receipt">
             <div class="header">
               <h2>PRESTAFÁCIL</h2>
               <p>Comprobante de Pago</p>
             </div>
             <div class="row"><strong>Fecha:</strong> <span>${payment ? formatDate(payment.date) : formatDate(new Date())}</span></div>
             <div class="row"><strong>Cliente:</strong> <span>${loan?.clientName}</span></div>
             <div class="row"><strong>Valor Pagado:</strong> <span>${formatCurrency(payment?.amount || loan?.totalPaid || 0)}</span></div>
             <div class="row"><strong>Saldo Pendiente:</strong> <span>${formatCurrency(loan?.remainingBalance || 0)}</span></div>
             <div class="footer">Gracias por su cumplimiento.<br>Administrador: Alex B.</div>
           </div>
           <script>window.print();</script>
         </body>
       </html>
     `;
     const win = window.open('', '_blank');
     win?.document.write(content);
     win?.document.close();
  };

  if (loading || !loan) {
    return <div className="flex h-96 items-center justify-center animate-pulse">Cargando...</div>;
  }

  const isOverdue = loan.status === 'overdue';

  return (
    <div className="space-y-8 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/loans')} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <ChevronLeft className="w-6 h-6 text-gray-500" />
          </button>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">{loan.clientName}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className={cn(
                "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                loan.status === 'active' ? 'bg-blue-100 text-blue-700' : 
                loan.status === 'overdue' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
              )}>
                {loan.status === 'active' ? 'Activo' : loan.status === 'overdue' ? 'Vencido' : 'Pagado'}
              </span>
              <span className="text-xs text-gray-400 font-medium">Ref: {loan.id.slice(0, 8)}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Link to={`/loans/${id}/edit`} className="p-3 bg-gray-100 rounded-xl text-gray-600 hover:bg-gray-200 transition-colors">
            <Edit className="w-5 h-5" />
          </Link>
          <button onClick={handleDeleteLoan} className="p-3 bg-red-50 rounded-xl text-red-600 hover:bg-red-100 transition-colors">
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Loan Info Cards */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
             <InfoCard label="Capital" value={formatCurrency(loan.principal)} sub={`Interés ${loan.interestRate}%`} />
             <InfoCard label="Total a Pagar" value={formatCurrency(loan.totalToPay)} sub={isOverdue ? "Más mora" : "Meta final"} highlight />
             <InfoCard label="Pagado" value={formatCurrency(loan.totalPaid)} sub={`${Math.round((loan.totalPaid / loan.totalToPay) * 100)}% Completado`} success />
          </div>

          {/* Dates & Status */}
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-8 items-center justify-between">
             <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center">
                   <Calendar className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Fecha Vencimiento</p>
                  <p className="font-bold text-gray-900">{formatDate(loan.dueDate)}</p>
                </div>
             </div>
             
             {isOverdue && (
               <motion.div 
                 animate={{ scale: [1, 1.05, 1] }} 
                 transition={{ repeat: Infinity, duration: 2 }}
                 className="flex items-center gap-3 bg-red-50 px-6 py-3 rounded-2xl border border-red-100"
               >
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  <div>
                    <p className="text-[10px] text-red-700 font-bold uppercase tracking-tighter">Mora Acumulada</p>
                    <p className="text-sm font-bold text-red-900">{formatCurrency(loan.currentMoraCharge || 0)}</p>
                  </div>
               </motion.div>
             )}

             <div className="flex flex-col items-end">
                <p className="text-xs text-gray-400 font-bold uppercase tracking-wider text-right">Saldo Actual</p>
                <p className="text-3xl font-black text-blue-900">{formatCurrency(loan.remainingBalance + (loan.currentMoraCharge || 0))}</p>
             </div>
          </div>

          {/* Payment History */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
             <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <div className="flex items-center gap-2">
                   <History className="w-5 h-5 text-gray-400" />
                   <h3 className="font-bold">Historial de Abonos</h3>
                </div>
                <span className="bg-gray-200 text-gray-600 px-3 py-1 rounded-full text-[10px] font-bold">{payments.length} Registros</span>
             </div>
             <table className="w-full text-left">
                <tbody>
                   <AnimatePresence>
                     {payments.map((p, idx) => (
                       <motion.tr 
                         initial={{ opacity: 0, x: -10 }} 
                         animate={{ opacity: 1, x: 0 }} 
                         transition={{ delay: idx * 0.05 }}
                         key={p.id} 
                         className="border-b border-gray-50 hover:bg-gray-50/80 transition-colors"
                       >
                          <td className="px-8 py-4">
                            <p className="font-bold text-gray-900">{formatCurrency(p.amount)}</p>
                            <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">{p.notes || 'Abono reglamentario'}</p>
                          </td>
                          <td className="px-8 py-4 text-right">
                            <p className="text-xs font-bold text-gray-500">{formatDate(p.date)}</p>
                            <button 
                              onClick={() => handlePrintReceipt(p)}
                              className="text-[10px] font-bold text-blue-600 uppercase tracking-widest hover:underline mt-1"
                            >
                               Imprimir Recibo
                            </button>
                          </td>
                       </motion.tr>
                     ))}
                   </AnimatePresence>
                   {payments.length === 0 && (
                     <tr>
                        <td className="px-8 py-12 text-center text-gray-400 italic">No hay abonos registrados para este préstamo.</td>
                     </tr>
                   )}
                </tbody>
             </table>
          </div>
        </div>

        {/* Action Panel - New Payment */}
        <div className="lg:col-span-1 space-y-6">
          <div className={cn(
             "p-8 rounded-3xl border shadow-xl transition-all",
             loan.status === 'paid' ? 'bg-green-50 border-green-100 grayscale' : 'bg-white border-gray-100'
          )}>
            <div className="flex items-center gap-3 mb-6">
               <CreditCard className="w-6 h-6 text-blue-600" />
               <h3 className="text-lg font-bold">Registrar Abono</h3>
            </div>
            
            <form onSubmit={handleAddPayment} className="space-y-6">
               <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Monto del Abono</label>
                  <div className="relative">
                     <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-gray-400 font-mono">$</span>
                     <input 
                       disabled={loan.status === 'paid'}
                       type="number"
                       placeholder="0"
                       value={paymentAmount || ''}
                       onChange={e => setPaymentAmount(Number(e.target.value))}
                       className="w-full bg-gray-50 border-none rounded-2xl py-4 pl-9 pr-4 focus:ring-2 focus:ring-blue-500 font-black text-xl"
                       max={loan.remainingBalance + (loan.currentMoraCharge || 0)}
                     />
                  </div>
               </div>
               
               <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Notas (Opcional)</label>
                  <textarea 
                    disabled={loan.status === 'paid'}
                    rows={3}
                    placeholder="Eje: Pago semana 2"
                    value={paymentNotes}
                    onChange={e => setPaymentNotes(e.target.value)}
                    className="w-full bg-gray-50 border-none rounded-2xl p-4 focus:ring-2 focus:ring-blue-500 text-sm font-medium"
                  />
               </div>

               <button 
                 disabled={isSubmitting || loan.status === 'paid'}
                 className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-lg hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 disabled:bg-gray-300 disabled:shadow-none flex items-center justify-center gap-2"
               >
                  {isSubmitting ? 'Procesando...' : (
                    <>
                       <Plus className="w-5 h-5" />
                       Aplicar Abono
                    </>
                  )}
               </button>
            </form>

            <div className="mt-8 pt-8 border-t border-gray-100">
               <button 
                 onClick={() => handlePrintReceipt()}
                 className="w-full py-3 bg-gray-50 text-gray-600 rounded-xl font-bold text-sm hover:bg-gray-100 flex items-center justify-center gap-2"
               >
                  <Printer className="w-4 h-4" />
                  Imprimir Comprobante Actual
               </button>
            </div>
          </div>

          <div className="bg-gray-900 rounded-3xl p-6 text-white overflow-hidden relative">
             <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400">Guía del Cobrador</p>
             <h4 className="text-xl font-bold mt-2">Días Transcurridos</h4>
             <p className="text-4xl font-black mt-4 ml-1">
               {Math.max(0, differenceInDays(new Date(), new Date(loan.startDate)))}
               <span className="text-lg font-light ml-2 text-gray-400">días</span>
             </p>
             <div className="mt-6 flex gap-2">
                <span className="px-2 py-1 bg-white/10 rounded-lg text-[10px] font-bold">Iniciado: {new Date(loan.startDate).toLocaleDateString()}</span>
             </div>
             <div className="absolute top-0 right-0 p-4 opacity-10">
                <User className="w-24 h-24" />
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoCard({ label, value, sub, highlight, success }: { label: string, value: string, sub: string, highlight?: boolean, success?: boolean }) {
  return (
    <div className={cn(
      "p-6 rounded-3xl border border-gray-100 shadow-sm transition-all",
      highlight ? "bg-blue-600 text-white border-blue-700 shadow-blue-100" : "bg-white",
      success && !highlight ? "bg-green-50" : ""
    )}>
      <p className={cn("text-[10px] font-black uppercase tracking-widest", highlight ? "text-blue-100" : "text-gray-400")}>{label}</p>
      <p className={cn("text-xl font-black mt-1", highlight ? "text-white" : "text-gray-900")}>{value}</p>
      <p className={cn("text-xs mt-1 font-medium", highlight ? "text-blue-200" : (success ? "text-green-600" : "text-gray-500"))}>{sub}</p>
    </div>
  );
}
