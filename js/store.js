/* ===========================================================
   TOFA STORE - طبقة البيانات المشتركة (Data Layer)
   تُستخدم من صفحة المتجر (index) ولوحة التحكم (admin)
   =========================================================== */

const TOFA = (function () {
  "use strict";

  const DATA_KEY = "tofa_store_data_v1";
  const CART_KEY = "tofa_store_cart_v1";
  const SESSION_KEY = "tofa_admin_session";

  // بيانات دخول لوحة التحكم
  const ADMIN_USER = "islam";
  const ADMIN_PASS = "12345";

  // صورة بديلة بسيطة عند عدم وجود صورة للمنتج
  function placeholder(text) {
    const t = encodeURIComponent(text || "منتج");
    const svg =
      "<svg xmlns='http://www.w3.org/2000/svg' width='600' height='700'>" +
      "<rect width='100%' height='100%' fill='#f3f4f6'/>" +
      "<text x='50%' y='50%' font-family='Arial' font-size='40' fill='#9ca3af' " +
      "text-anchor='middle' dominant-baseline='middle'>" +
      t +
      "</text></svg>";
    return "data:image/svg+xml;charset=utf-8," + svg;
  }

  // البيانات الافتراضية عند أول تشغيل (أسعار مؤقتة لحين اعتماد الأسعار النهائية)
  const DEFAULT_DATA = {
    settings: {
      siteName: "طوفا",
      tagline: "أزياء عصرية بلمسة أنيقة",
      logo: "assets/logo.jpeg",
      phone: "01028484949",
      phone2: "",
      whatsapp: "201028484949",
      address: "شارع عدلي يكن",
      email: "",
      facebook: "",
      instagram: "",
      currency: "ج.م",
      banner: "assets/banner.jpeg",
      bannerTitle: "تشكيلة الموسم الجديد",
      bannerText: "اكتشف أحدث صيحات الموضة بأسعار تناسبك",
      announcement: "شحن سريع لجميع المحافظات • الدفع عند الاستلام",
      primaryColor: "#c1121f",
      darkColor: "#141414"
    },
    slider: ["assets/slider1.jpeg", "assets/slider2.jpeg", "assets/banner.jpeg"],
    products: [
      { id: "p1", name: "فستان صيفي أنيق", price: 350, oldPrice: 450, category: "فساتين", image: "assets/slider1.jpeg", description: "فستان صيفي بخامة قطنية مريحة.", badge: "خصم", stock: true, sizes: ["S", "M", "L", "XL"] },
      { id: "p2", name: "قميص كلاسيك رجالي", price: 260, oldPrice: 0, category: "رجالي", image: "assets/banner.jpeg", description: "قميص قطن كلاسيك مناسب لكل المناسبات.", badge: "", stock: true, sizes: ["M", "L", "XL"] },
      { id: "p3", name: "طقم كاجوال", price: 420, oldPrice: 520, category: "أطقم", image: "assets/slider2.jpeg", description: "طقم كاجوال عملي وأنيق.", badge: "جديد", stock: true, sizes: ["S", "M", "L"] },
      { id: "p4", name: "بلوزة نسائية", price: 199, oldPrice: 0, category: "نسائي", image: "assets/logo.jpeg", description: "بلوزة خفيفة بخامة عالية الجودة.", badge: "", stock: true, sizes: ["S", "M", "L"] },
      { id: "p5", name: "جاكيت شتوي", price: 550, oldPrice: 700, category: "معاطف", image: "assets/slider1.jpeg", description: "جاكيت شتوي دافئ بتصميم عصري.", badge: "خصم", stock: true, sizes: ["M", "L", "XL"] },
      { id: "p6", name: "بنطلون جينز", price: 300, oldPrice: 0, category: "بناطيل", image: "assets/slider2.jpeg", description: "بنطلون جينز بقصة مريحة.", badge: "", stock: true, sizes: ["30", "32", "34", "36"] },
      { id: "p7", name: "تيشيرت أساسي", price: 150, oldPrice: 0, category: "تيشيرتات", image: "assets/banner.jpeg", description: "تيشيرت قطن أساسي بكل الألوان.", badge: "", stock: true, sizes: ["S", "M", "L", "XL"] },
      { id: "p8", name: "عباية مطرزة", price: 600, oldPrice: 750, category: "عبايات", image: "assets/logo.jpeg", description: "عباية راقية بتطريز يدوي.", badge: "خصم", stock: true, sizes: ["M", "L", "XL"] }
    ]
  };

  // ---------- أدوات مساعدة ----------
  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  function load() {
    try {
      const raw = localStorage.getItem(DATA_KEY);
      if (!raw) { save(clone(DEFAULT_DATA)); return clone(DEFAULT_DATA); }
      const data = JSON.parse(raw);
      // دمج آمن مع الافتراضي لضمان اكتمال الحقول
      data.settings = Object.assign({}, DEFAULT_DATA.settings, data.settings || {});
      data.slider = Array.isArray(data.slider) ? data.slider : clone(DEFAULT_DATA.slider);
      data.products = Array.isArray(data.products) ? data.products : clone(DEFAULT_DATA.products);
      return data;
    } catch (e) {
      return clone(DEFAULT_DATA);
    }
  }

  function save(data) {
    localStorage.setItem(DATA_KEY, JSON.stringify(data));
  }

  function reset() {
    localStorage.removeItem(DATA_KEY);
  }

  // ---------- السلة ----------
  function loadCart() {
    try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; }
    catch (e) { return []; }
  }
  function saveCart(cart) { localStorage.setItem(CART_KEY, JSON.stringify(cart)); }

  // ---------- المصادقة ----------
  function login(user, pass) {
    if (user === ADMIN_USER && pass === ADMIN_PASS) {
      sessionStorage.setItem(SESSION_KEY, "1");
      localStorage.setItem(SESSION_KEY, "1");
      return true;
    }
    return false;
  }
  function isLogged() {
    return sessionStorage.getItem(SESSION_KEY) === "1" || localStorage.getItem(SESSION_KEY) === "1";
  }
  function logout() {
    sessionStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(SESSION_KEY);
  }

  function uid() {
    return "p" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  return {
    DEFAULT_DATA, placeholder,
    load, save, reset,
    loadCart, saveCart,
    login, isLogged, logout,
    uid,
    ADMIN_USER
  };
})();
