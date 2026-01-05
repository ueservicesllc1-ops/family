// Cost Calculator Module
// FODINFA applies ONLY to declared merchandise value, NOT to shipping costs

class CostCalculator {
    constructor() {
        this.BASE_SHIPPING = 18.50;
        this.COURIER_TAX = 20.00;
        this.FODINFA_RATE = 0.005; // 0.5%
        this.CLIENT_PRICE = 25.00;
    }

    // Calculate costs for Category B (without consular registration)
    calculateCategoryB(declaredValue) {
        const shipping = this.BASE_SHIPPING;
        const courierTax = this.COURIER_TAX;
        const fodinfa = declaredValue * this.FODINFA_RATE;
        const total = shipping + courierTax + fodinfa;

        return {
            category: 'B',
            shipping: shipping,
            courierTax: courierTax,
            fodinfa: fodinfa,
            total: total,
            breakdown: {
                'Tarifa de envío': shipping,
                'Impuesto Courier': courierTax,
                'FODINFA (0.5% del valor)': fodinfa
            }
        };
    }

    // Calculate costs for Category G (with consular registration)
    calculateCategoryG(declaredValue) {
        const shipping = this.BASE_SHIPPING;
        const fodinfa = declaredValue * this.FODINFA_RATE;
        const total = shipping + fodinfa;

        return {
            category: 'G',
            shipping: shipping,
            courierTax: 0,
            fodinfa: fodinfa,
            total: total,
            breakdown: {
                'Tarifa de envío': shipping,
                'FODINFA (0.5% del valor)': fodinfa
            }
        };
    }

    // Calculate profit margin
    calculateProfit(category, declaredValue) {
        let costs;
        if (category === 'B') {
            costs = this.calculateCategoryB(declaredValue);
        } else {
            costs = this.calculateCategoryG(declaredValue);
        }

        const revenue = this.CLIENT_PRICE;
        const profit = revenue - costs.total;
        const profitMargin = (profit / revenue) * 100;

        return {
            revenue: revenue,
            costs: costs.total,
            profit: profit,
            profitMargin: profitMargin
        };
    }

    // Format currency
    formatCurrency(amount) {
        return `$${amount.toFixed(2)}`;
    }

    // Get cost breakdown as HTML
    getCostBreakdownHTML(category, declaredValue) {
        const costs = category === 'B'
            ? this.calculateCategoryB(declaredValue)
            : this.calculateCategoryG(declaredValue);

        let html = '<div class="cost-breakdown">';
        html += '<h4>Desglose de Costos</h4>';
        html += '<ul>';

        for (const [label, amount] of Object.entries(costs.breakdown)) {
            html += `<li><span>${label}:</span> <strong>${this.formatCurrency(amount)}</strong></li>`;
        }

        html += `<li class="total"><span>Total a pagar:</span> <strong>${this.formatCurrency(costs.total)}</strong></li>`;
        html += `<li class="revenue"><span>Cobro al cliente:</span> <strong>${this.formatCurrency(this.CLIENT_PRICE)}</strong></li>`;

        const profit = this.calculateProfit(category, declaredValue);
        const profitClass = profit.profit > 0 ? 'profit-positive' : 'profit-negative';
        html += `<li class="${profitClass}"><span>Ganancia:</span> <strong>${this.formatCurrency(profit.profit)}</strong></li>`;

        html += '</ul>';
        html += '</div>';

        return html;
    }
}

export default new CostCalculator();
