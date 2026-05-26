import React, { useMemo } from 'react';

const Dashboard = ({ transactions, investors, onDelete, onEdit, onDuplicate, onNavigate }) => {
    const totalInvestmentCapital = investors.reduce((sum, inv) => sum + (parseFloat(inv.activeBalance) || 0), 0);
    const totalProfitDistributed = investors.reduce((sum, inv) => sum + ((parseFloat(inv.totalProfit) || 0) - (parseFloat(inv.pendingProfit) || 0)), 0);
    const totalSales = transactions.length;
    const companyNetProfit = transactions.reduce((sum, t) => sum + parseFloat(t.retainedCompanyProfit || 0), 0);
    const businessTurnover = transactions.reduce((sum, t) => sum + parseFloat(t.invoiceAmount || 0), 0);
    const pendingProfitLiability = investors.reduce((sum, inv) => sum + (parseFloat(inv.pendingProfit) || 0), 0);

    const activeInvestorsCount = investors.filter(i => i.status !== 'Inactive').length;
    const totalExpenses = transactions.reduce((sum, t) => sum + (t.expenses ? t.expenses.reduce((eSum, e) => eSum + parseFloat(e.amount || 0), 0) : 0), 0);
    const totalNetProfit = transactions.reduce((sum, t) => sum + parseFloat(t.netProfit || 0), 0);
    const averageProfitMargin = businessTurnover > 0 ? ((totalNetProfit / businessTurnover) * 100).toFixed(2) : '0.00';
    
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentSalesCount = transactions.filter(t => new Date(t.timestamp) >= thirtyDaysAgo).length;

    return (
        <div className="space-y-8 px-4 sm:px-0 pb-12 font-sans">
            {/* Header & Quick Actions */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-gradient-to-r from-[#064e3b] via-[#065f46] to-[#0f766e] p-8 rounded-3xl shadow-[0_10px_30px_-10px_rgba(6,78,59,0.5)] text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -mr-20 -mt-20 blur-3xl pointer-events-none"></div>
                <div className="relative z-10 flex items-center gap-5">
                    <img src="/images/logo img.png" alt="Bahara Logo" className="h-16 w-auto object-contain drop-shadow-lg" />
                    <div>
                        <h1 className="text-3xl font-black text-[#fef3c7] tracking-tight">Executive Dashboard</h1>
                        <p className="text-sm text-[#d1fae5] mt-1.5 opacity-90 font-medium">Bahara International Group Financial Overview</p>
                    </div>
                </div>
                <div className="flex flex-wrap gap-3 relative z-10 w-full md:w-auto">
                    <button onClick={() => onNavigate && onNavigate('investors')} className="flex-1 md:flex-none bg-[#fef3c7] text-[#064e3b] hover:bg-white font-bold py-2.5 px-5 rounded-xl shadow-sm transition-all text-sm flex items-center justify-center gap-2 border border-transparent hover:border-[#fef3c7]">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
                        Add Investor
                    </button>
                    <button onClick={() => onNavigate && onNavigate('allocation')} className="flex-1 md:flex-none bg-[#064e3b] border border-[#fef3c7]/30 hover:bg-[#047857] text-[#fef3c7] font-bold py-2.5 px-5 rounded-xl shadow-sm transition-all text-sm flex items-center justify-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                        New Sale
                    </button>
                </div>
            </div>
            
            {/* Primary Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Card 1: Investment Capital */}
                <div className="bg-white rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:shadow-lg transition-all duration-300 p-6 border border-gray-100 flex items-center gap-5 group">
                    <div className="w-16 h-16 rounded-2xl bg-green-50 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                        <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"></path></svg>
                    </div>
                    <div>
                        <p className="text-[11px] font-black text-gray-400 uppercase tracking-wider">Total Investment Capital</p>
                        <p className="text-2xl sm:text-3xl font-black text-gray-900 mt-1">₹{totalInvestmentCapital.toLocaleString('en-IN')}</p>
                    </div>
                </div>

                {/* Card 2: Profit Distributed */}
                <div className="bg-white rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:shadow-lg transition-all duration-300 p-6 border border-gray-100 flex items-center gap-5 group">
                    <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                        <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    </div>
                    <div>
                        <p className="text-[11px] font-black text-gray-400 uppercase tracking-wider">Profit Distributed</p>
                        <p className="text-2xl sm:text-3xl font-black text-gray-900 mt-1">₹{totalProfitDistributed.toLocaleString('en-IN')}</p>
                    </div>
                </div>

                {/* Card 3: Total Sales */}
                <div className="bg-white rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:shadow-lg transition-all duration-300 p-6 border border-gray-100 flex items-center gap-5 group">
                    <div className="w-16 h-16 rounded-2xl bg-purple-50 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                        <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path></svg>
                    </div>
                    <div>
                        <p className="text-[11px] font-black text-gray-400 uppercase tracking-wider">Total Sales</p>
                        <p className="text-2xl sm:text-3xl font-black text-gray-900 mt-1">{totalSales}</p>
                    </div>
                </div>

                {/* Card 4: Company Net Profit */}
                <div className="bg-white rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:shadow-lg transition-all duration-300 p-6 border border-gray-100 flex items-center gap-5 group">
                    <div className="w-16 h-16 rounded-2xl bg-[#fef3c7] flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                        <svg className="w-8 h-8 text-[#d97706]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
                    </div>
                    <div>
                        <p className="text-[11px] font-black text-gray-400 uppercase tracking-wider">Company Net Profit</p>
                        <p className="text-2xl sm:text-3xl font-black text-[#d97706] mt-1">₹{companyNetProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                    </div>
                </div>

                {/* Card 5: Business Turnover */}
                <div className="bg-white rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:shadow-lg transition-all duration-300 p-6 border border-gray-100 flex items-center gap-5 group">
                    <div className="w-16 h-16 rounded-2xl bg-teal-50 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                        <svg className="w-8 h-8 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg>
                    </div>
                    <div>
                        <p className="text-[11px] font-black text-gray-400 uppercase tracking-wider">Business Turnover</p>
                        <p className="text-2xl sm:text-3xl font-black text-gray-900 mt-1">₹{businessTurnover.toLocaleString('en-IN')}</p>
                    </div>
                </div>

                {/* Card 6: Pending Profit */}
                <div className="bg-white rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:shadow-lg transition-all duration-300 p-6 border border-gray-100 flex items-center gap-5 group">
                    <div className="w-16 h-16 rounded-2xl bg-orange-50 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                        <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    </div>
                    <div>
                        <p className="text-[11px] font-black text-gray-400 uppercase tracking-wider">Pending Profit</p>
                        <p className="text-2xl sm:text-3xl font-black text-orange-600 mt-1">₹{pendingProfitLiability.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                    </div>
                </div>
            </div>

            {/* Secondary Insights & Charts Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Left Col: Secondary Cards */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white p-6 rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] border border-gray-100">
                        <h3 className="text-xs font-black text-gray-400 uppercase tracking-wider mb-5 border-b border-gray-100 pb-3">Business Insights</h3>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center group">
                                <span className="text-sm text-gray-500 font-bold">Active Investors</span>
                                <span className="text-sm font-black text-gray-900 bg-gray-100 px-3 py-1 rounded-lg group-hover:bg-gray-200 transition-colors">{activeInvestorsCount}</span>
                            </div>
                            <div className="flex justify-between items-center group">
                                <span className="text-sm text-gray-500 font-bold">Total Expenses</span>
                                <span className="text-sm font-black text-red-600 bg-red-50 px-3 py-1 rounded-lg group-hover:bg-red-100 transition-colors">₹{totalExpenses.toLocaleString('en-IN')}</span>
                            </div>
                            <div className="flex justify-between items-center group">
                                <span className="text-sm text-gray-500 font-bold">Avg Profit Margin</span>
                                <span className="text-sm font-black text-green-600 bg-green-50 px-3 py-1 rounded-lg group-hover:bg-green-100 transition-colors">{averageProfitMargin}%</span>
                            </div>
                            <div className="flex justify-between items-center group">
                                <span className="text-sm text-gray-500 font-bold">Sales (Last 30 Days)</span>
                                <span className="text-sm font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-lg group-hover:bg-blue-100 transition-colors">{recentSalesCount}</span>
                            </div>
                        </div>
                    </div>

                    {/* Mini Chart: Top Investors */}
                    <div className="bg-gradient-to-b from-[#064e3b] to-[#047857] p-6 rounded-2xl shadow-lg border border-[#065f46] text-white relative overflow-hidden">
                        <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-1/4 translate-y-1/4">
                            <svg className="w-32 h-32" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd"></path></svg>
                        </div>
                        <h3 className="text-xs font-black text-[#fef3c7] uppercase tracking-wider mb-5 border-b border-[#065f46] pb-3 relative z-10">Top Investors (By Balance)</h3>
                        <div className="space-y-5 relative z-10">
                            {[...investors].sort((a, b) => parseFloat(b.activeBalance || 0) - parseFloat(a.activeBalance || 0)).slice(0, 4).map((inv, idx) => (
                                <div key={inv.id || idx}>
                                    <div className="flex justify-between text-xs mb-1.5">
                                        <span className="font-bold text-[#d1fae5]">{inv.name}</span>
                                        <span className="font-black text-white">₹{parseFloat(inv.activeBalance || 0).toLocaleString('en-IN')}</span>
                                    </div>
                                    <div className="w-full bg-[#064e3b] rounded-full h-2 shadow-inner overflow-hidden">
                                        <div className="bg-gradient-to-r from-[#fef3c7] to-[#d97706] h-full rounded-full transition-all duration-1000" style={{ width: `${Math.min((parseFloat(inv.activeBalance || 0) / (parseFloat(investors[0]?.activeBalance) || 1)) * 100, 100)}%` }}></div>
                                    </div>
                                </div>
                            ))}
                            {investors.length === 0 && <p className="text-xs text-[#a7f3d0] font-medium">No investors found.</p>}
                        </div>
                    </div>
                </div>

                {/* Right Col: Recent Activity & Visuals */}
                <div className="lg:col-span-2 space-y-6">
                    
                    {/* Visual Charts Section (CSS Based) */}
                    <div className="bg-white p-6 rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] border border-gray-100">
                        <h3 className="text-xs font-black text-gray-400 uppercase tracking-wider mb-8 border-b border-gray-100 pb-3">Monthly Sales & Revenue Overview</h3>
                        <div className="h-52 flex items-end gap-2 sm:gap-6 px-2">
                            {/* Mocked Chart Bars based on transactions */}
                            {transactions.length === 0 ? (
                                <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 gap-3 pb-8">
                                    <svg className="w-12 h-12 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
                                    <span className="text-sm font-bold">No sufficient data for chart</span>
                                </div>
                            ) : (
                                (() => {
                                    const months = {};
                                    transactions.forEach(t => {
                                        const d = new Date(t.timestamp || Date.now());
                                        const m = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2, '0')}`;
                                        if(!months[m]) months[m] = { sales: 0, profit: 0 };
                                        months[m].sales += parseFloat(t.invoiceAmount || 0);
                                        months[m].profit += parseFloat(t.netProfit || 0);
                                    });
                                    
                                    const sortedMonths = Object.keys(months).sort().slice(-8); // Last 8 months
                                    const maxSale = Math.max(...sortedMonths.map(m => months[m].sales), 1);
                                    
                                    return sortedMonths.map(m => {
                                        const heightPct = Math.max((months[m].sales / maxSale) * 100, 10);
                                        const label = new Date(m + '-01').toLocaleDateString(undefined, { month: 'short' });
                                        return (
                                            <div key={m} className="flex-1 flex flex-col items-center gap-3 group relative h-full justify-end">
                                                <div className="w-full bg-blue-100 rounded-t-lg relative flex items-end justify-center hover:bg-blue-200 transition-colors shadow-inner" style={{ height: `${heightPct}%` }}>
                                                    <div className="w-full bg-[#064e3b] rounded-t-md opacity-80 transition-all group-hover:opacity-100" style={{ height: `${Math.max((months[m].profit / months[m].sales) * 100, 0)}%` }}></div>
                                                    {/* Tooltip */}
                                                    <div className="absolute bottom-full mb-3 hidden group-hover:block bg-gray-900 text-white text-xs p-3 rounded-xl whitespace-nowrap z-10 shadow-xl border border-gray-700">
                                                        <p className="font-bold text-gray-400 mb-1 border-b border-gray-700 pb-1">{new Date(m + '-01').toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</p>
                                                        <p>Turnover: <span className="font-bold text-[#fef3c7]">₹{months[m].sales.toLocaleString('en-IN')}</span></p>
                                                        <p>Profit: <span className="font-bold text-[#a7f3d0]">₹{months[m].profit.toLocaleString('en-IN')}</span></p>
                                                    </div>
                                                </div>
                                                <span className="text-[10px] font-bold text-gray-500 uppercase">{label}</span>
                                            </div>
                                        );
                                    });
                                })()
                            )}
                        </div>
                        <div className="flex items-center justify-center gap-8 mt-6 pt-5 border-t border-gray-100">
                            <div className="flex items-center gap-2.5"><div className="w-3.5 h-3.5 bg-blue-100 border border-blue-200 rounded"></div><span className="text-xs text-gray-600 font-bold uppercase tracking-wider">Turnover</span></div>
                            <div className="flex items-center gap-2.5"><div className="w-3.5 h-3.5 bg-[#064e3b] border border-[#047857] rounded opacity-80"></div><span className="text-xs text-gray-600 font-bold uppercase tracking-wider">Net Profit</span></div>
                        </div>
                    </div>

                    {/* Recent Transactions List */}
                    <div className="bg-white rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] border border-gray-100 overflow-hidden">
                        <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white flex justify-between items-center">
                            <h2 className="text-xs font-black text-gray-400 uppercase tracking-wider">Recent Sales & Allocations</h2>
                            <button onClick={() => onNavigate && onNavigate('dashboard')} className="text-xs font-bold text-[#064e3b] hover:text-[#047857] bg-green-50 hover:bg-green-100 px-3 py-1.5 rounded-lg transition-colors">View All &rarr;</button>
                        </div>
                        <ul className="divide-y divide-gray-50">
                            {transactions.slice(0, 5).map((t, idx) => (
                                <li key={idx} className="p-5 hover:bg-gray-50 transition-colors group">
                                    <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4">
                                        <div className="flex items-start gap-4">
                                            <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center flex-shrink-0 text-gray-500 group-hover:bg-[#064e3b] group-hover:text-white transition-colors">
                                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-black text-gray-900">Sale ID: {t.saleId || 'N/A'}</h4>
                                                <p className="text-xs text-gray-500 mt-1">Inv: <span className="font-bold text-gray-700">₹{parseFloat(t.invoiceAmount || 0).toLocaleString('en-IN')}</span> • Cost: <span className="font-bold text-gray-700">₹{parseFloat(t.actualPurchaseCost || 0).toLocaleString('en-IN')}</span></p>
                                                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mt-1.5">{new Date(t.timestamp || Date.now()).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' })}</p>
                                            </div>
                                        </div>
                                        <div className="flex flex-col lg:items-end gap-3 w-full lg:w-auto mt-2 lg:mt-0 lg:pl-4 border-t border-dashed border-gray-100 lg:border-t-0 pt-3 lg:pt-0">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Net Profit</span>
                                                <span className="text-sm font-black text-[#064e3b] bg-[#d1fae5] px-3 py-1.5 rounded-lg shadow-sm border border-[#a7f3d0]">₹{parseFloat(t.netProfit || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
                                            </div>
                                            <div className="flex gap-2 w-full justify-start lg:justify-end mt-1">
                                                <button onClick={() => onEdit(t)} className="text-[11px] font-bold text-blue-600 hover:text-white bg-blue-50 hover:bg-blue-600 px-4 py-2 rounded-lg transition-colors border border-blue-100 hover:border-blue-600 shadow-sm">Edit</button>
                                                <button onClick={() => onDuplicate(t)} className="text-[11px] font-bold text-purple-600 hover:text-white bg-purple-50 hover:bg-purple-600 px-4 py-2 rounded-lg transition-colors border border-purple-100 hover:border-purple-600 shadow-sm">Duplicate</button>
                                                <button onClick={() => onDelete(t.saleId)} className="text-[11px] font-bold text-red-600 hover:text-white bg-red-50 hover:bg-red-600 px-4 py-2 rounded-lg transition-colors border border-red-100 hover:border-red-600 shadow-sm">Delete</button>
                                            </div>
                                        </div>
                                    </div>
                                </li>
                            ))}
                            {transactions.length === 0 && (
                                <li className="p-12 text-center flex flex-col items-center">
                                    <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4 border-2 border-dashed border-gray-200">
                                        <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path></svg>
                                    </div>
                                    <p className="text-sm text-gray-500 font-bold mb-1">No recent transactions.</p>
                                    <p className="text-xs text-gray-400 mb-4">Start by creating a new sale allocation.</p>
                                    <button onClick={() => onNavigate && onNavigate('allocation')} className="text-xs font-bold text-white bg-[#064e3b] hover:bg-[#047857] px-5 py-2.5 rounded-xl shadow-sm transition-colors">Create Sale</button>
                                </li>
                            )}
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;