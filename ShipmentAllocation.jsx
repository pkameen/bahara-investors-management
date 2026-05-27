import React, { useState, useMemo, useEffect } from 'react';
import { calculateNetProfit, distributeProfit, toCurrency, toCents } from './financeEngine';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';

const formatIndianCurrency = (val) => {
    if (val === null || val === undefined || val === '') return '';
    const isNegative = val.toString().trim().startsWith('-');
    const str = val.toString().replace(/[^0-9.]/g, '');
    if (!str) return isNegative ? '-' : '';
    const parts = str.split('.');
    const intPart = parts[0] ? Number(parts[0]).toLocaleString('en-IN') : (str.startsWith('.') ? '0' : '');
    const formatted = parts.length > 1 ? `${intPart}.${parts[1]}` : (str.endsWith('.') ? `${intPart}.` : intPart);
    return isNegative ? `-${formatted}` : formatted;
};

const ShipmentAllocation = ({ activeInvestors, onSaveTransaction, editTransaction, onCancel }) => {
    const [shipmentDetails, setShipmentDetails] = useState({
        saleId: '',
        productDetails: '',
        invoiceAmount: 0,
        actualPurchaseCost: 0,
        companyMoneyUsed: 0
    });

    const [allocations, setAllocations] = useState([]);
    const [selectedInvestor, setSelectedInvestor] = useState('');
    const [allocationAmount, setAllocationAmount] = useState('');
    
    const [expenses, setExpenses] = useState([]);
    const expenseCategories = ["Transport Expense", "Travel Expense", "Labour Expense", "Food Expense", "Packaging Expense", "Customs/Clearance Expense", "Commission Expense", "Miscellaneous Expense", "Custom"];
    const [expenseForm, setExpenseForm] = useState({
        id: null,
        category: 'Transport Expense',
        customName: '',
        amount: '',
        notes: '',
        date: new Date().toISOString().split('T')[0]
    });
    const [isExpenseFormOpen, setIsExpenseFormOpen] = useState(false);

    useEffect(() => {
        if (editTransaction) {
            setShipmentDetails({
                saleId: editTransaction.saleId,
                invoiceAmount: editTransaction.invoiceAmount || 0,
                actualPurchaseCost: editTransaction.actualPurchaseCost || 0,
                companyMoneyUsed: editTransaction.companyMoneyUsed || 0
            });
            
            const presets = [1, 2, 5, 10, 15, 20];
            setAllocations((editTransaction.allocations || []).map(a => {
                const investor = activeInvestors.find(inv => inv.id === a.investorId);
                const thisTxPendingCents = toCents(a.profitEarned || 0) - toCents(a.paidAmount !== undefined ? a.paidAmount : (a.profitEarned || 0));
                const currentInvPendingCents = toCents(investor?.pendingProfit || 0);
                const truePrevPendingCents = currentInvPendingCents - thisTxPendingCents;
                
                return {
                    ...a,
                    profitPercentage: a.profitPercentage || 10,
                    isCustomPercentage: a.profitPercentage ? !presets.includes(parseFloat(a.profitPercentage)) : false,
                    previousPending: a.previousPending !== undefined ? a.previousPending : toCurrency(truePrevPendingCents),
                    paidAmount: a.paidAmount !== undefined ? a.paidAmount : a.profitEarned
                };
            }));
            
            // Migrate old expense structure to dynamic array if needed
            if (editTransaction.expenses && Array.isArray(editTransaction.expenses)) {
                setExpenses(editTransaction.expenses);
            } else {
                const migratedExpenses = [];
                const addMigrated = (category, amount) => {
                    if (parseFloat(amount) > 0) migratedExpenses.push({ id: Date.now().toString() + Math.random(), category, amount: parseFloat(amount), notes: 'Legacy migrated', date: new Date().toISOString().split('T')[0] });
                };
                if (editTransaction.transportCost) addMigrated('Transport Expense', editTransaction.transportCost);
                if (editTransaction.travelExpense) addMigrated('Travel Expense', editTransaction.travelExpense);
                if (editTransaction.labourCost) addMigrated('Labour Expense', editTransaction.labourCost);
                if (editTransaction.customsExpense) addMigrated('Customs/Clearance Expense', editTransaction.customsExpense);
                setExpenses(migratedExpenses);
            }
        }
    }, [editTransaction]);

    const handleAddExpense = (e) => {
        e.preventDefault();
        const amt = parseFloat(expenseForm.amount);
        if (isNaN(amt) || amt <= 0) return alert("Expense amount must be a positive number.");
        if (expenseForm.category === 'Custom' && !expenseForm.customName.trim()) return alert("Please provide a custom expense name.");

        const newExpense = {
            id: expenseForm.id || Date.now().toString(),
            category: expenseForm.category === 'Custom' ? expenseForm.customName : expenseForm.category,
            amount: amt,
            notes: expenseForm.notes,
            date: expenseForm.date
        };

        // Prevent duplicate accidental clicks within 1 second for exact same data
        if (!expenseForm.id && expenses.some(ex => ex.category === newExpense.category && ex.amount === newExpense.amount && ex.date === newExpense.date)) {
            if(!window.confirm("An identical expense was already added. Are you sure you want to add it again?")) return;
        }

        if (expenseForm.id) {
            setExpenses(expenses.map(exp => exp.id === expenseForm.id ? newExpense : exp));
        } else {
            setExpenses([...expenses, newExpense]);
        }

        setExpenseForm({ id: null, category: 'Transport Expense', customName: '', amount: '', notes: '', date: new Date().toISOString().split('T')[0] });
        setIsExpenseFormOpen(false);
    };

    const handleEditExpense = (exp) => {
        const isStandard = expenseCategories.includes(exp.category);
        setExpenseForm({
            id: exp.id,
            category: isStandard ? exp.category : 'Custom',
            customName: isStandard ? '' : exp.category,
            amount: exp.amount,
            notes: exp.notes,
            date: exp.date
        });
        setIsExpenseFormOpen(true);
    };

    const handleDeleteExpense = async (exp) => {
        if (!window.confirm('Delete this expense?')) return;
        const updatedExpenses = expenses.filter(e => e.id !== exp.id);
        setExpenses(updatedExpenses);
        
        if (editTransaction && editTransaction.id) {
            try {
                await updateDoc(doc(db, 'transactions', editTransaction.id), { expenses: updatedExpenses });
            } catch (error) {
                console.error("Firebase Error (delete expense):", error);
            }
        }
    };

    const handleRemoveAllocation = async (indexToRemove) => {
        const updatedAllocations = allocations.filter((_, idx) => idx !== indexToRemove);
        setAllocations(updatedAllocations);

        if (editTransaction && editTransaction.id) {
            try {
                await updateDoc(doc(db, 'transactions', editTransaction.id), { allocations: updatedAllocations });
            } catch (error) {
                console.error("Firebase Error (delete allocation):", error);
            }
        }
    };

    // Derived financial calculations
    const totalExpensesAmount = useMemo(() => expenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0), [expenses]);
    
    const netProfitCents = useMemo(() => {
        // Map dynamic array to an object structure that financeEngine expects: { 0: 4000, 1: 2000 }
        const expensesForEngine = expenses.reduce((acc, curr, idx) => ({...acc, [idx]: parseFloat(curr.amount || 0)}), {});
        return calculateNetProfit(
            shipmentDetails.invoiceAmount,
            shipmentDetails.actualPurchaseCost, // Investment used for the actual goods
            expensesForEngine
        );
    }, [shipmentDetails, expenses]);

    const totalAllocatedAmount = allocations.reduce((sum, a) => sum + parseFloat(a.amountUsed || 0), 0);
    const isAllocationValid = (toCents(totalAllocatedAmount) + toCents(shipmentDetails.companyMoneyUsed || 0)) === toCents(shipmentDetails.actualPurchaseCost || 0);
    
    const totalInvestorProfitCents = allocations.reduce((sum, a) => {
        const totalCostCents = toCents(shipmentDetails.actualPurchaseCost || 0);
        const invUsedCents = toCents(a.amountUsed || 0);
        const percentage = parseFloat(a.profitPercentage) || 0;
        let profitCents = 0;
        if (totalCostCents > 0) {
            const contributionRatio = invUsedCents / totalCostCents;
            const attributableProfit = contributionRatio * netProfitCents;
            profitCents = Math.round(attributableProfit * (percentage / 100));
        }
        return sum + profitCents;
    }, 0);
    const isProfitValid = totalInvestorProfitCents <= netProfitCents;

    const isPaymentValid = useMemo(() => allocations.every(a => {
        const previousPendingCents = toCents(a.previousPending || 0);
        const totalCostCents = toCents(shipmentDetails.actualPurchaseCost || 0);
        const invUsedCents = toCents(a.amountUsed || 0);
        const percentage = parseFloat(a.profitPercentage) || 0;
        let profitCents = 0;
        if (totalCostCents > 0) {
            const contributionRatio = invUsedCents / totalCostCents;
            const attributableProfit = contributionRatio * netProfitCents;
            profitCents = Math.round(attributableProfit * (percentage / 100));
        }
        const totalPayableCents = profitCents + previousPendingCents;
        const paidCents = toCents(parseFloat(a.paidAmount) || 0);
        return (totalPayableCents - paidCents) >= 0;
    }), [allocations, shipmentDetails.actualPurchaseCost, netProfitCents]);

    const handleAddAllocation = () => {
        if (!selectedInvestor || !allocationAmount) return;
        const investor = activeInvestors.find(i => i.id === selectedInvestor);
        
        if (allocations.some(a => a.investorId === investor.id)) {
            alert("This investor is already added. Please edit their existing allocation card below or remove it first.");
            return;
        }

        const defaultPercentage = 10;
        const totalCostCents = toCents(shipmentDetails.actualPurchaseCost || 0);
        const invUsedCents = toCents(allocationAmount);
        const currentInvPendingCents = toCents(investor.pendingProfit || 0);
        
        let defaultProfitCents = 0;
        if (totalCostCents > 0) {
            const contributionRatio = invUsedCents / totalCostCents;
            const attributableProfit = contributionRatio * netProfitCents;
            defaultProfitCents = Math.round(attributableProfit * (defaultPercentage / 100));
        }
        const totalPayableCents = defaultProfitCents + currentInvPendingCents;

        setAllocations([...allocations, {
            investorId: investor.id,
            investorName: investor.name,
            amountUsed: parseFloat(allocationAmount),
            profitPercentage: defaultPercentage,
            isCustomPercentage: false,
            previousPending: toCurrency(currentInvPendingCents),
            paidAmount: toCurrency(totalPayableCents)
        }]);
        setSelectedInvestor('');
        setAllocationAmount('');
    };

    const handleSave = () => {
        if (!isAllocationValid) {
            alert("Error: Allocated funds + Company Money Used must exactly match the Actual Purchase Cost.");
            return;
        }
        
        if (!isProfitValid) {
            alert("Error: Total investor profit cannot exceed the available net profit.");
            return;
        }
        
        if (!isPaymentValid) {
            alert("Error: Paid amount cannot exceed Total Payable. Negative pending balances are not allowed.");
            return;
        }

        try {
            const distributionData = distributeProfit(
                allocations, 
                shipmentDetails.actualPurchaseCost, 
                netProfitCents,
                shipmentDetails.companyMoneyUsed
            );
    
            const finalTransactionPayload = {
                ...shipmentDetails,
                expenses,
                netProfit: toCurrency(netProfitCents),
                allocations: distributionData.distributions,
                retainedCompanyProfit: distributionData.retainedCompanyProfit,
                timestamp: new Date().toISOString()
            };
    
            // If the saleId is exactly the same as editTransaction, we are editing. 
            // If it's a duplication, the saleId changed, so treat as new.
        const isEdit = editTransaction && editTransaction.saleId === shipmentDetails.saleId;
        onSaveTransaction(finalTransactionPayload, isEdit, editTransaction?.id || editTransaction?.saleId);
        } catch (e) {
            alert(e.message);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 p-2 sm:p-4 md:p-8 font-sans">
            <div className="max-w-6xl mx-auto bg-white rounded-xl shadow-2xl overflow-hidden border border-gray-200 w-full">
                {/* Header - Dark Green & Gold Luxury Theme */}
                <div className="bg-[#064e3b] px-4 sm:px-8 py-4 sm:py-6 border-b-4 border-[#d97706] flex items-center gap-4 sm:gap-6">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-[#fef3c7] tracking-wide">
                            Bahara International Group
                        </h1>
                        <p className="text-[#d1fae5] mt-1 sm:mt-2 text-sm sm:text-base">{editTransaction ? 'Edit/Duplicate Allocation' : 'New Shipment & Share Allocation'}</p>
                    </div>
                </div>

                {/* Dashboard Financial Summary Cards */}
                <div className="bg-gray-100 p-4 sm:p-6 border-b border-gray-200">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                        <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-gray-400">
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Invoice Amount</p>
                            <p className="text-lg font-bold text-gray-800 mt-1">₹{parseFloat(shipmentDetails.invoiceAmount || 0).toLocaleString()}</p>
                        </div>
                        <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-blue-500">
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Total Purchase Cost</p>
                            <p className="text-lg font-bold text-gray-800 mt-1">₹{parseFloat(shipmentDetails.actualPurchaseCost || 0).toLocaleString()}</p>
                        </div>
                        <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-yellow-500">
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Investor Money Used</p>
                            <p className="text-lg font-bold text-gray-800 mt-1">₹{totalAllocatedAmount.toLocaleString()}</p>
                        </div>
                        <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-purple-500">
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Company Money Used</p>
                            <p className="text-lg font-bold text-gray-800 mt-1">₹{parseFloat(shipmentDetails.companyMoneyUsed || 0).toLocaleString()}</p>
                        </div>
                        <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-red-500">
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Total Expenses</p>
                            <p className="text-lg font-bold text-red-600 mt-1">₹{totalExpensesAmount.toLocaleString()}</p>
                        </div>
                        <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-green-500 relative overflow-hidden">
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Net Profit</p>
                            <p className="text-xl font-black text-green-600 mt-1">₹{toCurrency(netProfitCents)}</p>
                        </div>
                    </div>
                </div>

                <div className="p-4 sm:p-8 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
                    {/* Left Column: Shipment & Expenses */}
                    <div className="space-y-6">
                        <h2 className="text-xl font-semibold text-[#064e3b] border-b pb-2">Shipment Details</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="col-span-1">
                                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Sale ID</label>
                                <input type="text" placeholder="Sale ID" className="border p-3 rounded w-full focus:ring-2 focus:ring-[#d97706]" value={shipmentDetails.saleId} onChange={e => setShipmentDetails({...shipmentDetails, saleId: e.target.value})} />
                            </div>
                            <div className="col-span-1">
                                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Invoice Amount</label>
                                <input type="number" placeholder="Invoice Amount" className="border p-3 rounded w-full focus:ring-2 focus:ring-[#d97706]" value={shipmentDetails.invoiceAmount} onChange={e => setShipmentDetails({...shipmentDetails, invoiceAmount: e.target.value})} />
                            </div>
                            <div className="col-span-1">
                                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Actual Purchase Cost</label>
                                <input type="number" placeholder="Total Purchase Cost" className="border p-3 rounded w-full focus:ring-2 focus:ring-[#d97706]" value={shipmentDetails.actualPurchaseCost} onChange={e => setShipmentDetails({...shipmentDetails, actualPurchaseCost: e.target.value})} />
                            </div>
                            <div className="col-span-1">
                                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Company Money Used</label>
                                <input type="number" placeholder="Company Used" className="border p-3 rounded w-full focus:ring-2 focus:ring-[#d97706]" value={shipmentDetails.companyMoneyUsed} onChange={e => setShipmentDetails({...shipmentDetails, companyMoneyUsed: e.target.value})} />
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-end border-b pb-2 gap-2 sm:gap-0">
                            <h2 className="text-xl font-semibold text-[#064e3b]">Expense Management</h2>
                            <button onClick={() => { setExpenseForm({ id: null, category: 'Transport Expense', customName: '', amount: '', notes: '', date: new Date().toISOString().split('T')[0] }); setIsExpenseFormOpen(!isExpenseFormOpen); }} className="text-sm bg-gray-200 hover:bg-gray-300 text-gray-800 px-3 py-2 sm:py-1 rounded w-full sm:w-auto">
                                {isExpenseFormOpen ? 'Close Form' : '+ Add Expense'}
                            </button>
                        </div>

                        {isExpenseFormOpen && (
                            <form onSubmit={handleAddExpense} className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <select className="border p-2 rounded" value={expenseForm.category} onChange={e => setExpenseForm({...expenseForm, category: e.target.value})}>
                                        {expenseCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                    </select>
                                    {expenseForm.category === 'Custom' && (
                                        <input type="text" placeholder="Custom Expense Name" className="border p-2 rounded" required
                                            value={expenseForm.customName} onChange={e => setExpenseForm({...expenseForm, customName: e.target.value})} />
                                    )}
                                    <input type="number" placeholder="Amount (₹)" className="border p-2 rounded" required min="1"
                                        value={expenseForm.amount} onChange={e => setExpenseForm({...expenseForm, amount: e.target.value})} />
                                    <input type="date" className="border p-2 rounded" required
                                        value={expenseForm.date} onChange={e => setExpenseForm({...expenseForm, date: e.target.value})} />
                                </div>
                                <input type="text" placeholder="Notes / Remarks" className="border p-2 rounded w-full"
                                    value={expenseForm.notes} onChange={e => setExpenseForm({...expenseForm, notes: e.target.value})} />
                                
                                <button type="submit" className="w-full bg-[#064e3b] text-white py-2 rounded font-semibold hover:bg-[#065f46]">
                                    {expenseForm.id ? 'Update Expense' : 'Save Expense'}
                                </button>
                            </form>
                        )}

                        <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
                            {expenses.length === 0 ? (
                                <p className="text-sm text-gray-500 p-4 text-center">No expenses recorded yet.</p>
                            ) : (
                                <ul className="divide-y divide-gray-200">
                                    {expenses.map((exp) => (
                                        <li key={exp.id} className="p-3 hover:bg-gray-50 flex flex-col sm:flex-row justify-between sm:items-center gap-2 sm:gap-0">
                                            <div>
                                                <p className="text-sm font-semibold text-gray-800">{exp.category} <span className="text-xs text-gray-500 ml-2 font-normal">{exp.date}</span></p>
                                                {exp.notes && <p className="text-xs text-gray-500">{exp.notes}</p>}
                                            </div>
                                            <div className="text-left sm:text-right flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-end">
                                                <p className="text-sm font-bold text-red-600">-₹{parseFloat(exp.amount).toLocaleString()}</p>
                                                <div className="text-xs space-x-2 sm:mt-1">
                                                    <button onClick={() => handleEditExpense(exp)} className="text-blue-600 hover:text-blue-800">Edit</button>
                                    <button onClick={() => handleDeleteExpense(exp)} className="text-red-600 hover:text-red-800">Delete</button>
                                                </div>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>

                    {/* Right Column: Allocation & Distribution */}
                    <div className="space-y-6 bg-white p-4 sm:p-6 rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-gray-100 flex flex-col h-full">
                        <div className="border-b border-gray-100 pb-4">
                            <h2 className="text-2xl font-black text-[#064e3b] tracking-tight">Fund Allocation</h2>
                            <p className="text-sm text-gray-500 mt-1 font-medium">Distribute shipment cost and assign profits</p>
                        </div>
                        
                        {/* Input Area */}
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col sm:flex-row gap-3 items-center">
                            <div className="w-full sm:flex-1">
                                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Select Investor</label>
                                <select className="border border-gray-300 p-2.5 rounded-lg w-full bg-white focus:ring-2 focus:ring-[#d97706] focus:border-[#d97706] transition-all outline-none text-sm font-medium text-gray-800" value={selectedInvestor} onChange={e => setSelectedInvestor(e.target.value)}>
                                    <option value="">-- Choose an Investor --</option>
                                    {activeInvestors?.map(inv => (
                                        <option key={inv.id} value={inv.id}>{inv.name} (Bal: ₹{inv.activeBalance})</option>
                                    ))}
                                </select>
                            </div>
                            <div className="w-full sm:w-1/3">
                                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Amount Used (₹)</label>
                                <input type="number" placeholder="e.g. 50000" className="border border-gray-300 p-2.5 rounded-lg w-full bg-white focus:ring-2 focus:ring-[#d97706] focus:border-[#d97706] transition-all outline-none text-sm font-bold text-gray-800" 
                                    value={allocationAmount} onChange={e => setAllocationAmount(e.target.value)} />
                            </div>
                            <div className="w-full sm:w-auto sm:pt-5">
                                <button onClick={handleAddAllocation} className="w-full bg-gradient-to-r from-[#d97706] to-[#b45309] text-white px-5 py-2.5 rounded-lg hover:shadow-lg hover:from-[#b45309] hover:to-[#92400e] transition-all font-bold flex items-center justify-center gap-1.5 shadow-sm">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4"></path></svg>
                                    Add
                                </button>
                            </div>
                        </div>

                        {/* Allocations List */}
                        <div className="space-y-6">
                            {allocations.length === 0 ? (
                                <div className="text-center py-12 bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 font-medium">
                                    No investors added yet. Select an investor and add funds above.
                                </div>
                            ) : (
                                allocations.map((a, i) => {
                                    const totalCostCents = toCents(shipmentDetails.actualPurchaseCost || 0);
                                    const invUsedCents = toCents(a.amountUsed || 0);
                                    const percentage = parseFloat(a.profitPercentage) || 0;
                                    let profitCents = 0;
                                    let contributionRatioDisplay = "0.00";
                                    if (totalCostCents > 0) {
                                        const contributionRatio = invUsedCents / totalCostCents;
                                        const attributableProfit = contributionRatio * netProfitCents;
                                        profitCents = Math.round(attributableProfit * (percentage / 100));
                                        contributionRatioDisplay = (contributionRatio * 100).toFixed(2);
                                    }
                                    const previousPendingCents = toCents(a.previousPending || 0);
                                    const totalPayableCents = profitCents + previousPendingCents;
                                    const paidCents = toCents(parseFloat(a.paidAmount) || 0);
                                    const pendingCents = totalPayableCents - paidCents;
                                    
                                    return (
                                        <div key={i} className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-all overflow-hidden group">
                                            {/* Card Header */}
                                            <div className="bg-gradient-to-r from-gray-50 to-white border-b border-gray-100 px-4 py-3 flex justify-between items-center">
                                                <div className="flex items-center gap-3">
                                                    <div className="bg-[#064e3b] text-[#fef3c7] w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shadow-sm border border-[#065f46]">
                                                        {a.investorName.charAt(0).toUpperCase()}
                                                    </div>
                                                    <h3 className="font-bold text-gray-800 text-base">{a.investorName}</h3>
                                                </div>
                                                <button 
                                    onClick={() => handleRemoveAllocation(i)} 
                                                    className="text-gray-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-colors"
                                                    title="Remove Allocation"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                                </button>
                                            </div>

                                            {/* Card Body */}
                                            <div className="p-6 grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8 items-start">
                                                
                                                {/* SECTION 1: Investor Info */}
                                                <div className="flex flex-col space-y-5 h-full">
                                                    <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-wider border-b border-gray-100 pb-2">1. Investment Info</h4>
                                                    <div className="flex flex-row lg:flex-col justify-between lg:justify-start gap-5">
                                                        <div>
                                                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">Amount Used</p>
                                                            <p className="font-black text-gray-800 text-2xl whitespace-nowrap">₹{formatIndianCurrency(a.amountUsed)}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1 lg:mt-2">Contribution</p>
                                                            <span className="inline-block bg-blue-50 text-blue-700 font-bold text-sm px-3 py-1.5 rounded-lg border border-blue-100 shadow-sm">{contributionRatioDisplay}%</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* SECTION 2: Controls */}
                                                <div className="flex flex-col space-y-5 h-full">
                                                    <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-wider border-b border-gray-100 pb-2">2. Distribution Controls</h4>
                                                    <div className="space-y-4">
                                                        <div>
                                                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1.5">Profit Percentage</p>
                                                            <div className="flex gap-2 items-center">
                                                                <select 
                                                                    className="border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-[#d97706] bg-white text-sm outline-none shadow-sm flex-1 font-medium text-gray-800"
                                                                    value={a.isCustomPercentage ? 'Custom' : a.profitPercentage}
                                                                    onChange={(e) => {
                                                                        const val = e.target.value;
                                                                        const newAlloc = [...allocations];
                                                                        if (val === 'Custom') {
                                                                            newAlloc[i].isCustomPercentage = true;
                                                                        } else {
                                                                            newAlloc[i].isCustomPercentage = false;
                                                                            newAlloc[i].profitPercentage = val;
                                                                            let newProfitCents = 0;
                                                                            if (totalCostCents > 0) {
                                                                                const contributionRatio = invUsedCents / totalCostCents;
                                                                                const attributableProfit = contributionRatio * netProfitCents;
                                                                                newProfitCents = Math.round(attributableProfit * (parseFloat(val) / 100));
                                                                            }
                                                                            const newTotalPayable = newProfitCents + previousPendingCents;
                                                                            newAlloc[i].paidAmount = toCurrency(newTotalPayable);
                                                                        }
                                                                        setAllocations(newAlloc);
                                                                    }}
                                                                >
                                                                    <option value="1">1%</option>
                                                                    <option value="2">2%</option>
                                                                    <option value="5">5%</option>
                                                                    <option value="10">10%</option>
                                                                    <option value="15">15%</option>
                                                                    <option value="20">20%</option>
                                                                    <option value="Custom">Custom</option>
                                                                </select>
                                                                {a.isCustomPercentage && (
                                                                    <input type="number" className="border border-gray-300 p-2.5 rounded-lg w-20 focus:ring-2 focus:ring-[#d97706] text-sm outline-none shadow-sm font-bold text-gray-800" placeholder="%" step="0.01"
                                                                        value={a.profitPercentage} onChange={e => {
                                                                            const newAlloc = [...allocations];
                                                                            newAlloc[i].profitPercentage = e.target.value;
                                                                            let newProfitCents = 0;
                                                                            if (totalCostCents > 0) {
                                                                                const contributionRatio = invUsedCents / totalCostCents;
                                                                                const attributableProfit = contributionRatio * netProfitCents;
                                                                                newProfitCents = Math.round(attributableProfit * ((parseFloat(e.target.value) || 0) / 100));
                                                                            }
                                                                            const newTotalPayable = newProfitCents + previousPendingCents;
                                                                            newAlloc[i].paidAmount = toCurrency(newTotalPayable);
                                                                            setAllocations(newAlloc);
                                                                        }} />
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div>
                                                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1.5">Paid Amount</p>
                                                            <div className="flex flex-col gap-2">
                                                                <div className="relative">
                                                                    <span className={`absolute inset-y-0 left-0 pl-3 flex items-center font-bold text-sm ${parseFloat(a.paidAmount) > (totalPayableCents/100) ? 'text-red-500' : 'text-gray-500'}`}>₹</span>
                                                                    <input type="text" 
                                                                        className={`border pl-8 p-2.5 rounded-lg w-full font-bold focus:outline-none focus:ring-2 text-sm transition-all shadow-sm ${parseFloat(a.paidAmount) > (totalPayableCents/100) ? 'border-red-500 focus:ring-red-500 bg-red-50 text-red-700' : 'border-gray-300 focus:ring-[#064e3b] text-[#064e3b] bg-white'}`}
                                                                        value={formatIndianCurrency(a.paidAmount)} 
                                                                        onChange={e => {
                                                                            let rawValue = e.target.value.replace(/,/g, '').replace(/[^-0-9.]/g, '');
                                                                            const isNegative = rawValue.startsWith('-');
                                                                            rawValue = rawValue.replace(/-/g, '');
                                                                            if (isNegative) rawValue = '-' + rawValue;
                                                                            const parts = rawValue.split('.');
                                                                            const safeValue = parts.length > 1 ? `${parts[0]}.${parts[1]}` : rawValue;
                                                                            const newAlloc = [...allocations];
                                                                            newAlloc[i].paidAmount = safeValue;
                                                                            setAllocations(newAlloc);
                                                                        }} 
                                                                    />
                                                                </div>
                                                                <div className="flex justify-between gap-1.5">
                                                                    <button onClick={() => { const newAlloc = [...allocations]; newAlloc[i].paidAmount = "0.00"; setAllocations(newAlloc); }} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 py-1.5 rounded-md transition-colors text-[10px] font-bold border border-gray-200 shadow-sm" title="Pay None">0%</button>
                                                                    <button onClick={() => { const newAlloc = [...allocations]; newAlloc[i].paidAmount = toCurrency(Math.round(totalPayableCents / 2)); setAllocations(newAlloc); }} className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-700 py-1.5 rounded-md transition-colors text-[10px] font-bold border border-blue-200 shadow-sm" title="Pay Half">50%</button>
                                                                    <button onClick={() => { const newAlloc = [...allocations]; newAlloc[i].paidAmount = toCurrency(totalPayableCents); setAllocations(newAlloc); }} className="flex-1 bg-green-50 hover:bg-green-100 text-green-700 py-1.5 rounded-md transition-colors text-[10px] font-bold border border-green-200 shadow-sm" title="Pay Full">100%</button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* SECTION 3: Financial Summary */}
                                                <div className="flex flex-col space-y-5 lg:col-span-2 xl:col-span-1 h-full">
                                                    <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-wider border-b border-gray-100 pb-2">3. Financial Summary</h4>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                        <div className="bg-green-50 border border-green-100 rounded-xl p-4 shadow-sm flex flex-col justify-center">
                                                            <span className="text-[10px] text-green-800 font-bold uppercase tracking-wider mb-1">Current Profit</span>
                                                            <span className="font-black text-green-700 text-xl whitespace-nowrap">₹{formatIndianCurrency(toCurrency(profitCents))}</span>
                                                        </div>
                                                        <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 shadow-sm flex flex-col justify-center">
                                                            <span className="text-[10px] text-orange-800 font-bold uppercase tracking-wider mb-1">Prev. Pending</span>
                                                            <span className="font-black text-orange-700 text-xl whitespace-nowrap">₹{formatIndianCurrency(toCurrency(previousPendingCents))}</span>
                                                        </div>
                                                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 shadow-sm flex flex-col justify-center sm:col-span-2">
                                                            <span className="text-[11px] text-blue-800 font-black uppercase tracking-wider mb-1">Total Payable</span>
                                                            <span className="font-black text-blue-800 text-2xl whitespace-nowrap drop-shadow-sm">₹{formatIndianCurrency(toCurrency(totalPayableCents))}</span>
                                                        </div>
                                                        <div className={`border rounded-xl p-4 shadow-sm flex flex-col justify-center sm:col-span-2 ${pendingCents < 0 ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
                                                            <span className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${pendingCents < 0 ? 'text-red-800' : 'text-gray-600'}`}>New Pending</span>
                                                            <span className={`font-black text-xl whitespace-nowrap ${pendingCents < 0 ? 'text-red-600' : 'text-gray-800'}`}>₹{formatIndianCurrency(toCurrency(pendingCents))}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })
                            )}
                        </div>

                        {/* Summary Section Redesign */}
                        <div className="mt-auto pt-6 border-t border-gray-200">
                            <h3 className="text-lg font-black text-gray-800 mb-4">Allocation Summary</h3>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Capital Validation Card */}
                                <div className={`rounded-xl p-4 border-l-4 shadow-sm flex flex-col justify-center ${isAllocationValid ? 'bg-green-50 border-green-500' : 'bg-red-50 border-red-500'}`}>
                                    <p className="text-[10px] font-bold uppercase tracking-wider mb-1 text-gray-500">Capital Matching</p>
                                    <div className="flex justify-between items-end">
                                        <div>
                                            <p className={`text-xl font-black ${isAllocationValid ? 'text-green-700' : 'text-red-700'}`}>
                                                ₹{formatIndianCurrency((parseFloat(totalAllocatedAmount || 0) + parseFloat(shipmentDetails.companyMoneyUsed || 0)).toString())}
                                            </p>
                                            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mt-0.5">Assigned (Inv + Co.)</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-base font-black text-gray-800">
                                                ₹{formatIndianCurrency((shipmentDetails.actualPurchaseCost || 0).toString())}
                                            </p>
                                            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mt-0.5">Purchase Cost</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Profit Distribution Card */}
                                <div className={`rounded-xl p-4 border-l-4 shadow-sm flex flex-col justify-center ${isProfitValid ? 'bg-blue-50 border-blue-500' : 'bg-red-50 border-red-500'}`}>
                                    <p className="text-[10px] font-bold uppercase tracking-wider mb-1 text-gray-500">Profit Distribution</p>
                                    <div className="flex justify-between items-end">
                                        <div>
                                            <p className={`text-xl font-black ${isProfitValid ? 'text-blue-700' : 'text-red-700'}`}>
                                                ₹{formatIndianCurrency(toCurrency(totalInvestorProfitCents))}
                                            </p>
                                            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mt-0.5">Total Investor Profit</p>
                                        </div>
                                        <div className="text-right">
                                            <p className={`text-base font-black ${isProfitValid ? 'text-[#064e3b]' : 'text-red-600'}`}>
                                                ₹{formatIndianCurrency(toCurrency(netProfitCents - totalInvestorProfitCents))}
                                            </p>
                                            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mt-0.5">Company Remaining</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {!isProfitValid && (
                            <div className="bg-red-100 text-red-700 p-3 rounded mb-4 font-semibold border border-red-300 shadow-sm animate-pulse">
                                Warning: Selected investor profit (₹{toCurrency(totalInvestorProfitCents)}) exceeds available net profit (₹{toCurrency(netProfitCents)}). Please adjust the percentages.
                            </div>
                        )}

                        {!isPaymentValid && (
                            <div className="bg-red-100 text-red-700 p-3 rounded mb-4 font-semibold border border-red-300 shadow-sm animate-pulse">
                                Warning: One or more Paid Amounts exceed the Total Payable. Negative pending balances are not permitted.
                            </div>
                        )}

                        <div className="flex flex-col sm:flex-row gap-4 mt-6">
                            <button onClick={onCancel} className="w-full sm:flex-1 py-4 rounded-lg text-lg font-bold bg-gray-200 text-gray-700 hover:bg-gray-300">
                                Cancel
                            </button>
                            <button 
                                onClick={handleSave}
                                disabled={!isAllocationValid || !isProfitValid || !isPaymentValid}
                                className={`w-full sm:flex-1 py-4 rounded-lg text-lg font-bold transition-colors ${(isAllocationValid && isProfitValid && isPaymentValid) ? 'bg-[#064e3b] text-[#fef3c7] hover:bg-[#065f46] cursor-pointer shadow-lg' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
                            >
                                {editTransaction ? 'Update & Recalculate' : 'Verify & Save Transaction'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>

    );
};

export default ShipmentAllocation;