const fs = require('fs');
const path = require('path');

const base = "c:/Users/abdel/Downloads/egy-hardware/egyhardware-full/src";
const dirs = [
  path.join(base, "components", "admin"),
  path.join(base, "pages", "Admin")
];

dirs.forEach(d => fs.mkdirSync(d, { recursive: true }));

const files = {
  "components/admin/AdminLayout.jsx": `import React, { useState } from 'react';
import { Outlet, Navigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AdminSidebar from './AdminSidebar';
import AdminHeader from './AdminHeader';
import '../../styles/admin.css';

const AdminLayout = () => {
  // Mock auth for development if context is missing
  let user = { role: 'admin' };
  try {
    const auth = useAuth();
    if (auth && auth.user) user = auth.user;
  } catch (e) {
    console.warn('AuthContext not found, using mock user');
  }

  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!user || user.role !== 'admin') {
    return <Navigate to="/" />;
  }

  return (
    <div className="admin-layout" style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', direction: 'rtl' }}>
      <AdminSidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      <div className="admin-main" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <AdminHeader toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        <main style={{ padding: '20px', overflowY: 'auto', flex: 1, backgroundColor: 'var(--bg-secondary)' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
`,
  "components/admin/AdminSidebar.jsx": `import React from 'react';
import { NavLink } from 'react-router-dom';

const AdminSidebar = ({ isOpen, setIsOpen }) => {
  const navItems = [
    { to: '/admin', icon: '📊', label: 'لوحة التحكم' },
    { to: '/admin/products', icon: '📦', label: 'المنتجات' },
    { to: '/admin/orders', icon: '🛒', label: 'الطلبات' },
    { to: '/admin/users', icon: '👥', label: 'المستخدمين' },
    { to: '/admin/categories', icon: '🏷️', label: 'الفئات' },
    { to: '/admin/auctions', icon: '🔨', label: 'المزادات' },
    { to: '/admin/trade-ins', icon: '♻️', label: 'الاستبدال' },
    { to: '/admin/analytics', icon: '📈', label: 'التحليلات' },
    { to: '/admin/settings', icon: '⚙️', label: 'الإعدادات' },
  ];

  return (
    <aside className={\`admin-sidebar \${isOpen ? 'open' : ''}\`} style={{ width: '260px', backgroundColor: 'var(--bg-card)', borderLeft: '1px solid var(--border)', transition: '0.3s', display: 'flex', flexDirection: 'column', zIndex: 100 }}>
      <div style={{ padding: '20px', fontSize: '1.5rem', fontWeight: 'bold', borderBottom: '1px solid var(--border)', textAlign: 'center' }}>
        EgyHardware Admin
      </div>
      <nav style={{ flex: 1, padding: '10px 0', overflowY: 'auto' }}>
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/admin'}
            style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', padding: '12px 20px', color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
              backgroundColor: isActive ? 'rgba(108, 99, 255, 0.1)' : 'transparent', textDecoration: 'none', gap: '10px',
              borderRight: isActive ? '3px solid var(--primary)' : '3px solid transparent'
            })}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
      <div style={{ padding: '20px', borderTop: '1px solid var(--border)' }}>
        <button className="btn" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-primary)', padding: '10px', borderRadius: '5px', cursor: 'pointer' }}>
          🚪 تسجيل الخروج
        </button>
      </div>
    </aside>
  );
};

export default AdminSidebar;
`,
  "components/admin/AdminHeader.jsx": `import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';

const AdminHeader = ({ toggleSidebar }) => {
  let user = { name: 'Admin User' };
  try {
    const auth = useAuth();
    if (auth && auth.user) user = auth.user;
  } catch (e) {}

  return (
    <header className="admin-header" style={{ height: '70px', backgroundColor: 'var(--bg-card)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
        <button className="btn" onClick={toggleSidebar} style={{ display: 'block', background: 'transparent', border: 'none', color: 'var(--text-primary)', fontSize: '1.5rem', cursor: 'pointer' }}>
          ☰
        </button>
        <h2 style={{ margin: 0, fontSize: '1.2rem' }}>لوحة التحكم</h2>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        <Link to="/" target="_blank" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>
          🌐 عرض الموقع
        </Link>
        <div style={{ position: 'relative', cursor: 'pointer' }}>
          🔔 <span style={{ position: 'absolute', top: '-5px', right: '-5px', background: 'var(--danger)', color: 'white', borderRadius: '50%', fontSize: '0.7rem', padding: '2px 5px' }}>3</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '35px', height: '35px', borderRadius: '50%', backgroundColor: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
            {user?.name?.charAt(0) || 'A'}
          </div>
          <span>{user?.name}</span>
        </div>
      </div>
    </header>
  );
};

export default AdminHeader;
`,
  "components/admin/StatsCard.jsx": `import React from 'react';

const StatsCard = ({ title, value, change, changeType, icon, color }) => {
  return (
    <div className="stats-card card" style={{ backgroundColor: 'var(--bg-card)', padding: '20px', borderRadius: '10px', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
      <div>
        <h4 style={{ color: 'var(--text-secondary)', margin: '0 0 10px 0', fontSize: '0.9rem' }}>{title}</h4>
        <h2 style={{ margin: '0 0 10px 0', fontSize: '1.8rem' }}>{value}</h2>
        <div style={{ fontSize: '0.8rem', color: changeType === 'up' ? 'var(--success)' : changeType === 'down' ? 'var(--danger)' : 'var(--warning)' }}>
          {changeType === 'up' ? '↑ ' : changeType === 'down' ? '↓ ' : ''}{change}
        </div>
      </div>
      <div style={{ width: '50px', height: '50px', borderRadius: '10px', backgroundColor: \`\${color}20\`, color: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>
        {icon}
      </div>
    </div>
  );
};

export default StatsCard;
`,
  "components/admin/DataTable.jsx": `import React from 'react';

const DataTable = ({ columns, data, onEdit, onDelete, loading, emptyMessage = 'لا توجد بيانات' }) => {
  if (loading) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>جاري التحميل...</div>;
  }

  if (!data || data.length === 0) {
    return <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>{emptyMessage}</div>;
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border)' }}>
            <th style={{ padding: '12px', width: '40px' }}><input type="checkbox" /></th>
            {columns.map((col, i) => (
              <th key={i} style={{ padding: '12px', color: 'var(--text-secondary)' }}>{col.label}</th>
            ))}
            {(onEdit || onDelete) && <th style={{ padding: '12px' }}>الإجراءات</th>}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rowIndex) => (
            <tr key={rowIndex} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s' }}>
              <td style={{ padding: '12px' }}><input type="checkbox" /></td>
              {columns.map((col, colIndex) => (
                <td key={colIndex} style={{ padding: '12px' }}>
                  {col.render ? col.render(row[col.key], row) : row[col.key]}
                </td>
              ))}
              {(onEdit || onDelete) && (
                <td style={{ padding: '12px', display: 'flex', gap: '10px' }}>
                  {onEdit && <button className="btn" onClick={() => onEdit(row)} style={{ padding: '5px 10px', fontSize: '0.8rem', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>تعديل</button>}
                  {onDelete && <button className="btn" onClick={() => onDelete(row)} style={{ padding: '5px 10px', fontSize: '0.8rem', background: 'var(--danger)', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>حذف</button>}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default DataTable;
`,
  "pages/Admin/Dashboard.jsx": `import React, { useState, useEffect } from 'react';
import StatsCard from '../../components/admin/StatsCard';
import DataTable from '../../components/admin/DataTable';

const Dashboard = () => {
  const [stats, setStats] = useState({ revenue: 0, orders: 0, users: 0, products: 0 });
  const [recentOrders, setRecentOrders] = useState([]);
  const [topProducts, setTopProducts] = useState([]);

  useEffect(() => {
    // Mock data for initial load
    setStats({ revenue: '150,000 ج.م', orders: 245, users: 1250, products: 432 });
    setRecentOrders([
      { id: '#ORD-001', customer: 'أحمد محمود', total: '15,000 ج.م', status: 'مكتمل', date: '2023-10-25' },
      { id: '#ORD-002', customer: 'سارة خالد', total: '8,500 ج.م', status: 'قيد التنفيذ', date: '2023-10-24' },
      { id: '#ORD-003', customer: 'محمد علي', total: '2,300 ج.م', status: 'ملغي', date: '2023-10-23' },
    ]);
    setTopProducts([
      { id: 1, name: 'لاب توب ديل XPS', sales: 120, revenue: '1,200,000 ج.م' },
      { id: 2, name: 'كارت شاشة RTX 4090', sales: 85, revenue: '2,550,000 ج.م' },
    ]);
  }, []);

  const orderColumns = [
    { key: 'id', label: 'رقم الطلب' },
    { key: 'customer', label: 'العميل' },
    { key: 'total', label: 'الإجمالي' },
    { key: 'status', label: 'الحالة', render: (val) => (
      <span className="badge" style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', background: val === 'مكتمل' ? 'var(--success)' : val === 'ملغي' ? 'var(--danger)' : 'var(--warning)', color: 'white' }}>{val}</span>
    ) },
    { key: 'date', label: 'التاريخ' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
        <StatsCard title="إجمالي الإيرادات" value={stats.revenue} change="12% هذا الشهر" changeType="up" icon="💰" color="var(--primary)" />
        <StatsCard title="الطلبات" value={stats.orders} change="5% هذا الشهر" changeType="up" icon="🛒" color="var(--success)" />
        <StatsCard title="المستخدمين الجدد" value={stats.users} change="2% انخفاض" changeType="down" icon="👥" color="var(--warning)" />
        <StatsCard title="المنتجات" value={stats.products} change="مستقر" changeType="neutral" icon="📦" color="var(--text-secondary)" />
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
        <div className="card" style={{ backgroundColor: 'var(--bg-card)', padding: '20px', borderRadius: '10px', border: '1px solid var(--border)' }}>
          <h3 style={{ marginTop: 0 }}>آخر الطلبات</h3>
          <DataTable columns={orderColumns} data={recentOrders} />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
`,
  "pages/Admin/Products.jsx": `import React, { useState, useEffect } from 'react';
import DataTable from '../../components/admin/DataTable';

const Products = () => {
  const [products, setProducts] = useState([]);
  
  useEffect(() => {
    setProducts([
      { id: 1, name: 'كارت شاشة RTX 4090', price: '90,000 ج.م', stock: 5, category: 'كروت شاشة', status: 'نشط' },
      { id: 2, name: 'معالج إنتل Core i9', price: '30,000 ج.م', stock: 12, category: 'معالجات', status: 'نشط' },
      { id: 3, name: 'رامات كورسير 32 جيجا', price: '5,000 ج.م', stock: 0, category: 'رامات', status: 'نفد' },
    ]);
  }, []);

  const columns = [
    { key: 'name', label: 'الاسم' },
    { key: 'category', label: 'الفئة' },
    { key: 'price', label: 'السعر' },
    { key: 'stock', label: 'المخزون' },
    { key: 'status', label: 'الحالة', render: (val) => (
      <span style={{ color: val === 'نشط' ? 'var(--success)' : 'var(--danger)' }}>{val}</span>
    )}
  ];

  return (
    <div className="card" style={{ backgroundColor: 'var(--bg-card)', padding: '20px', borderRadius: '10px', border: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3 style={{ margin: 0 }}>إدارة المنتجات</h3>
        <button className="btn btn-primary" style={{ background: 'var(--primary)', color: 'white', padding: '8px 16px', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>+ إضافة منتج</button>
      </div>
      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
        <input type="text" placeholder="بحث عن منتج..." style={{ padding: '8px', borderRadius: '5px', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', width: '300px' }} />
        <select style={{ padding: '8px', borderRadius: '5px', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
          <option>كل الفئات</option>
          <option>كروت شاشة</option>
          <option>معالجات</option>
        </select>
      </div>
      <DataTable columns={columns} data={products} onEdit={(r)=>console.log(r)} onDelete={(r)=>console.log(r)} />
    </div>
  );
};

export default Products;
`,
  "pages/Admin/Orders.jsx": `import React, { useState, useEffect } from 'react';
import DataTable from '../../components/admin/DataTable';

const Orders = () => {
  const [orders, setOrders] = useState([]);
  
  useEffect(() => {
    setOrders([
      { id: '#ORD-001', customer: 'أحمد محمود', total: '15,000 ج.م', status: 'مكتمل', date: '2023-10-25' },
      { id: '#ORD-002', customer: 'سارة خالد', total: '8,500 ج.م', status: 'قيد التنفيذ', date: '2023-10-24' },
      { id: '#ORD-003', customer: 'محمد علي', total: '2,300 ج.م', status: 'ملغي', date: '2023-10-23' },
    ]);
  }, []);

  const columns = [
    { key: 'id', label: 'رقم الطلب' },
    { key: 'customer', label: 'العميل' },
    { key: 'total', label: 'الإجمالي' },
    { key: 'date', label: 'التاريخ' },
    { key: 'status', label: 'الحالة', render: (val, row) => (
      <select defaultValue={val} style={{ padding: '4px', borderRadius: '4px', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}>
        <option value="معلق">معلق</option>
        <option value="قيد التنفيذ">قيد التنفيذ</option>
        <option value="مشحون">مشحون</option>
        <option value="مكتمل">مكتمل</option>
        <option value="ملغي">ملغي</option>
      </select>
    )}
  ];

  return (
    <div className="card" style={{ backgroundColor: 'var(--bg-card)', padding: '20px', borderRadius: '10px', border: '1px solid var(--border)' }}>
      <h3 style={{ marginTop: 0, marginBottom: '20px' }}>إدارة الطلبات</h3>
      <DataTable columns={columns} data={orders} />
    </div>
  );
};

export default Orders;
`,
  "pages/Admin/Users.jsx": `import React, { useState, useEffect } from 'react';
import DataTable from '../../components/admin/DataTable';

const Users = () => {
  const [users, setUsers] = useState([]);
  
  useEffect(() => {
    setUsers([
      { id: 1, name: 'مدير النظام', email: 'admin@egyhardware.com', role: 'admin', date: '2023-01-01', orders: 0 },
      { id: 2, name: 'أحمد محمود', email: 'ahmed@test.com', role: 'customer', date: '2023-05-12', orders: 5 },
    ]);
  }, []);

  const columns = [
    { key: 'name', label: 'الاسم' },
    { key: 'email', label: 'الإيميل' },
    { key: 'date', label: 'تاريخ التسجيل' },
    { key: 'orders', label: 'الطلبات' },
    { key: 'role', label: 'الدور', render: (val) => (
      <span style={{ color: val === 'admin' ? 'var(--primary)' : 'var(--text-secondary)' }}>
        {val === 'admin' ? 'مدير' : 'عميل'}
      </span>
    )}
  ];

  return (
    <div className="card" style={{ backgroundColor: 'var(--bg-card)', padding: '20px', borderRadius: '10px', border: '1px solid var(--border)' }}>
      <h3 style={{ marginTop: 0, marginBottom: '20px' }}>إدارة المستخدمين</h3>
      <DataTable columns={columns} data={users} onEdit={()=>{}} onDelete={()=>{}} />
    </div>
  );
};

export default Users;
`,
  "pages/Admin/Categories.jsx": `import React, { useState, useEffect } from 'react';
import DataTable from '../../components/admin/DataTable';

const Categories = () => {
  const [categories, setCategories] = useState([]);
  
  useEffect(() => {
    setCategories([
      { id: 1, name: 'كروت الشاشة', icon: '🎮', productsCount: 45 },
      { id: 2, name: 'المعالجات', icon: '🧠', productsCount: 30 },
      { id: 3, name: 'اللوحات الأم', icon: '🎛️', productsCount: 25 },
    ]);
  }, []);

  const columns = [
    { key: 'icon', label: 'أيقونة', render: (val) => <span style={{ fontSize: '1.5rem' }}>{val}</span> },
    { key: 'name', label: 'اسم الفئة' },
    { key: 'productsCount', label: 'عدد المنتجات' },
  ];

  return (
    <div className="card" style={{ backgroundColor: 'var(--bg-card)', padding: '20px', borderRadius: '10px', border: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3 style={{ margin: 0 }}>إدارة الفئات</h3>
        <button className="btn" style={{ background: 'var(--primary)', color: 'white', padding: '8px 16px', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>+ إضافة فئة</button>
      </div>
      <DataTable columns={columns} data={categories} onEdit={()=>{}} onDelete={()=>{}} />
    </div>
  );
};

export default Categories;
`,
  "pages/Admin/Auctions.jsx": `import React, { useState, useEffect } from 'react';
import DataTable from '../../components/admin/DataTable';

const Auctions = () => {
  const [auctions, setAuctions] = useState([]);
  
  useEffect(() => {
    setAuctions([
      { id: 1, product: 'لاب توب جيمنج مستعمل', startPrice: '10,000 ج.م', currentBid: '15,500 ج.م', status: 'جاري', endTime: '2023-11-01' },
      { id: 2, product: 'كارت شاشة RTX 3080', startPrice: '12,000 ج.م', currentBid: '19,000 ج.م', status: 'منتهي', endTime: '2023-10-20' },
    ]);
  }, []);

  const columns = [
    { key: 'product', label: 'المنتج' },
    { key: 'startPrice', label: 'السعر الابتدائي' },
    { key: 'currentBid', label: 'أعلى مزايدة' },
    { key: 'endTime', label: 'وقت الانتهاء' },
    { key: 'status', label: 'الحالة', render: (val) => (
      <span style={{ color: val === 'جاري' ? 'var(--success)' : 'var(--text-secondary)' }}>{val}</span>
    )}
  ];

  return (
    <div className="card" style={{ backgroundColor: 'var(--bg-card)', padding: '20px', borderRadius: '10px', border: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3 style={{ margin: 0 }}>إدارة المزادات</h3>
        <button className="btn" style={{ background: 'var(--primary)', color: 'white', padding: '8px 16px', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>+ إنشاء مزاد</button>
      </div>
      <DataTable columns={columns} data={auctions} onEdit={()=>{}} onDelete={()=>{}} />
    </div>
  );
};

export default Auctions;
`,
  "pages/Admin/TradeIns.jsx": `import React, { useState, useEffect } from 'react';
import DataTable from '../../components/admin/DataTable';

const TradeIns = () => {
  const [requests, setRequests] = useState([]);
  
  useEffect(() => {
    setRequests([
      { id: '#TRD-001', customer: 'خالد محمد', item: 'PS4 Pro', condition: 'جيد', estimatedValue: '6,000 ج.م', status: 'جديد' },
      { id: '#TRD-002', customer: 'ياسر علي', item: 'GTX 1660 Ti', condition: 'ممتاز', estimatedValue: '4,500 ج.م', status: 'مقبول' },
    ]);
  }, []);

  const columns = [
    { key: 'id', label: 'رقم الطلب' },
    { key: 'customer', label: 'العميل' },
    { key: 'item', label: 'القطعة المستبدلة' },
    { key: 'condition', label: 'الحالة' },
    { key: 'estimatedValue', label: 'القيمة المقدرة' },
    { key: 'status', label: 'حالة الطلب', render: (val) => (
      <span style={{ color: val === 'جديد' ? 'var(--warning)' : val === 'مقبول' ? 'var(--success)' : 'var(--danger)' }}>{val}</span>
    )}
  ];

  return (
    <div className="card" style={{ backgroundColor: 'var(--bg-card)', padding: '20px', borderRadius: '10px', border: '1px solid var(--border)' }}>
      <h3 style={{ marginTop: 0, marginBottom: '20px' }}>طلبات الاستبدال</h3>
      <DataTable columns={columns} data={requests} onEdit={()=>{}} />
    </div>
  );
};

export default TradeIns;
`,
  "pages/Admin/Analytics.jsx": `import React from 'react';

const Analytics = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <h2 style={{ margin: 0 }}>التحليلات والتقارير</h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div className="card" style={{ backgroundColor: 'var(--bg-card)', padding: '20px', borderRadius: '10px', border: '1px solid var(--border)', height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ color: 'var(--text-secondary)' }}>رسم بياني للإيرادات (SVG Placeholder)</p>
        </div>
        <div className="card" style={{ backgroundColor: 'var(--bg-card)', padding: '20px', borderRadius: '10px', border: '1px solid var(--border)', height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ color: 'var(--text-secondary)' }}>المنتجات الأكثر مبيعاً (SVG Placeholder)</p>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
`,
  "pages/Admin/Settings.jsx": `import React from 'react';

const Settings = () => {
  return (
    <div className="card" style={{ backgroundColor: 'var(--bg-card)', padding: '20px', borderRadius: '10px', border: '1px solid var(--border)', maxWidth: '600px' }}>
      <h3 style={{ marginTop: 0, marginBottom: '20px' }}>إعدادات النظام</h3>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '5px', color: 'var(--text-secondary)' }}>اسم الموقع</label>
          <input type="text" defaultValue="EgyHardware" style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'white' }} />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '5px', color: 'var(--text-secondary)' }}>رقم الواتساب للتواصل</label>
          <input type="text" defaultValue="+201000000000" style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'white' }} />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '5px', color: 'var(--text-secondary)' }}>سعر الشحن الافتراضي (ج.م)</label>
          <input type="number" defaultValue="50" style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'white' }} />
        </div>
        <hr style={{ borderColor: 'var(--border)', margin: '15px 0' }} />
        <button className="btn" style={{ background: 'var(--primary)', color: 'white', padding: '10px', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>حفظ الإعدادات</button>
      </div>
    </div>
  );
};

export default Settings;
`
};

for (const [relPath, content] of Object.entries(files)) {
  const fullPath = path.join(base, relPath);
  fs.writeFileSync(fullPath, content);
  console.log(\`Created: \${fullPath}\`);
}
