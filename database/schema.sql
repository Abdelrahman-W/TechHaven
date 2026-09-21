-- EgyHardware Production Database Schema
-- Run this in Supabase SQL Editor

-- Enable extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ============================================================
-- USERS & AUTH
-- ============================================================
create table public.users (
  id uuid primary key default uuid_generate_v4(),
  email text unique not null,
  password_hash text not null,
  full_name text not null,
  phone text,
  avatar_url text,
  role text not null default 'user' check (role in ('user', 'admin', 'seller')),
  email_verified boolean default false,
  email_verification_token text,
  email_verification_expires timestamptz,
  password_reset_token text,
  password_reset_expires timestamptz,
  last_login timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_users_email on public.users(email);
create index idx_users_role on public.users(role);

-- ============================================================
-- CATEGORIES
-- ============================================================
create table public.categories (
  id uuid primary key default uuid_generate_v4(),
  slug text unique not null,
  name text not null,
  name_en text,
  icon text,
  description text,
  parent_id uuid references public.categories(id),
  sort_order int default 0,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- PRODUCTS
-- ============================================================
create table public.products (
  id uuid primary key default uuid_generate_v4(),
  sku text unique not null,
  name text not null,
  name_en text,
  slug text unique not null,
  description text,
  description_en text,
  category_id uuid not null references public.categories(id),
  brand text,
  model text,
  price decimal(12,2) not null check (price >= 0),
  old_price decimal(12,2) check (old_price is null or old_price >= price),
  cost_price decimal(12,2),
  stock_qty int not null default 0 check (stock_qty >= 0),
  reserved_qty int not null default 0 check (reserved_qty >= 0),
  min_order_qty int default 1,
  max_order_qty int,
  weight_kg decimal(8,3),
  dimensions_cm jsonb, -- {width, height, depth}
  images text[] default '{}',
  thumbnail text,
  video_url text,
  specs jsonb default '{}', -- key-value specs
  features text[],
  tags text[],
  badge text, -- 'bestseller', 'new', 'deal', etc.
  badge_color text check (badge_color in ('hot', 'cyan', 'violet')),
  rating decimal(3,2) default 0 check (rating >= 0 and rating <= 5),
  review_count int default 0,
  sold_count int default 0,
  view_count int default 0,
  is_active boolean default true,
  is_featured boolean default false,
  meta_title text,
  meta_description text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_products_category on public.products(category_id);
create index idx_products_slug on public.products(slug);
create index idx_products_active on public.products(is_active) where is_active = true;
create index idx_products_featured on public.products(is_featured) where is_featured = true;
create index idx_products_price on public.products(price);
create index idx_products_brand on public.products(brand);

-- ============================================================
-- CART ITEMS
-- ============================================================
create table public.cart_items (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  quantity int not null default 1 check (quantity > 0),
  unit_price decimal(12,2) not null, -- snapshot at add time
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, product_id)
);

create index idx_cart_user on public.cart_items(user_id);

-- ============================================================
-- ORDERS
-- ============================================================
create table public.orders (
  id uuid primary key default uuid_generate_v4(),
  reference text unique not null,
  user_id uuid not null references public.users(id),
  status text not null default 'pending' check (status in (
    'pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded', 'returned'
  )),
  payment_status text not null default 'pending' check (payment_status in (
    'pending', 'paid', 'failed', 'refunded', 'cash_on_delivery'
  )),
  payment_method text check (payment_method in ('cod', 'card', 'paymob', 'wallet')),
  payment_ref text, -- external payment reference

  -- Customer snapshot
  customer_name text not null,
  customer_email text not null,
  customer_phone text not null,
  customer_city text,
  customer_address text not null,
  customer_notes text,

  -- Totals
  subtotal decimal(12,2) not null,
  shipping_cost decimal(12,2) default 0,
  tax_amount decimal(12,2) default 0,
  discount_amount decimal(12,2) default 0,
  total decimal(12,2) not null,

  -- Shipping
  shipping_method text,
  tracking_number text,
  shipped_at timestamptz,
  delivered_at timestamptz,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_orders_user on public.orders(user_id);
create index idx_orders_status on public.orders(status);
create index idx_orders_reference on public.orders(reference);

-- Order Items
create table public.order_items (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id),
  product_name text not null, -- snapshot
  product_sku text not null,
  product_image text,
  quantity int not null check (quantity > 0),
  unit_price decimal(12,2) not null,
  total_price decimal(12,2) not null,
  specs_snapshot jsonb default '{}',
  created_at timestamptz default now()
);

create index idx_order_items_order on public.order_items(order_id);

-- ============================================================
-- REVIEWS
-- ============================================================
create table public.reviews (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid not null references public.products(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  order_id uuid references public.orders(id),
  rating int not null check (rating >= 1 and rating <= 5),
  title text,
  content text,
  pros text[],
  cons text[],
  images text[] default '{}',
  is_verified_purchase boolean default false,
  is_approved boolean default true,
  helpful_count int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (product_id, user_id, order_id)
);

create index idx_reviews_product on public.reviews(product_id);

-- ============================================================
-- WISHLIST
-- ============================================================
create table public.wishlist (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz default now(),
  unique (user_id, product_id)
);

create index idx_wishlist_user on public.wishlist(user_id);

-- ============================================================
-- ADDRESSES
-- ============================================================
create table public.addresses (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  label text, -- 'home', 'work', etc.
  full_name text not null,
  phone text not null,
  city text not null,
  district text,
  street text not null,
  building text,
  floor text,
  apartment text,
  landmark text,
  is_default boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_addresses_user on public.addresses(user_id);

-- ============================================================
-- PAYMOB TRANSACTIONS
-- ============================================================
create table public.paymob_transactions (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references public.orders(id),
  paymob_order_id bigint unique not null,
  amount_cents int not null,
  currency text default 'EGP',
  integration_id bigint,
  iframe_id bigint,
  status text not null default 'pending' check (status in (
    'pending', 'success', 'failed', 'cancelled', 'expired'
  )),
  payment_data jsonb,
  response_data jsonb,
  hmac_valid boolean,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_paymob_order on public.paymob_transactions(order_id);
create index idx_paymob_paymob_id on public.paymob_transactions(paymob_order_id);

-- ============================================================
-- SELLER PROFILES (for marketplace)
-- ============================================================
create table public.sellers (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid unique not null references public.users(id) on delete cascade,
  company_name text not null,
  company_name_en text,
  tax_number text,
  commercial_register text,
  address text,
  city text,
  phone text,
  email text,
  website text,
  description text,
  logo_url text,
  banner_url text,
  rating decimal(3,2) default 0,
  total_sales int default 0,
  is_verified boolean default false,
  is_active boolean default true,
  commission_rate decimal(5,2) default 10.00, -- percentage
  payout_schedule text default 'weekly', -- 'daily', 'weekly', 'monthly'
  bank_account jsonb, -- encrypted
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_sellers_user on public.sellers(user_id);

-- ============================================================
-- PRODUCT VARIANTS (for marketplace sellers)
-- ============================================================
create table public.product_variants (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid not null references public.products(id) on delete cascade,
  seller_id uuid not null references public.sellers(id) on delete cascade,
  sku text not null,
  price decimal(12,2) not null,
  stock_qty int not null default 0,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (product_id, seller_id, sku)
);

-- ============================================================
-- ANALYTICS / EVENTS
-- ============================================================
create table public.analytics_events (
  id uuid primary key default uuid_generate_v4(),
  event_name text not null,
  user_id uuid references public.users(id),
  session_id text,
  properties jsonb default '{}',
  page_url text,
  referrer text,
  user_agent text,
  ip_hash text,
  created_at timestamptz default now()
);

create index idx_analytics_event on public.analytics_events(event_name);
create index idx_analytics_user on public.analytics_events(user_id);
create index idx_analytics_created on public.analytics_events(created_at desc);

-- ============================================================
-- RLS POLICIES (Row Level Security)
-- ============================================================
alter table public.users enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.cart_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.reviews enable row level security;
alter table public.wishlist enable row level security;
alter table public.addresses enable row level security;
alter table public.paymob_transactions enable row level security;
alter table public.sellers enable row level security;
alter table public.product_variants enable row level security;
alter table public.analytics_events enable row level security;

-- Users: can read own, admins read all
create policy "Users read own" on public.users for select using (auth.uid() = id);
create policy "Admins read all users" on public.users for select using (
  exists (select 1 from public.users where id = auth.uid() and role = 'admin')
);

-- Categories: public read
create policy "Public read categories" on public.categories for select using (is_active = true);

-- Products: public read active
create policy "Public read products" on public.products for select using (is_active = true);
create policy "Admins manage products" on public.products for all using (
  exists (select 1 from public.users where id = auth.uid() and role = 'admin')
);

-- Cart: own cart only
create policy "Own cart" on public.cart_items for all using (auth.uid() = user_id);

-- Orders: own orders, admins all
create policy "Own orders" on public.orders for select using (auth.uid() = user_id);
create policy "Admins all orders" on public.orders for all using (
  exists (select 1 from public.users where id = auth.uid() and role = 'admin')
);
create policy "Users create orders" on public.orders for insert with check (auth.uid() = user_id);

-- Order items: own orders
create policy "Own order items" on public.order_items for select using (
  exists (select 1 from public.orders where id = order_id and user_id = auth.uid())
);
create policy "Admins all order items" on public.order_items for all using (
  exists (select 1 from public.users where id = auth.uid() and role = 'admin')
);

-- Reviews: public read approved, users write own
create policy "Public read reviews" on public.reviews for select using (is_approved = true);
create policy "Own reviews" on public.reviews for all using (auth.uid() = user_id);

-- Wishlist: own only
create policy "Own wishlist" on public.wishlist for all using (auth.uid() = user_id);

-- Addresses: own only
create policy "Own addresses" on public.addresses for all using (auth.uid() = user_id);

-- Paymob: own orders only
create policy "Own paymob" on public.paymob_transactions for select using (
  exists (select 1 from public.orders where id = order_id and user_id = auth.uid())
);
create policy "Admins all paymob" on public.paymob_transactions for all using (
  exists (select 1 from public.users where id = auth.uid() and role = 'admin')
);

-- Sellers: own profile, admins all
create policy "Own seller" on public.sellers for all using (auth.uid() = user_id);
create policy "Admins all sellers" on public.sellers for all using (
  exists (select 1 from public.users where id = auth.uid() and role = 'admin')
);

-- Product variants: sellers manage own, admins all
create policy "Seller variants" on public.product_variants for all using (
  exists (select 1 from public.sellers where id = seller_id and user_id = auth.uid())
);
create policy "Admins all variants" on public.product_variants for all using (
  exists (select 1 from public.users where id = auth.uid() and role = 'admin')
);

-- Analytics: admins only
create policy "Admins analytics" on public.analytics_events for all using (
  exists (select 1 from public.users where id = auth.uid() and role = 'admin')
);

-- ============================================================
-- UPDATED_AT TRIGGERS
-- ============================================================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger update_users_updated_at before update on public.users
  for each row execute function public.set_updated_at();
create trigger update_categories_updated_at before update on public.categories
  for each row execute function public.set_updated_at();
create trigger update_products_updated_at before update on public.products
  for each row execute function public.set_updated_at();
create trigger update_cart_items_updated_at before update on public.cart_items
  for each row execute function public.set_updated_at();
create trigger update_orders_updated_at before update on public.orders
  for each row execute function public.set_updated_at();
create trigger update_reviews_updated_at before update on public.reviews
  for each row execute function public.set_updated_at();
create trigger update_addresses_updated_at before update on public.addresses
  for each row execute function public.set_updated_at();
create trigger update_paymob_updated_at before update on public.paymob_transactions
  for each row execute function public.set_updated_at();
create trigger update_sellers_updated_at before update on public.sellers
  for each row execute function public.set_updated_at();
create trigger update_variants_updated_at before update on public.product_variants
  for each row execute function public.set_updated_at();

-- ============================================================
-- SEED DATA (Categories)
-- ============================================================
insert into public.categories (slug, name, name_en, icon, description, sort_order) values
  ('gpu', 'كروت الرسوميات', 'GPU', '🎮', 'كروت الشاشة للألعاب والتصميم', 1),
  ('cpu', 'المعالجات', 'CPU', '⚙️', 'البروسيسورات للحواسيب', 2),
  ('ram', 'الذاكرة العشوائية', 'RAM', '⚡', 'الرامات بجميع السرعات', 3),
  ('storage', 'التخزين', 'Storage', '💾', 'SSD, HDD, NVMe', 4),
  ('motherboard', 'اللوحات الأم', 'Motherboard', '🧩', 'لوحات الأم لجميع المعالجات', 5),
  ('psu', 'وحدات الطاقة', 'PSU', '🔌', 'باور سبلاي بجميع القدرات', 6),
  ('case', 'الهيكل', 'Case', '🖥️', 'كيسات الكمبيوتر', 7),
  ('cooling', 'التبريد', 'Cooling', '❄️', 'مروحات، مبردات مائية', 8),
  ('peripherals', 'الملحقات', 'Peripherals', '⌨️', 'لوحات مفاتيح، فئران، شاشات', 9),
  ('network', 'الشبكات', 'Network', '🌐', 'راوترات، كروت شبكة', 10)
on conflict (slug) do nothing;