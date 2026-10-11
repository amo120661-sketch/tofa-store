/* ===========================================================
   TOFA STORE - منطق صفحة المتجر
   =========================================================== */
(function () {
  "use strict";

  let data = TOFA.load();
  let settings = data.settings;
  let cart = TOFA.loadCart();
  const cur = () => settings.currency || "ج.م";

  // ---------- أدوات ----------
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));

  function money(n) {
    return Number(n || 0).toLocaleString("en-US") + " " + cur();
  }
  function esc(str) {
    return String(str == null ? "" : str).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function imgOf(p) { return p.image ? p.image : TOFA.placeholder(p.name); }

  let toastTimer;
  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), 2400);
  }

  function waNumber(raw) {
    let s = String(raw || "").replace(/\D/g, "");
    if (!s) return "";
    if (s.indexOf("20") === 0) return s;
    if (s[0] === "0") return "20" + s.slice(1);
    if (s.length === 10 && s[0] === "1") return "20" + s;
    return s;
  }

  // ---------- تطبيق الإعدادات على الواجهة ----------
  function applySettings() {
    $("#announce").textContent = settings.announcement || "";
    $("#brandLogo").src = settings.logo || "assets/logo.jpeg";
    $("#brandName").textContent = settings.siteName || "متجري";
    $("#brandTag").textContent = settings.tagline || "";

    $("#promoImg").src = settings.banner || "assets/banner.jpeg";
    $("#promoTitle").textContent = settings.bannerTitle || "";
    $("#promoText").textContent = settings.bannerText || "";

    $("#footLogo").src = settings.logo || "assets/logo.jpeg";
    $("#footName").textContent = settings.siteName || "متجري";
    $("#footTag").textContent = settings.tagline || "";
    $("#footAddress").textContent = settings.address || "";
    $("#footPhone").textContent = settings.phone || "";
    if (settings.phone) $("#footPhone").href = "tel:" + settings.phone;
    if (settings.phone2) {
      $("#footPhone2Li").classList.remove("hidden");
      $("#footPhone2").textContent = settings.phone2;
      $("#footPhone2").href = "tel:" + settings.phone2;
    }
    const wa = waNumber(settings.whatsapp);
    $("#footWa").href = wa ? "https://wa.me/" + wa : "#";
    document.title = (settings.siteName || "متجري") + " - متجر إلكتروني";

    const soc = $("#socials");
    let html = "";
    if (settings.facebook) html += '<a href="' + esc(settings.facebook) + '" target="_blank" rel="noopener" title="فيسبوك">f</a>';
    if (settings.instagram) html += '<a href="' + esc(settings.instagram) + '" target="_blank" rel="noopener" title="انستجرام">◎</a>';
    if (wa) html += '<a href="https://wa.me/' + wa + '" target="_blank" rel="noopener" title="واتساب">✆</a>';
    soc.innerHTML = html;

    $("#footBottom").textContent = "© " + new Date().getFullYear() + " " +
      (settings.siteName || "") + " - جميع الحقوق محفوظة";

    if (settings.primaryColor) document.documentElement.style.setProperty("--primary", settings.primaryColor);
    if (settings.darkColor) document.documentElement.style.setProperty("--dark", settings.darkColor);
  }

  // ---------- السلايدر ----------
  function buildSlider() {
    const imgs = (data.slider || []).filter(Boolean);
    const track = $("#sliderTrack");
    const dots = $("#sliderDots");
    if (!imgs.length) { $("#slider").style.display = "none"; return; }
    $("#slider").style.display = "";
    track.innerHTML = imgs.map(function (src, i) {
      return '<div class="slide"><img src="' + esc(src) + '" alt="slide ' + (i + 1) + '">' +
        (settings.siteName ? '<div class="slide-caption"><h2>' + esc(settings.siteName) +
          '</h2><p>' + esc(settings.tagline || "") + '</p></div>' : "") + "</div>";
    }).join("");
    dots.innerHTML = imgs.map((_, i) => '<button data-i="' + i + '"></button>').join("");

    let idx = 0, timer = null;
    const total = imgs.length;
    function go(i) {
      idx = (i + total) % total;
      track.style.transform = "translateX(" + (idx * 100) + "%)";
      $$("#sliderDots button").forEach((b, k) => b.classList.toggle("active", k === idx));
    }
    function nextS() { go(idx + 1); }
    function prevS() { go(idx - 1); }
    function play() { stopP(); if (total > 1) timer = setInterval(nextS, 4500); }
    function stopP() { if (timer) clearInterval(timer); }

    if (total > 1) {
      $("#slideNext").style.display = "";
      $("#slidePrev").style.display = "";
    } else {
      $("#slideNext").style.display = "none";
      $("#slidePrev").style.display = "none";
    }
    $("#slideNext").onclick = () => { nextS(); play(); };
    $("#slidePrev").onclick = () => { prevS(); play(); };
    $$("#sliderDots button").forEach((b) => b.onclick = () => { go(+b.dataset.i); play(); });

    const slider = $("#slider");
    slider.onmouseenter = stopP;
    slider.onmouseleave = play;
    let startX = null;
    slider.addEventListener("touchstart", (e) => { startX = e.touches[0].clientX; stopP(); }, { passive: true });
    slider.addEventListener("touchend", (e) => {
      if (startX === null) return;
      const dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 45) { dx > 0 ? prevS() : nextS(); }
      startX = null; play();
    });

    go(0); play();
  }

  // ---------- المنتجات ----------
  let activeCat = "الكل";

  function categories() {
    const set = [];
    data.products.forEach(p => { if (p.category && set.indexOf(p.category) === -1) set.push(p.category); });
    return set;
  }

  function renderFilters() {
    const cats = ["الكل"].concat(categories());
    $("#filters").innerHTML = cats.map(c =>
      '<button class="chip' + (c === activeCat ? " active" : "") + '" data-cat="' + esc(c) + '">' + esc(c) + "</button>"
    ).join("");
    $$("#filters .chip").forEach(b => b.onclick = () => { activeCat = b.dataset.cat; renderFilters(); renderProducts(); });
  }

  function renderProducts() {
    const list = data.products.filter(p => activeCat === "الكل" || p.category === activeCat);
    const grid = $("#productsGrid");
    if (!list.length) {
      grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:#6b7280;padding:40px">لا توجد منتجات في هذا القسم.</p>';
      return;
    }
    grid.innerHTML = list.map(p => {
      const out = p.stock === false;
      const old = Number(p.oldPrice) > 0 ? '<span class="old-price">' + money(p.oldPrice) + "</span>" : "";
      const badge = out ? '<span class="badge out">غير متوفر</span>' :
        (p.badge ? '<span class="badge">' + esc(p.badge) + "</span>" : "");
      return '<article class="card">' +
        '<div class="card-media">' + badge +
        '<img src="' + esc(imgOf(p)) + '" alt="' + esc(p.name) + '" loading="lazy">' +
        "</div>" +
        '<div class="card-body">' +
        (p.category ? '<span class="cat">' + esc(p.category) + "</span>" : "") +
        "<h3>" + esc(p.name) + "</h3>" +
        '<p class="desc">' + esc(p.description || "") + "</p>" +
        (p.sizes && p.sizes.length ? '<p class="desc">المقاسات: ' + esc(p.sizes.join(" / ")) + "</p>" : "") +
        '<div class="price-row"><span class="price">' + money(p.price) + "</span>" + old + "</div>" +
        '<div class="card-actions">' +
        (out ? '<button class="btn btn-outline btn-block" disabled>غير متوفر</button>'
             : '<button class="btn btn-primary add btn-block" data-id="' + p.id + '">🛒 أضف للسلة</button>') +
        "</div></div></article>";
    }).join("");
    $$("#productsGrid .add").forEach(b => b.onclick = () => addToCart(b.dataset.id));
  }

  // ---------- السلة ----------
  function findProduct(id) { return data.products.find(p => p.id === id); }

  function addToCart(id) {
    const p = findProduct(id);
    if (!p || p.stock === false) return;
    const item = cart.find(c => c.id === id);
    if (item) item.qty += 1;
    else cart.push({ id: p.id, name: p.name, price: Number(p.price), image: imgOf(p), qty: 1, selected: true });
    saveCart(); renderCart(); toast("✓ تمت إضافة «" + p.name + "» إلى السلة");
  }

  function saveCart() {
    TOFA.saveCart(cart);
    const count = cart.reduce((s, c) => s + c.qty, 0);
    const badge = $("#cartCount");
    badge.textContent = count;
    badge.style.display = count ? "flex" : "none";
  }

  function renderCart() {
    const box = $("#cartItems");
    if (!cart.length) {
      box.innerHTML = '<div class="cart-empty"><div class="big">🛒</div><p>سلتك فارغة حالياً</p>' +
        '<p style="font-size:13px">أضف بعض المنتجات لتبدأ التسوق</p></div>';
      $("#selectAll").checked = false;
      $("#cartTotal").textContent = money(0);
      return;
    }
    box.innerHTML = cart.map((c, i) =>
      '<div class="cart-item">' +
      '<input type="checkbox" class="sel" data-i="' + i + '"' + (c.selected ? " checked" : "") + ">" +
      '<img src="' + esc(c.image) + '" alt="' + esc(c.name) + '">' +
      '<div class="ci-info">' +
      "<h4>" + esc(c.name) + "</h4>" +
      '<div class="price">' + money(c.price) + "</div>" +
      '<div class="ci-actions">' +
      '<div class="qty-box"><button data-i="' + i + '" data-d="-1">−</button><span>' + c.qty + '</span><button data-i="' + i + '" data-d="1">+</button></div>' +
      '<button class="ci-remove" data-rm="' + i + '">حذف</button>' +
      "</div></div></div>"
    ).join("");

    $$("#cartItems .sel").forEach(cb => cb.onchange = () => { cart[+cb.dataset.i].selected = cb.checked; saveCart(); updateTotal(); });
    $$("#cartItems .qty-box button").forEach(b => b.onclick = () => {
      const i = +b.dataset.i, d = +b.dataset.d;
      cart[i].qty += d;
      if (cart[i].qty < 1) cart.splice(i, 1);
      saveCart(); renderCart();
    });
    $$("#cartItems .ci-remove").forEach(b => b.onclick = () => { cart.splice(+b.dataset.rm, 1); saveCart(); renderCart(); });

    $("#selectAll").checked = cart.length > 0 && cart.every(c => c.selected);
    updateTotal();
  }

  function updateTotal() {
    const total = cart.filter(c => c.selected).reduce((s, c) => s + c.price * c.qty, 0);
    $("#cartTotal").textContent = money(total);
  }

  function openCart() { $("#cartDrawer").classList.add("open"); $("#overlay").classList.add("open"); }
  function closeCart() { $("#cartDrawer").classList.remove("open"); $("#overlay").classList.remove("open"); }

  function buy() {
    const chosen = cart.filter(c => c.selected);
    if (!chosen.length) { toast("⚠️ اختر منتجاً واحداً على الأقل"); return; }
    const wa = waNumber(settings.whatsapp);
    if (!wa) { toast("⚠️ لم يتم ضبط رقم واتساب في لوحة التحكم"); return; }

    const name = ($("#custName").value || "").trim();
    const phone = ($("#custPhone").value || "").trim();
    const address = ($("#custAddress").value || "").trim();
    const total = chosen.reduce((s, c) => s + c.price * c.qty, 0);

    let lines = [];
    lines.push("🛍️ *طلب جديد من " + (settings.siteName || "المتجر") + "*");
    lines.push("");
    lines.push("*المنتجات:*");
    chosen.forEach((c, i) => {
      lines.push((i + 1) + ". " + c.name + " | الكمية: " + c.qty + " | السعر: " + money(c.price * c.qty));
    });
    lines.push("");
    lines.push("*الإجمالي:* " + money(total));
    lines.push("");
    lines.push("*بيانات العميل:*");
    lines.push("الاسم: " + (name || "-"));
    lines.push("الهاتف: " + (phone || "-"));
    lines.push("العنوان: " + (address || "-"));

    const url = "https://wa.me/" + wa + "?text=" + encodeURIComponent(lines.join("\n"));
    window.open(url, "_blank");
    toast("✓ تم تحويلك إلى واتساب لإتمام الطلب");
  }

  // ---------- التهيئة ----------
  function init() {
    applySettings();
    buildSlider();
    renderFilters();
    renderProducts();
    saveCart();
    renderCart();

    $("#openCart").onclick = openCart;
    $("#footerOrder").onclick = openCart;
    $("#closeCart").onclick = closeCart;
    $("#overlay").onclick = closeCart;
    $("#buyBtn").onclick = buy;
    $("#selectAll").onchange = function () {
      cart.forEach(c => c.selected = this.checked);
      saveCart(); renderCart();
    };
    $("#menuToggle").onclick = () => $("#mainNav").classList.toggle("open");

    // إعادة القراءة لو تغيّرت البيانات من لوحة التحكم في تبويب آخر
    window.addEventListener("storage", (e) => {
      if (e.key === "tofa_store_data_v1") { data = TOFA.load(); settings = data.settings; applySettings(); buildSlider(); renderFilters(); renderProducts(); }
    });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
