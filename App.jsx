import React, { useState, useEffect } from 'react';
import ShipmentAllocation from './ShipmentAllocation';
import Dashboard from './Dashboard';
import Investors from './Investors';
import { collection, onSnapshot, doc, setDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { db } from './firebase';

function App() {
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [investors, setInvestors] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  // --- HELPER: Safely resolve JS floating point errors ---
  const safeFloat = (num) => Math.round(parseFloat(num) * 100) / 100;

  useEffect(() => {
    const unsubInvestors = onSnapshot(collection(db, 'investors'), (snapshot) => {
      setInvestors(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
    }, (error) => {
      console.error("Firebase Read Error (Investors):", error);
      alert("Sync Error (Investors): " + error.message);
    });
    const unsubTransactions = onSnapshot(collection(db, 'transactions'), (snapshot) => {
      setTransactions(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
    }, (error) => {
      console.error("Firebase Read Error (Transactions):", error);
      alert("Sync Error (Transactions): " + error.message);
    });
    const unsubAudit = onSnapshot(collection(db, 'auditLogs'), (snapshot) => {
      setAuditLogs(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })).sort((a,b) => new Date(b.date) - new Date(a.date)));
    }, (error) => {
      console.error("Firebase Read Error (Audit):", error);
    });

    setIsDataLoaded(true);
    return () => { unsubInvestors(); unsubTransactions(); unsubAudit(); };
  }, []);

  const logAudit = async (action, details, oldValue, newValue) => {
    try {
      const id = Date.now().toString();
      const logEntry = { id, date: new Date().toISOString(), user: 'Admin', action, details, oldValue, newValue };
      await setDoc(doc(db, 'auditLogs', id), logEntry);
    } catch (error) {
      console.error("Failed to save audit log:", error);
    }
  };

  const reverseTransactionEffects = (txToReverse, currentInvestors) => {
    return currentInvestors.map(inv => {
      const alloc = txToReverse.allocations.find(a => a.investorId === inv.id);
      if (alloc) {
        const profit = safeFloat(alloc.profitEarned);
        const paid = safeFloat(alloc.paidAmount !== undefined ? alloc.paidAmount : alloc.profitEarned); // Fallback to profitEarned for old data
        const pendingDiff = safeFloat(profit - paid); // The pending amount created by this transaction
        if (inv.activeBalance - paid < 0) throw new Error(`Reversal failed: Reversing ${txToReverse.saleId} would result in a negative balance for ${inv.name}.`);
        return {
          ...inv,
          totalProfit: safeFloat(inv.totalProfit - profit),
          activeBalance: safeFloat(inv.activeBalance - paid),
          pendingProfit: safeFloat((inv.pendingProfit || 0) - pendingDiff),
          ledger: [{ id: Date.now().toString() + inv.id, type: 'PROFIT_REVERSED', amount: -paid, date: new Date().toISOString(), description: `Reversed allocation from deleted/edited Sale ID: ${txToReverse.saleId}` }, ...(inv.ledger || [])]
        };
      }
      return inv;
    });
  };

  const handleSaveTransaction = async (transactionPayload, isEdit = false, originalId = null) => {
    try {
      let workingInvestors = [...investors];
      let oldTx = null;

      if (isEdit) {
        oldTx = transactions.find(t => t.id === originalId || t.saleId === originalId);
        workingInvestors = reverseTransactionEffects(oldTx, workingInvestors);
      }

      // Apply new transaction effects
      const finalInvestors = workingInvestors.map(inv => {
        const allocation = transactionPayload.allocations.find(a => a.investorId === inv.id);
        if (allocation) {
          const profit = safeFloat(allocation.profitEarned);
          const paid = safeFloat(allocation.paidAmount !== undefined ? allocation.paidAmount : allocation.profitEarned);
          const previousPending = safeFloat(allocation.previousPending || 0);
          const newPending = safeFloat(allocation.pendingAmount || 0);
          return {
            ...inv,
            totalProfit: safeFloat(inv.totalProfit + profit),
            activeBalance: safeFloat(inv.activeBalance + paid),
            pendingProfit: safeFloat((inv.pendingProfit || 0) + (profit - paid)),
            ledger: [{ id: Date.now().toString() + inv.id, type: 'PROFIT_EARNED', amount: paid, date: new Date().toISOString(), description: `Sale ID: ${transactionPayload.saleId} | Profit: ₹${profit} | Prev Pending: ₹${previousPending} | Paid: ₹${paid} | New Pending: ₹${newPending}` }, ...(inv.ledger || [])]
          };
        }
        return inv;
      });

      const batch = writeBatch(db);
      
      if (isEdit && originalId && originalId !== transactionPayload.saleId) {
          batch.delete(doc(db, 'transactions', originalId));
      }
      batch.set(doc(db, 'transactions', transactionPayload.saleId), transactionPayload);

      finalInvestors.forEach(inv => {
          batch.set(doc(db, 'investors', inv.id), inv);
      });
      
      await batch.commit();

      if (isEdit) {
        logAudit('EDIT_BILL', `Edited Bill ${oldTx?.saleId || originalId}`, oldTx, transactionPayload);
        alert('Transaction Edited & Profits Recalculated Successfully!');
      } else {
        logAudit('ADD_BILL', `Created New Bill ${transactionPayload.saleId}`, null, transactionPayload);
        alert('Transaction Saved Successfully!');
      }
      
      setEditingTransaction(null);
      setCurrentTab('dashboard');
    } catch (error) {
      alert(error.message);
    }
  };

  const handleDeleteTransaction = async (id) => {
    if (!window.confirm(`Are you sure you want to permanently delete this transaction? This will auto-reverse all investor profit allocations.`)) return;
    
    try {
      const tx = transactions.find(t => t.id === id || t.saleId === id);
      const updatedInvestors = reverseTransactionEffects(tx, investors);

      const batch = writeBatch(db);
      batch.delete(doc(db, 'transactions', tx.id)); // Use true Firestore ID
      updatedInvestors.forEach(inv => {
          batch.set(doc(db, 'investors', inv.id), inv);
      });
      await batch.commit();

      logAudit('DELETE_BILL', `Deleted Bill ${tx.saleId}`, tx, null);
      alert('Bill deleted and all investor balances restored successfully.');
    } catch (error) {
      alert(error.message);
    }
  };

  const handleAddInvestor = async (newInvestor) => {
    try {
      const id = Date.now().toString();
      const completeInvestor = {
          ...newInvestor, 
          id,
          ledger: [{ id: Date.now().toString(), type: 'INVESTMENT_ADDED', amount: newInvestor.activeBalance, date: new Date().toISOString(), description: 'Initial Investment' }]
      };
      await setDoc(doc(db, 'investors', id), completeInvestor);
      logAudit('ADD_INVESTOR', `Added investor ${newInvestor.name}`, null, completeInvestor);
    } catch (error) {
      console.error("Firebase Error (handleAddInvestor):", error);
      alert("Failed to save investor to database. Error: " + error.message);
    }
  };

  const handleUpdateInvestor = async (id, updatedData) => {
    try {
      const oldData = investors.find(i => i.id === id);
      const newInvData = { ...oldData, ...updatedData };
      await setDoc(doc(db, 'investors', id), newInvData);
      logAudit('EDIT_INVESTOR', `Edited investor ${oldData.name}`, oldData, updatedData);
    } catch (error) {
      console.error("Firebase Error (handleUpdateInvestor):", error);
      alert("Failed to update investor. Error: " + error.message);
    }
  };

  const handleDeleteInvestor = async (id) => {
    try {
      const inv = investors.find(i => i.id === id);
      const hasActiveTx = transactions.some(t => t.allocations.some(a => a.investorId === id));
      
      if (hasActiveTx) return alert("Warning: Cannot delete investor. They have active share allocations in past/current shipments.");
      
      const activeBal = safeFloat(inv.activeBalance) || 0;
      const pendingProf = safeFloat(inv.pendingProfit) || 0;
      
      let confirmMessage = `Are you sure you want to permanently delete investor ${inv.name}?`;
      
      if (activeBal !== 0 || pendingProf !== 0) {
        confirmMessage = `WARNING: ${inv.name} still has an Active Balance of ₹${activeBal} or Pending Profit of ₹${pendingProf}!\n\nAre you sure you want to FORCE delete this investor and completely erase their balances?`;
      }
      
      if (window.confirm(confirmMessage)) {
        await deleteDoc(doc(db, 'investors', id));
        logAudit('DELETE_INVESTOR', `Deleted investor ${inv.name}`, inv, null);
      }
    } catch (error) {
      console.error("Firebase Error (handleDeleteInvestor):", error);
      alert("Failed to delete investor. Error: " + error.message);
    }
  };

  const handleLedgerTransaction = async (id, type, amount, description) => {
    try {
      const parsedAmount = safeFloat(amount);
      const inv = investors.find(i => i.id === id);
      if (!inv) return;

      if (type === 'WITHDRAW' && inv.activeBalance < parsedAmount) {
        alert("Error: Withdrawal cannot exceed active available balance.");
        return;
      }
      const isAdd = type === 'ADD';
      const updatedBalance = safeFloat(inv.activeBalance + (isAdd ? parsedAmount : -parsedAmount));
      
      const updatedInv = {
        ...inv,
        activeBalance: updatedBalance,
        ledger: [{ 
          id: Date.now().toString(), 
          type: isAdd ? 'INVESTMENT_ADDED' : 'INVESTMENT_WITHDRAWN', 
          amount: isAdd ? parsedAmount : -parsedAmount, 
          date: new Date().toISOString(), 
          description 
        }, ...(inv.ledger || [])]
      };

      await setDoc(doc(db, 'investors', id), updatedInv);
      logAudit(isAdd ? 'ADD_FUNDS' : 'WITHDRAW_FUNDS', `${isAdd ? 'Added' : 'Withdrew'} ₹${parsedAmount} for ${inv.name}`, inv.activeBalance, updatedBalance);
    } catch (error) {
      console.error("Firebase Error (handleLedgerTransaction):", error);
      alert("Failed to process transaction. Error: " + error.message);
    }
  };

  const navigateToNewAllocation = () => {
    setEditingTransaction(null);
    setCurrentTab('allocation');
  };

  const triggerEditTransaction = (tx) => {
    setEditingTransaction(tx);
    setCurrentTab('allocation');
  };

  const triggerDuplicateTransaction = (tx) => {
    const duplicated = { ...tx, saleId: `${tx.saleId}-COPY` };
    setEditingTransaction(duplicated); // Pre-fill but treat as new (logic handled in ShipmentAllocation)
    setCurrentTab('allocation');
  };

  if (!isDataLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100"><h2 className="text-2xl font-bold text-[#064e3b]">Loading Bahara Database...</h2></div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-[#064e3b] text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center py-4 md:py-0 md:h-16 gap-4">
            <div className="flex justify-between w-full md:w-auto items-center">
                <div className="flex items-center">
                        <img 
                            src="/logo.png" 
                            alt="Bahara Logo" 
                            onError={(e) => { e.target.onerror = null; e.target.style.display = 'none'; }} 
                            className="h-10 sm:h-12 w-auto mr-3 sm:mr-4 object-contain drop-shadow-md transition-all" 
                        />
                        <span className="font-bold text-xl sm:text-2xl text-[#fef3c7] tracking-wide">Bahara Group</span>
                </div>
            </div>
            <div className="flex items-center space-x-2 overflow-x-auto max-w-full pb-1 sm:pb-0 w-full md:w-auto">
              <button onClick={() => setCurrentTab('dashboard')} className={`whitespace-nowrap px-3 py-2 rounded-md text-sm sm:text-base ${currentTab === 'dashboard' ? 'bg-[#065f46]' : 'hover:bg-[#065f46]'}`}>Dashboard</button>
              <button onClick={navigateToNewAllocation} className={`whitespace-nowrap px-3 py-2 rounded-md text-sm sm:text-base ${currentTab === 'allocation' ? 'bg-[#065f46]' : 'hover:bg-[#065f46]'}`}>New Allocation</button>
              <button onClick={() => setCurrentTab('investors')} className={`whitespace-nowrap px-3 py-2 rounded-md text-sm sm:text-base ${currentTab === 'investors' ? 'bg-[#065f46]' : 'hover:bg-[#065f46]'}`}>Investors</button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {currentTab === 'dashboard' && (
            <Dashboard 
                transactions={transactions} 
                investors={investors} 
                onDelete={handleDeleteTransaction}
                onEdit={triggerEditTransaction}
                onDuplicate={triggerDuplicateTransaction}
                onNavigate={setCurrentTab}
            />
        )}
        {currentTab === 'allocation' && (
            <ShipmentAllocation 
                activeInvestors={investors} 
                onSaveTransaction={handleSaveTransaction} 
                editTransaction={editingTransaction} 
                onCancel={() => setCurrentTab('dashboard')}
            />
        )}
        {currentTab === 'investors' && (
            <Investors investors={investors} onAddInvestor={handleAddInvestor} 
                onUpdate={handleUpdateInvestor} onDelete={handleDeleteInvestor} onLedgerAction={handleLedgerTransaction} />
        )}
      </main>
    </div>
  );
}

export default App;