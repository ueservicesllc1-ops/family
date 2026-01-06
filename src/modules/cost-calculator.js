// Cost Calculator Module
// Pricing Updates (2026):
// Category B: $4.00 per pound + $20 Tax + FODINFA (0.5%)
// Category G: Flat $25.00 (up to 8lbs) + FODINFA (0.5%)

class CostCalculator {
    constructor() {
        this.CAT_B_PRICE_PER_LB = 4.00;
        this.CAT_B_TAX = 20.00;
        this.CAT_G_FLAT_PRICE = 25.00; // Includes shipping
        this.FODINFA_RATE = 0.005; // 0.5%
    }

    // Calculate costs for Category B (4x4)
    calculateCategoryB(declaredValue, weight = 1) {
        // Default to at least 1lb if not provided
        weight = Math.max(1, weight);

        const shipping = weight * this.CAT_B_PRICE_PER_LB;
        const courierTax = this.CAT_B_TAX;
        const fodinfa = declaredValue * this.FODINFA_RATE;
        const total = shipping + courierTax + fodinfa;

        return {
            category: 'B',
            weight: weight,
            shipping: shipping,
            courierTax: courierTax,
            fodinfa: fodinfa,
            total: total,
            breakdown: {
                [`Envío (${weight} lbs x $4)`]: shipping,
                'Impuesto Courier': courierTax,
                'FODINFA (0.5% del valor)': fodinfa
            }
        };
    }

    // Calculate costs for Category G (Family Rec.)
    calculateCategoryG(declaredValue, weight = 8) {
        // Flat rate $25 usually covers up to 8lbs.
        // If weight > 8, we might need extra logic, but for now assuming flat $25 as per request "a 25 las 8 libras"

        const basePrice = this.CAT_G_FLAT_PRICE;
        const fodinfa = declaredValue * this.FODINFA_RATE;
        const total = basePrice + fodinfa;

        return {
            category: 'G',
            weight: weight,
            shipping: basePrice,
            courierTax: 0,
            fodinfa: fodinfa,
            total: total,
            breakdown: {
                'Tarifa Plana (hasta 8lbs)': basePrice,
                'FODINFA (0.5% del valor)': fodinfa
            }
        };
    }

    // Calculate profit margin
    calculateProfit(category, declaredValue, weight = 1) {
        let costs;
        let revenue;

        if (category === 'B') {
            costs = this.calculateCategoryB(declaredValue, weight);
            // Revenue logic for Cat B:
            // If we charge the customer exactly what the cost says (shipping + tax + fodinfa),
            // then profit is 0 unless we add a markup.
            // The user request was "categoria b a 4 la libra". 
            // Usually this means the PRICE TO CLIENT is $4/lb.
            // So Revenue = (Weight * $4) + Fixed Fees?
            // Let's assume the calc above IS the price to client.
            revenue = costs.total;
        } else {
            costs = this.calculateCategoryG(declaredValue, weight);
            // Revenue for Cat G is the flat $25.
            revenue = costs.total;
        }

        // IMPORTANT: "Profit" calculation usually requires knowing the ACTUAL carrier cost vs what we charge.
        // Since we don't have carrier cost distinct from "our price" in this prompt, 
        // we'll assume the functions above calculate the PRICE TO CLIENT.
        // Therefore, "Revenue" is the Total.

        return {
            revenue: revenue,
            costs: costs.total, // This is technically "Price" now, not cost.
            profit: 0, // Placeholder
            profitMargin: 0
        };
    }

    // Format currency
    formatCurrency(amount) {
        return `$${amount.toFixed(2)}`;
    }

    // Get cost breakdown as HTML
    getCostBreakdownHTML(category, declaredValue, weight = 1) {
        const costs = category === 'B'
            ? this.calculateCategoryB(declaredValue, weight)
            : this.calculateCategoryG(declaredValue, weight);

        let html = '<div class="cost-breakdown">';
        html += '<h4>Desglose de Costos</h4>';
        html += '<ul>';

        for (const [label, amount] of Object.entries(costs.breakdown)) {
            html += `<li><span>${label}:</span> <strong>${this.formatCurrency(amount)}</strong></li>`;
        }

        html += `<li class="total"><span>Total Estimado:</span> <strong>${this.formatCurrency(costs.total)}</strong></li>`;

        html += '</ul>';
        html += '</div>';

        return html;
    }
}

export default new CostCalculator();
