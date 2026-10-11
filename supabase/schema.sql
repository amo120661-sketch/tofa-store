-- ===========================================================
--  TOFA STORE - مخطط قاعدة البيانات على Supabase
--  الصق هذا الملف كاملاً في:  Supabase Dashboard > SQL Editor > New query > Run
--  ===========================================================

-- 1) جدول إعدادات الموقع (صف واحد فقط id = 1)
create table if not exists public.settings (
  id             smallint primary key default 1,
  site_name      text default 'تُوفا',
  tagline        text default 'أزياء عصرية بلمسة أنيقة',
  logo           text default '',
  phone          text default '01028484949',
  phone2         text default '',
  whatsapp       text default '201028484949',
  address        text default 'شارع عدلي يكن',
  email          text default '',
  facebook       text default '',
  instagram      text default '',
  currency       text default 'ج.م',
  banner         text default '',
  banner_title   text default 'تشكيلة الموسم الجديد',
  banner_text    text default 'اكتشف أحدث صيحات الموضة بأسعار تناسبك',
  announcement   text default 'شحن سريع لجميع المحافظات • الدفع عند الاستلام',
  primary_color  text default '#c1121f',
  dark_color     text default '#141414',
  constraint settings_singleton check (id = 1)
);

-- 2) جدول صور السلايدر
create table if not exists public.slider (
  id          uuid primary key default gen_random_uuid(),
  image       text not null,
  position    int default 0,
  created_at  timestamptz default now()
);

-- 3) جدول المنتجات
create table if not exists public.products (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  category     text default '',
  price        numeric(10,2) not null default 0,
  old_price    numeric(10,2) default 0,
  badge        text default '',
  description  text default '',
  sizes        text[] default '{}',
  image        text default '',
  stock        boolean default true,
  position     int default 0,
  created_at   timestamptz default now()
);

-- ===========================================================
--  الحماية (Row Level Security)
--  القراءة عامة للجميع، والكتابة تتطلب تسجيل دخول (authenticated)
-- ===========================================================
alter table public.settings enable row level security;
alter table public.slider   enable row level security;
alter table public.products enable row level security;

-- قراءة عامة (للزوار)
drop policy if exists "public read settings" on public.settings;
create policy "public read settings" on public.settings for select using (true);

drop policy if exists "public read slider" on public.slider;
create policy "public read slider" on public.slider for select using (true);

drop policy if exists "public read products" on public.products;
create policy "public read products" on public.products for select using (true);

-- كتابة للمدير (بعد تسجيل الدخول عبر Supabase Auth)
drop policy if exists "admin write settings" on public.settings;
create policy "admin write settings" on public.settings
  for all to authenticated using (true) with check (true);

drop policy if exists "admin write slider" on public.slider;
create policy "admin write slider" on public.slider
  for all to authenticated using (true) with check (true);

drop policy if exists "admin write products" on public.products;
create policy "admin write products" on public.products
  for all to authenticated using (true) with check (true);

-- ===========================================================
--  تخزين الصور (Storage Bucket)
-- ===========================================================
insert into storage.buckets (id, name, public)
values ('images', 'images', true)
on conflict (id) do nothing;

drop policy if exists "public read images" on storage.objects;
create policy "public read images" on storage.objects
  for select using (bucket_id = 'images');

drop policy if exists "admin upload images" on storage.objects;
create policy "admin upload images" on storage.objects
  for insert to authenticated with check (bucket_id = 'images');

drop policy if exists "admin update images" on storage.objects;
create policy "admin update images" on storage.objects
  for update to authenticated using (bucket_id = 'images');

drop policy if exists "admin delete images" on storage.objects;
create policy "admin delete images" on storage.objects
  for delete to authenticated using (bucket_id = 'images');

-- ===========================================================
--  بيانات أولية (الإعدادات + منتجات تجريبية بأسعار مؤقتة)
-- ===========================================================
insert into public.settings (id) values (1) on conflict (id) do nothing;

insert into public.slider (image, position) values
  ('assets/slider1.jpeg', 0),
  ('assets/slider2.jpeg', 1),
  ('assets/banner.jpeg', 2)
on conflict do nothing;

insert into public.products (name, category, price, old_price, badge, description, sizes, image, stock, position) values
  ('فستان صيفي أنيق','فساتين',350,450,'خصم','فستان صيفي بخامة قطنية مريحة.','{S,M,L,XL}','assets/slider1.jpeg',true,0),
  ('قميص كلاسيك رجالي','رجالي',260,0,'','قميص قطن كلاسيك مناسب لكل المناسبات.','{M,L,XL}','assets/banner.jpeg',true,1),
  ('طقم كاجوال','أطقم',420,520,'جديد','طقم كاجوال عملي وأنيق.','{S,M,L}','assets/slider2.jpeg',true,2),
  ('بلوزة نسائية','نسائي',199,0,'','بلوزة خفيفة بخامة عالية الجودة.','{S,M,L}','assets/logo.jpeg',true,3)
on conflict do nothing;
