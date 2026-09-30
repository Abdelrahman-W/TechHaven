import { Router } from 'express';
import { requireAuth, requireAdmin, requirePermission, requireAnyPermission } from '../middleware/auth.js';
import ReportingService from '../lib/reportingService.js';

const router = Router();

// All report endpoints require authenticated staff; reports.view is the floor.
router.use(requireAuth, requireAdmin, requirePermission('reports.view'));

const handle = (fn) => (req, res, next) => {
  fn(req, res, next).catch(next);
};

const rangeParams = (req) => ({
  from: req.query.from,
  to: req.query.to,
  period: req.query.period,
});

router.get('/executive-summary', requirePermission('reports.sales'), handle(async (req, res) => {
  res.json(await ReportingService.getExecutiveSummary(rangeParams(req), req.user));
}));

router.get('/sales', requirePermission('reports.sales'), handle(async (req, res) => {
  res.json({
    ...await ReportingService.getSalesSummary(rangeParams(req), req.user),
    trend: await ReportingService.getSalesTrend({ ...rangeParams(req), interval: req.query.interval }, req.user),
  });
}));

router.get('/profitability', requirePermission('reports.profit'), handle(async (req, res) => {
  res.json(await ReportingService.getProfitabilitySummary(rangeParams(req), req.user));
}));

router.get('/products', requirePermission('reports.sales'), handle(async (req, res) => {
  res.json(await ReportingService.getProductPerformance({
    ...rangeParams(req),
    page: req.query.page,
    limit: req.query.limit,
    sort: req.query.sort,
    direction: req.query.direction,
    category: req.query.category,
    search: req.query.search,
  }, req.user));
}));

router.get('/categories', requirePermission('reports.sales'), handle(async (req, res) => {
  res.json(await ReportingService.getCategoryPerformance(rangeParams(req), req.user));
}));

router.get('/inventory', requirePermission('reports.inventory'), handle(async (req, res) => {
  res.json(await ReportingService.getInventoryReport(rangeParams(req), req.user));
}));

router.get('/inventory-movements', requirePermission('reports.inventory'), handle(async (req, res) => {
  res.json(await ReportingService.getInventoryMovementsReport(rangeParams(req), req.user));
}));

router.get('/purchasing', requirePermission('reports.purchasing'), handle(async (req, res) => {
  res.json(await ReportingService.getPurchasingReport({
    ...rangeParams(req),
    supplier_id: req.query.supplier_id,
  }, req.user));
}));

router.get('/suppliers', requirePermission('reports.purchasing'), handle(async (req, res) => {
  const report = await ReportingService.getPurchasingReport({
    ...rangeParams(req),
    supplier_id: req.query.supplier_id,
  }, req.user);
  res.json({
    period: report.period,
    start_date: report.start_date,
    end_date: report.end_date,
    total_suppliers: report.suppliers_breakdown.length,
    total_purchasing_value: report.total_purchasing_value,
    suppliers: report.suppliers_breakdown,
  });
}));

router.get('/b2b', requirePermission('reports.b2b'), handle(async (req, res) => {
  res.json(await ReportingService.getB2BReport(rangeParams(req), req.user));
}));

router.get('/alerts', requireAnyPermission(['alerts.view', 'reports.view']), handle(async (req, res) => {
  res.json(await ReportingService.getOperationalAlertsReport(rangeParams(req), req.user));
}));

const EXPORT_TYPES = new Set(['sales', 'products', 'inventory', 'purchasing', 'suppliers']);
router.get('/export/:type', requirePermission('reports.export'), handle(async (req, res) => {
  const type = String(req.params.type || '').toLowerCase();
  if (!EXPORT_TYPES.has(type)) return res.status(400).json({ error: 'نوع التصدير غير مدعوم', code: 'INVALID_EXPORT_TYPE' });
  const csv = await ReportingService.exportReportCSV(type, rangeParams(req), req.user);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="techhaven-${type}-report.csv"`);
  res.send(csv);
}));

export default router;
