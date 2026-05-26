import React, { useState } from 'react';
import ShipmentAllocation from './ShipmentAllocation';
import Dashboard from './Dashboard';
import Investors from './Investors';
import { sampleInvestors, sampleTransactions } from './sampleData'; 

function App() {
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [investors, setInvestors] = useState(sampleInvestors);
  const [transactions, setTransactions] = useState(sampleTransactions);
  const [auditLogs, setAuditLogs] = useState([]);
  const [editingTransaction, setEditingTransaction] = useState(null);

  // --- HELPER: Safely resolve JS floating point errors ---
  const safeFloat = (num) => Math.round(parseFloat(num) * 100) / 100;

  const logAudit = (action, details, oldValue, newValue) => {
    setAuditLogs(prev => [{ id: Date.now().toString(), date: new Date().toISOString(), user: 'Admin', action, details, oldValue, newValue }, ...prev]);
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

  const handleSaveTransaction = (transactionPayload, isEdit = false, originalSaleId = null) => {
    try {
      let workingInvestors = [...investors];
      let oldTx = null;

      if (isEdit) {
        oldTx = transactions.find(t => t.saleId === originalSaleId);
        workingInvestors = reverseTransactionEffects(oldTx, workingInvestors);
        setTransactions(transactions.filter(t => t.saleId !== originalSaleId));
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

      setInvestors(finalInvestors);
      
      if (isEdit) {
        setTransactions(prev => [transactionPayload, ...prev.filter(t => t.saleId !== originalSaleId)]);
        logAudit('EDIT_BILL', `Edited Bill ${originalSaleId}`, oldTx, transactionPayload);
        alert('Transaction Edited & Profits Recalculated Successfully!');
      } else {
        setTransactions(prev => [transactionPayload, ...prev]);
        logAudit('ADD_BILL', `Created New Bill ${transactionPayload.saleId}`, null, transactionPayload);
        alert('Transaction Saved Successfully!');
      }
      
      setEditingTransaction(null);
      setCurrentTab('dashboard');
    } catch (error) {
      alert(error.message);
    }
  };

  const handleDeleteTransaction = (saleId) => {
    if (!window.confirm(`Are you sure you want to delete Sale ID ${saleId}? This will auto-reverse all investor profit allocations.`)) return;
    
    try {
      const tx = transactions.find(t => t.saleId === saleId);
      const updatedInvestors = reverseTransactionEffects(tx, investors);
      setInvestors(updatedInvestors);
      setTransactions(transactions.filter(t => t.saleId !== saleId));
      logAudit('DELETE_BILL', `Deleted Bill ${saleId}`, tx, null);
      alert('Bill deleted and all investor balances restored successfully.');
    } catch (error) {
      alert(error.message);
    }
  };

  const handleAddInvestor = (newInvestor) => {
    const completeInvestor = {
        ...newInvestor, 
        id: Date.now().toString(),
        ledger: [{ id: Date.now().toString(), type: 'INVESTMENT_ADDED', amount: newInvestor.activeBalance, date: new Date().toISOString(), description: 'Initial Investment' }]
    };
    setInvestors([...investors, completeInvestor]);
    logAudit('ADD_INVESTOR', `Added investor ${newInvestor.name}`, null, completeInvestor);
  };

  const handleUpdateInvestor = (id, updatedData) => {
    const oldData = investors.find(i => i.id === id);
    setInvestors(investors.map(inv => inv.id === id ? { ...inv, ...updatedData } : inv));
    logAudit('EDIT_INVESTOR', `Edited investor ${oldData.name}`, oldData, updatedData);
  };

  const handleDeleteInvestor = (id) => {
    const inv = investors.find(i => i.id === id);
    const hasActiveTx = transactions.some(t => t.allocations.some(a => a.investorId === id));
    
    if (hasActiveTx) return alert("Warning: Cannot delete investor. They have active share allocations in past/current shipments.");
    if (inv.activeBalance > 0) return alert("Warning: Cannot delete investor. Please withdraw their pending balance first.");
    
    if (window.confirm(`Are you sure you want to permanently delete investor ${inv.name}?`)) {
      setInvestors(investors.filter(i => i.id !== id));
      logAudit('DELETE_INVESTOR', `Deleted investor ${inv.name}`, inv, null);
    }
  };

  const handleLedgerTransaction = (id, type, amount, description) => {
    const parsedAmount = safeFloat(amount);
    setInvestors(investors.map(inv => {
      if (inv.id === id) {
        if (type === 'WITHDRAW' && inv.activeBalance < parsedAmount) {
          alert("Error: Withdrawal cannot exceed active available balance.");
          return inv;
        }
        const isAdd = type === 'ADD';
        const updatedBalance = safeFloat(inv.activeBalance + (isAdd ? parsedAmount : -parsedAmount));
        
        logAudit(isAdd ? 'ADD_FUNDS' : 'WITHDRAW_FUNDS', `${isAdd ? 'Added' : 'Withdrew'} ₹${parsedAmount} for ${inv.name}`, inv.activeBalance, updatedBalance);
        
        return {
          ...inv,
          activeBalance: updatedBalance,
          ledger: [{ 
            id: Date.now().toString(), 
            type: isAdd ? 'INVESTMENT_ADDED' : 'INVESTMENT_WITHDRAWN', 
            amount: isAdd ? parsedAmount : -parsedAmount, 
            date: new Date().toISOString(), 
            description 
          }, ...inv.ledger]
        };
      }
      return inv;
    }));
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

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-[#064e3b] text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center py-4 md:py-0 md:h-16 gap-4">
            <div className="flex justify-between w-full md:w-auto items-center">
                <div className="flex items-center">
                    <img src="/images/logo img.png" alt="Bahara Logo" className="h-10 w-auto mr-3 object-contain drop-shadow-sm" />
                    <span className="font-bold text-xl text-[#fef3c7] tracking-wide">Bahara Group</span>
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