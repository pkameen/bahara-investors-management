import React, { useState } from 'react';

const Investors = ({ investors, onAddInvestor, onUpdate, onDelete, onLedgerAction }) => {
    const [showForm, setShowForm] = useState(false);
    const [activeAction, setActiveAction] = useState({ type: null, investor: null }); // type: 'EDIT', 'ADD', 'WITHDRAW', 'VIEW'
    const [newInv, setNewInv] = useState({ name: '', mobile: '', bankDetails: '', address: '', status: 'Active', activeBalance: 0, totalProfit: 0, pendingProfit: 0 });
    const [actionAmount, setActionAmount] = useState('');
    const [actionDesc, setActionDesc] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (activeAction.type === 'EDIT') {
            onUpdate(activeAction.investor.id, newInv);
        } else {
            onAddInvestor({ ...newInv, activeBalance: parseFloat(newInv.activeBalance) });
        }
        closeForm();
    };

    const handleLedgerSubmit = (e) => {
        e.preventDefault();
        onLedgerAction(activeAction.investor.id, activeAction.type, actionAmount, actionDesc);
        closeForm();
    };

    const closeForm = () => {
        setShowForm(false);
        setActiveAction({ type: null, investor: null });
        setNewInv({ name: '', mobile: '', bankDetails: '', address: '', status: 'Active', activeBalance: 0, totalProfit: 0, pendingProfit: 0 });
        setActionAmount('');
        setActionDesc('');
    };

    const openEdit = (inv) => {
        setNewInv(inv);
        setActiveAction({ type: 'EDIT', investor: inv });
        setShowForm(true);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-4 sm:px-0">
                <div className="flex items-center gap-4">
                    <h1 className="text-3xl font-bold text-[#064e3b] tracking-tight">Investor Management</h1>
                </div>
                <button 
                    onClick={() => { closeForm(); setShowForm(!showForm); }} 
                    className="bg-[#064e3b] text-white px-4 py-2 rounded-md hover:bg-[#065f46] w-full sm:w-auto"
                >
                    {showForm ? 'Cancel' : '+ Add Investor'}
                </button>
            </div>

            {showForm && activeAction.type !== 'VIEW' && (
                <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 mx-4 sm:mx-0">
                    <h3 className="text-xl font-bold mb-4">{activeAction.type === 'EDIT' ? `Edit ${activeAction.investor.name}` : (activeAction.type === 'ADD' || activeAction.type === 'WITHDRAW' ? `${activeAction.type} Funds` : 'New Investor')}</h3>
                    
                    {(activeAction.type === 'EDIT' || !activeAction.type) ? (
                        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Investor Name</label>
                            <input required type="text" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" 
                                value={newInv.name} onChange={e => setNewInv({...newInv, name: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Mobile</label>
                            <input type="text" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" 
                                value={newInv.mobile} onChange={e => setNewInv({...newInv, mobile: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Bank Details</label>
                            <input type="text" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" 
                                value={newInv.bankDetails} onChange={e => setNewInv({...newInv, bankDetails: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Status</label>
                            <select className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" 
                                value={newInv.status} onChange={e => setNewInv({...newInv, status: e.target.value})}>
                                <option>Active</option>
                                <option>Inactive</option>
                            </select>
                        </div>
                        {!activeAction.type && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Initial Investment Balance (₹)</label>
                                <input required type="number" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" 
                                value={newInv.activeBalance} onChange={e => setNewInv({...newInv, activeBalance: e.target.value})} />
                            </div>
                        )}
                        <div className="col-span-1 md:col-span-2 flex flex-col sm:flex-row justify-end gap-2 mt-4">
                            <button type="button" onClick={closeForm} className="bg-gray-200 px-6 py-2 rounded-md h-10 w-full sm:w-auto">Cancel</button>
                            <button type="submit" className="bg-[#d97706] text-white px-6 py-2 rounded-md hover:bg-[#b45309] h-10 w-full sm:w-auto">
                                Save Investor
                            </button>
                        </div>
                        </form>
                    ) : (
                        <form onSubmit={handleLedgerSubmit} className="flex flex-col sm:flex-row gap-4 items-start sm:items-end w-full">
                            <div className="flex-1 w-full">
                                <label className="block text-sm font-medium text-gray-700">Amount (₹)</label>
                                <input required type="number" min="1" max={activeAction.type === 'WITHDRAW' ? activeAction.investor.activeBalance : undefined} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" 
                                    value={actionAmount} onChange={e => setActionAmount(e.target.value)} />
                                {activeAction.type === 'WITHDRAW' && <p className="text-xs text-gray-500 mt-1">Available: ₹{activeAction.investor.activeBalance}</p>}
                            </div>
                            <div className="flex-1 w-full">
                                <label className="block text-sm font-medium text-gray-700">Description / Memo</label>
                                <input required type="text" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" 
                                    value={actionDesc} onChange={e => setActionDesc(e.target.value)} />
                            </div>
                            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                                <button type="button" onClick={closeForm} className="bg-gray-200 px-6 py-2 rounded-md h-10 w-full sm:w-auto">Cancel</button>
                                <button type="submit" className={`text-white px-6 py-2 rounded-md h-10 w-full sm:w-auto ${activeAction.type === 'ADD' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}>
                                    Confirm {activeAction.type}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            )}

            {activeAction.type === 'VIEW' && (
                <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 mx-4 sm:mx-0">
                    <div className="flex justify-between items-center mb-4 border-b pb-4">
                        <h3 className="text-xl font-bold">Ledger Details: {activeAction.investor.name}</h3>
                        <button onClick={closeForm} className="text-gray-500 hover:text-gray-800">Close</button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <div><p className="text-xs text-gray-500 uppercase tracking-wider font-bold">Total Profit Earned</p><p className="text-lg font-bold text-green-600">₹{(parseFloat(activeAction.investor.totalProfit) || 0).toLocaleString('en-IN')}</p></div>
                        <div><p className="text-xs text-gray-500 uppercase tracking-wider font-bold">Total Paid Out</p><p className="text-lg font-bold text-blue-600">₹{((parseFloat(activeAction.investor.totalProfit) || 0) - (parseFloat(activeAction.investor.pendingProfit) || 0)).toLocaleString('en-IN')}</p></div>
                        <div><p className="text-xs text-gray-500 uppercase tracking-wider font-bold">Pending Profit</p><p className="text-lg font-bold text-orange-600">₹{(parseFloat(activeAction.investor.pendingProfit) || 0).toLocaleString('en-IN')}</p></div>
                        <div><p className="text-xs text-gray-500 uppercase tracking-wider font-bold">Active Investment</p><p className="text-lg font-bold text-[#064e3b]">₹{(parseFloat(activeAction.investor.activeBalance) || 0).toLocaleString('en-IN')}</p></div>
                    </div>
                    <div className="max-h-64 overflow-y-auto overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead className="bg-gray-50">
                                <tr><th className="p-2 text-left">Date</th><th className="p-2 text-left">Type</th><th className="p-2 text-left">Amount</th><th className="p-2 text-left">Description</th></tr>
                            </thead>
                            <tbody className="divide-y">
                                {activeAction.investor.ledger?.map(entry => (
                                    <tr key={entry.id}>
                                        <td className="p-2">{new Date(entry.date).toLocaleDateString()}</td>
                                        <td className="p-2 font-semibold">{entry.type}</td>
                                        <td className={`p-2 font-bold ${entry.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>₹{entry.amount}</td>
                                        <td className="p-2 text-gray-500">{entry.description}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <div className="bg-white shadow overflow-x-auto sm:rounded-lg mx-4 sm:mx-0">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Active Balance</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Profit Earned</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-orange-600 uppercase tracking-wider">Pending Profit</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {investors.map((inv) => (
                            <tr key={inv.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{inv.name}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${inv.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{inv.status || 'Active'}</span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">₹{(parseFloat(inv.activeBalance) || 0).toLocaleString('en-IN')}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-semibold">₹{(parseFloat(inv.totalProfit) || 0).toLocaleString('en-IN')}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-orange-600 font-bold bg-orange-50/50">₹{(parseFloat(inv.pendingProfit) || 0).toLocaleString('en-IN')}</td>
                                <td className="px-6 py-4 text-right text-sm font-medium">
                                    <div className="flex flex-wrap items-center justify-end gap-2 min-w-[250px]">
                                        <button 
                                            onClick={() => setActiveAction({ type: 'VIEW', investor: inv })}
                                            className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                                        >
                                            View Ledger
                                        </button>
                                        <button 
                                            onClick={() => { setActiveAction({ type: 'ADD', investor: inv }); setShowForm(true); }}
                                            className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-green-700 bg-green-100 hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
                                        >
                                            + Fund
                                        </button>
                                        <button 
                                            onClick={() => { setActiveAction({ type: 'WITHDRAW', investor: inv }); setShowForm(true); }}
                                            className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-yellow-700 bg-yellow-100 hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 transition-colors"
                                        >
                                            - Withdraw
                                        </button>
                                        <button 
                                            onClick={() => openEdit(inv)}
                                            className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#064e3b] transition-colors"
                                        >
                                            Edit
                                        </button>
                                        <button 
                                            onClick={() => onDelete(inv.id)}
                                            className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Investors;