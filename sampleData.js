export const sampleInvestors = [
    { 
        id: '1', name: 'Ahmad Abdullah', mobile: '+971 50 123 4567', bankDetails: 'Emirates NBD, Acct: 10293847', 
        address: 'Dubai, UAE', status: 'Active', activeBalance: 500000, totalProfit: 15000,
        ledger: [
            { id: 'L1', type: 'INVESTMENT_ADDED', amount: 500000, date: new Date().toISOString(), description: 'Initial Investment' },
            { id: 'L2', type: 'PROFIT_EARNED', amount: 15000, date: new Date().toISOString(), description: 'Profit from early shipments' }
        ]
    },
    { 
        id: '2', name: 'Zayed Al-Fayed', mobile: '+971 55 987 6543', bankDetails: 'ADCB, Acct: 56473829', 
        address: 'Abu Dhabi, UAE', status: 'Active', activeBalance: 300000, totalProfit: 8500,
        ledger: [
            { id: 'L3', type: 'INVESTMENT_ADDED', amount: 300000, date: new Date().toISOString(), description: 'Initial Investment' },
            { id: 'L4', type: 'PROFIT_EARNED', amount: 8500, date: new Date().toISOString(), description: 'Profit from early shipments' }
        ]
    },
    { 
        id: '3', name: 'Omar Youssef', mobile: '+966 50 111 2222', bankDetails: 'Al Rajhi Bank, Acct: 99887766', 
        address: 'Riyadh, KSA', status: 'Active', activeBalance: 750000, totalProfit: 22000,
        ledger: [
            { id: 'L5', type: 'INVESTMENT_ADDED', amount: 750000, date: new Date().toISOString(), description: 'Initial Investment' },
            { id: 'L6', type: 'PROFIT_EARNED', amount: 22000, date: new Date().toISOString(), description: 'Profit from early shipments' }
        ]
    }
];

export const sampleTransactions = [
    {
        saleId: 'SHP-1001',
        invoiceAmount: 120000,
        actualPurchaseCost: 80000,
        netProfit: "35000.00",
        timestamp: new Date().toISOString(),
        allocations: [
            { investorId: '1', investorName: 'Ahmad Abdullah', amountUsed: "40000.00", profitEarned: "17500.00" },
            { investorId: '2', investorName: 'Zayed Al-Fayed', amountUsed: "40000.00", profitEarned: "17500.00" }
        ],
        retainedCompanyProfit: "0.00"
    }
];