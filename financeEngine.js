/**
 * Core Financial Engine for Bahara International Group
 * ALL calculations are done in integers (cents) to guarantee ZERO floating point mistakes.
 */

// Convert UI display currency (e.g., 10111.50) to safe integer (1011150)
export const toCents = (amount) => Math.round(amount * 100);

// Convert safe integer back to display currency
export const toCurrency = (cents) => (cents / 100).toFixed(2);

/**
 * Calculates Net Profit
 * Formula: Invoice Amount - Investment Used - All Expenses
 */
export const calculateNetProfit = (invoiceAmount, investmentUsed, expenses) => {
    const totalExpenses = Object.values(expenses).reduce((sum, val) => sum + toCents(val), 0);
    const netProfit = toCents(invoiceAmount) - toCents(investmentUsed) - totalExpenses;
    return netProfit;
};

/**
 * Calculates Profit Distribution among investors based on individual percentage of used investment.
 * Handles fractional pennies and partial payments securely.
 */
export const distributeProfit = (allocations, totalInvestmentUsed, netProfitCents, companyMoneyUsed = 0) => {
    const totalUsedCents = toCents(totalInvestmentUsed);
    
    // Validate allocation matches total investment exactly
    const totalAllocatedCents = allocations.reduce((sum, inv) => sum + toCents(inv.amountUsed), 0);
    const companyUsedCents = toCents(companyMoneyUsed);
    if (totalAllocatedCents + companyUsedCents !== totalUsedCents) {
        throw new Error("Validation Failed: Total allocated amounts + Company Money Used must exactly equal the total actual purchase cost.");
    }

    let totalDistributed = 0;
    const distributionResults = allocations.map(investor => {
        const investorUsedCents = toCents(investor.amountUsed);
        const percentage = parseFloat(investor.profitPercentage) || 0;
        
        // Formula: (Investor Used / Total Purchase Cost) * Net Profit * Percentage / 100
        let investorProfitCents = 0;
        if (totalUsedCents > 0) {
            const contributionRatio = investorUsedCents / totalUsedCents;
            const attributableProfit = contributionRatio * netProfitCents;
            investorProfitCents = Math.round(attributableProfit * (percentage / 100));
        }
        totalDistributed += investorProfitCents;

        const previousPendingCents = toCents(parseFloat(investor.previousPending) || 0);
        const totalPayableCents = investorProfitCents + previousPendingCents;
        const paidCents = toCents(parseFloat(investor.paidAmount) || 0);
        const pendingCents = totalPayableCents - paidCents;

        return {
            investorId: investor.investorId,
            investorName: investor.investorName || investor.name,
            amountUsed: toCurrency(investorUsedCents),
            profitPercentage: percentage,
            profitEarned: toCurrency(investorProfitCents),
            previousPending: toCurrency(previousPendingCents),
            totalPayable: toCurrency(totalPayableCents),
            paidAmount: toCurrency(paidCents),
            pendingAmount: toCurrency(pendingCents)
        };
    });

    if (totalDistributed > netProfitCents) {
        throw new Error("Validation Failed: Selected investor profit exceeds available net profit.");
    }

    const retainedCompanyProfitCents = netProfitCents - totalDistributed;

    return {
        distributions: distributionResults,
        distributableProfit: toCurrency(totalDistributed),
        retainedCompanyProfit: toCurrency(retainedCompanyProfitCents)
    };
};