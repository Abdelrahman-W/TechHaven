import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useParams } from 'react-router-dom';
import TrendingUp from 'lucide-react';
import DollarSign from 'lucide-react';
import ShoppingBag from 'lucide-react';
import Users from 'lucide-react';
import Layers from 'lucide-react';
import ArrowUpRight from 'lucide-react';
import ArrowDownRight from 'lucide-react';
import CheckCircle2 from 'lucide-react';
import Clock from 'lucide-react';
import Card, CardHeader, CardBody, CardFooter, CardTitle, CardSubtitle, Spinner, Table, TableHead, TableRow, TableCell, TableBody, TableContainer from 'lucide-react';

export default function Reports() {
  const { period } = useParams();
  const { logout } = useAuth();
  const [reportType, setReportType] = useState('executive');
  const [params, setParams] = useState({
    from: '',
    to: '',
    period: '30d',
    interval: 'daily',
    sort: 'revenue',
    direction: 'desc',
    page: 1,
    limit: 25,
  });
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const reportFn = {
        executive: () => ReportingService.getExecutiveSummary(
          { from: params.from, to: params.to, period: params.period },
          req.user
        ),
        sales: () => ReportingService.getSalesSummary(params, req.user),
        profitability: () => ReportingService.getProfitabilitySummary(params, req.user),
        products: () => ReportingService.getProductPerformance(params, req.user),
        categories: () => ReportingService.getCategoryPerformance(params, req.user),
        inventory: () => ReportingService.getInventoryReport(params, req.user),
        purchasing: () => ReportingService.getPurchasingReport({
          ...params,
          supplier_id: params.supplier_id || params.supplier,
        }, req.user),
        b2b: () => ReportingService.getB2BReport(params, req.user),
        alerts: () => ReportingService.getOperationalAlertsReport(params, req.user),
      };
      const result = await reportFn[reportType];
      setData(result.data);
      setTotal(result.pagination?.total || 0);
      setTotalPages(result.pagination?.totalPages || 1);
    } catch (err) {
      setError(err.message || 'فشل تحميل البيانات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [params]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setParams(prev => ({ ...prev, [name]: value }));
  };

  const handleSortChange = (e) => {
    setParams(prev => ({ ...prev, sort: e.target.value, direction: params.direction === 'asc' ? 'desc' : 'asc' }));
  };

  const handlePeriodChange = (e) => {
    setParams(prev => ({ ...prev, period: e.target.value, from: '', to: '' }));
  };

  const goToPage = (page) => {
    setParams(prev => ({ ...prev, page }));
    fetchData();
  };

  const exportCSV = () => {
    const reportTypeCsv = reportType === 'executive' ? 'sales' : reportType;
    ReportingService.exportReportCSV(reportTypeCsv, params, req.user)
      .then(csv => {
        const url = window.URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
        const a = document.createElement('a');
        a.href = url;
        a.download = `techhaven-${reportTypeCsv}-report-${new Date().toISOString().slice(0,10)}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      })
      .catch(err => setError('فشل التصدير: ' + err.message));
  };

  return (
    <div className="p-6">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>تقارير الإدارة</CardTitle>
          <CardSubtitle>تتقارير تحليلية شاملة للعمليات</CardSubtitle>
        </CardHeader>
        <CardBody className="flex flex-col md:flex-row gap-4">
          {['executive', 'sales', 'profitability', 'products', 'categories', 'inventory', 'purchasing', 'b2b', 'alerts'].map(type => (
            <button
              key={type}
              className="btn btn-sm btn-outline"
              onClick={() => setReportType(type)}
              className={`btn-outline-secondary ${type === reportType ? 'btn-primary' : ''}`}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
          <button
            className="btn btn-sm btn-outline-primary mt-2"
            onClick={exportCSV}
          >
            تصدير CSV
          </button>
        </CardBody>
      </Card>

      {loading && (
        <div className="text-center py-8">
          <Spinner size="lg" />
          <p>جاري التحميل...</p>
        </div>
      )}

      {error && (
        <div className="alert alert-danger mt-4">
          {error}
        </div>
      )}

      {!loading && data.length > 0 && (
        <div className="flex flex-col md:flex-row">
          <div className="md:w-1/2">
            <Table className="w-full table-hover">
              <TableHead>
                <TableRow>
                  {Object.keys(data[0]).map(key => (
                    <TableCell key={key}>{key}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {data.map((row, index) => (
                  <TableRow key={index}>
                    {Object.values(row).map(value => (
                      <TableCell key={index}>{value}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="md:w-1/2">
            <Card className="h-full">
              <CardHeader>
                <CardTitle>ملخص البيانات</CardTitle>
                <CardSubtitle>نوع: {reportType} | الفترة: {period} | {params.from || 'بدون'} من {params.to || 'بدون'}</CardSubtitle>
              </CardHeader>
              <CardBody className="p-4">
                <ul className="list-disc list-inside">
                  <li>عدد السجلات: {data.length}</li>
                  <li>التاريخ: {params.from || 'بدون'} إلى {params.to || 'بدون'}</li>
                  <li>الفاصل الزمني: {params.interval}</li>
                  <li>الترتيب: {params.sort} {params.direction === 'asc' ? '(عكس' : 'صاعد')}</li>
                </ul>
              </CardBody>
            </Card>
          </div>
        </div>
      )}

      {!loading && data.length === 0 && (
        <div className="text-center py-8">
          <p>لا توجد بيانات للعرض</p>
        </div>
      )}

      {!loading && data.length > 0 && (
        <div className="mt-6">
          <div className="flex justify-between items-center">
            <div>
              <p>الصفحة {params.page} من {totalPages}</p>
            </div>
            <div className="flex items-center gap-2">
              <select 
                value={params.page} 
                onChange={e => goToPage(parseInt(e.target.value))} 
                className="border rounded px-2 py-1"
              >
                {[...Array(totalPages).keys()].map(p => (
                  <option key={p} value={p} 
                    className={p == params.page ? 'bg-primary text-white' : ''}>
                    {p}
                  </option>
                ))}
              </select>
              <span className="text-sm text-muted">صفحة</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}