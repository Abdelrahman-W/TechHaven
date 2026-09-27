/**
 * TechHaven COGS & Historical Profitability Domain Service (ERP-Lite Batch 03)
 * Authoritative calculations for Cost of Goods Sold, Gross Profit, and Gross Margin.
 */

export class CogsService {
  /**
   * Calculate profitability breakdown for a single order item based on its historical snapshot.
   */
  static calculateItemProfit(item) {
    if (!item) return null;

    const quantity = Math.max(1, parseInt(item.quantity, 10) || 1);
    const unitPrice = Number(item.unit_price ?? item.price ?? 0);
    const unitCost = (item.unit_cost !== undefined && item.unit_cost !== null && !isNaN(Number(item.unit_cost)))
      ? Math.max(0, Number(item.unit_cost))
      : null;

    const itemRevenue = unitPrice * quantity;
    const itemCogs = unitCost !== null ? unitCost * quantity : null;
    const grossProfit = itemCogs !== null ? itemRevenue - itemCogs : null;
    const grossMargin = (itemCogs !== null && itemRevenue > 0)
      ? Number(((grossProfit / itemRevenue) * 100).toFixed(2))
      : null;

    return {
      productId: item.product_id || item.productId || item.id,
      productName: item.product_name || item.name || 'منتج',
      quantity,
      unitPrice,
      unitCost,
      revenue: itemRevenue,
      cogs: itemCogs,
      grossProfit,
      grossMargin,
      hasCost: unitCost !== null,
    };
  }

  /**
   * Calculate profitability summary for a single order.
   */
  static calculateOrderProfit(order) {
    if (!order) return null;

    const rawItems = order.items || order.order_items || [];
    const items = Array.isArray(rawItems) ? rawItems : [];

    let totalRevenue = 0;
    let totalCogs = 0;
    let itemsCount = 0;
    let itemsWithCostCount = 0;

    const itemBreakdown = items.map(item => {
      const breakdown = this.calculateItemProfit(item);
      if (breakdown) {
        totalRevenue += breakdown.revenue;
        itemsCount += breakdown.quantity;
        if (breakdown.hasCost) {
          totalCogs += breakdown.cogs;
          itemsWithCostCount += breakdown.quantity;
        }
      }
      return breakdown;
    });

    const isComplete = itemsCount > 0 && itemsWithCostCount === itemsCount;
    const costCoverage = itemsCount > 0 ? Number(((itemsWithCostCount / itemsCount) * 100).toFixed(1)) : 0;
    const grossProfit = isComplete ? totalRevenue - totalCogs : (itemsWithCostCount > 0 ? totalRevenue - totalCogs : null);
    const grossMargin = (grossProfit !== null && totalRevenue > 0)
      ? Number(((grossProfit / totalRevenue) * 100).toFixed(2))
      : 0;

    return {
      orderId: order.id,
      orderReference: order.reference || order.order_number,
      status: order.status,
      revenue: totalRevenue,
      cogs: itemsWithCostCount > 0 ? totalCogs : null,
      grossProfit,
      grossMargin: totalRevenue > 0 ? grossMargin : 0,
      costCoverage,
      isComplete,
      coverageStatus: isComplete ? 'FULL' : itemsWithCostCount > 0 ? 'PARTIAL' : 'UNAVAILABLE',
      items: itemBreakdown,
    };
  }

  /**
   * Calculate aggregated commercial profitability analytics across multiple orders.
   */
  static calculateAggregateProfit(orders = [], options = {}) {
    const list = Array.isArray(orders) ? orders : [];
    
    // Exclude cancelled orders from authoritative COGS & Gross Profit
    const eligibleOrders = list.filter(o => {
      if (o.status === 'cancelled') return false;
      if (options.startDate && new Date(o.created_at) < new Date(options.startDate)) return false;
      if (options.endDate && new Date(o.created_at) > new Date(options.endDate)) return false;
      return true;
    });

    let totalRevenue = 0;
    let totalCogs = 0;
    let totalUnitsSold = 0;
    let unitsWithCost = 0;

    for (const order of eligibleOrders) {
      const orderSummary = this.calculateOrderProfit(order);
      if (orderSummary) {
        totalRevenue += orderSummary.revenue;
        if (orderSummary.cogs !== null) {
          totalCogs += orderSummary.cogs;
        }
        for (const it of (orderSummary.items || [])) {
          if (it) {
            totalUnitsSold += it.quantity;
            if (it.hasCost) {
              unitsWithCost += it.quantity;
            }
          }
        }
      }
    }

    const isComplete = totalUnitsSold > 0 && unitsWithCost === totalUnitsSold;
    const coveragePercentage = totalUnitsSold > 0
      ? Number(((unitsWithCost / totalUnitsSold) * 100).toFixed(1))
      : 100;

    const grossProfit = totalRevenue - totalCogs;
    const grossMargin = totalRevenue > 0
      ? Number(((grossProfit / totalRevenue) * 100).toFixed(2))
      : 0;

    return {
      totalOrders: eligibleOrders.length,
      totalUnitsSold,
      unitsWithCost,
      coveragePercentage,
      coverageStatus: isComplete ? 'FULL' : unitsWithCost > 0 ? 'PARTIAL' : 'UNAVAILABLE',
      totalRevenue,
      totalCogs: unitsWithCost > 0 ? totalCogs : null,
      grossProfit: unitsWithCost > 0 ? grossProfit : null,
      grossMargin: totalRevenue > 0 && unitsWithCost > 0 ? grossMargin : 0,
    };
  }
}

export default CogsService;
