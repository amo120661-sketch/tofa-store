/* ===========================================================
   TOFA STORE - منطق لوحة التحكم
   =========================================================== */
(function () {
  "use strict";

  let data = TOFA.load();
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));

  function esc(str) {
    return String(str == null ? "" : str).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  let toastTimer;
  function toast(msg) {
    const t = $("#toast"); t.textContent = msg; t.classList.add("show");
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("show"), 2300);
  }
  function persist() { TOFA.save(data); }
  function readFile(file, cb) {
    const r = new FileReader();
    r.onload = () => cb(r.result);
    r.readAsDataURL(file);
  }

  // ---------- الدخول ----------
  function showApp() {
    $("#loginScreen").classList.add("hidden");
    $("#adminApp").classList.remove("hidden");
    $("#aLogo").src = data.settings.logo || "assets/logo.jpeg";
    $("#aName").textContent = data.settings.siteName || "لوحة التحكم";
    loadSettingsForm();
    loadContactForm();
    renderAdminProducts();
    renderSliderAdmin();
    fillCatList();
  }

  $("#loginForm").addEventListener("submit", function (e) {
    e.preventDefault();
    const ok = TOFA.login($("#user").value.trim(), $("#pass").value);
    if (ok) { $("#loginError").textContent = ""; showApp(); }
    else { $("#loginError").textContent = "اسم المستخدم أو كلمة المرور غير صحيحة"; }
  });

  $("#logoutBtn").onclick = function () { TOFA.logout(); location.reload(); };

  // ---------- التنقل ----------
  $$(".admin-side button").forEach(b => b.onclick = () => {
    $$(".admin-side button").forEach(x => x.classList.remove("active"));
    $$(".panel").forEach(x => x.classList.remove("active"));
    b.classList.add("active");
    $("#panel-" + b.dataset.panel).classList.add("active");
  });

  // ================= المنتجات =================
  let currentImage = "";

  function renderPreview() {
    $("#pPreview").innerHTML = currentImage
      ? '<img src="' + esc(currentImage) + '" alt="preview">'
      : "";
  }

  $("#prodDrop").onclick = () => $("#pFile").click();
  $("#pFile").onchange = function () {
    if (!this.files || !this.files[0]) return;
    readFile(this.files[0], (url) => { currentImage = url; $("#pImagePath").value = ""; renderPreview(); });
  };
  $("#pImagePath").addEventListener("input", function () { currentImage = this.value.trim(); renderPreview(); });

  function fillCatList() {
    const cats = [];
    data.products.forEach(p => { if (p.category && cats.indexOf(p.category) === -1) cats.push(p.category); });
    $("#catList").innerHTML = cats.map(c => '<option value="' + esc(c) + '"></option>').join("");
  }

  function resetProductForm() {
    $("#prodId").value = "";
    $("#pName").value = ""; $("#pCat").value = ""; $("#pPrice").value = "";
    $("#pOld").value = ""; $("#pBadge").value = ""; $("#pSizes").value = "";
    $("#pDesc").value = ""; $("#pImagePath").value = ""; $("#pStock").checked = true;
    $("#pFile").value = ""; currentImage = ""; renderPreview();
    $("#prodFormTitle").textContent = "➕ إضافة منتج جديد";
    $("#saveProduct").textContent = "حفظ المنتج";
  }

  $("#cancelProduct").onclick = resetProductForm;

  $("#saveProduct").onclick = function () {
    const name = $("#pName").value.trim();
    const price = $("#pPrice").value.trim();
    if (!name) { toast("⚠️ اكتب اسم المنتج"); return; }
    if (price === "" || isNaN(+price)) { toast("⚠️ اكتب سعراً صحيحاً"); return; }

    const sizes = $("#pSizes").value.split(/[,،]/).map(s => s.trim()).filter(Boolean);
    const obj = {
      name: name,
      category: $("#pCat").value.trim(),
      price: +price,
      oldPrice: +($("#pOld").value || 0),
      badge: $("#pBadge").value.trim(),
      sizes: sizes,
      description: $("#pDesc").value.trim(),
      image: currentImage,
      stock: $("#pStock").checked
    };

    const id = $("#prodId").value;
    if (id) {
      const p = data.products.find(x => x.id === id);
      Object.assign(p, obj);
      toast("✓ تم تعديل المنتج");
    } else {
      obj.id = TOFA.uid();
      data.products.unshift(obj);
      toast("✓ تمت إضافة المنتج");
    }
    persist(); renderAdminProducts(); fillCatList(); resetProductForm();
  };

  function editProduct(id) {
    const p = data.products.find(x => x.id === id);
    if (!p) return;
    $("#prodId").value = p.id;
    $("#pName").value = p.name || "";
    $("#pCat").value = p.category || "";
    $("#pPrice").value = p.price || "";
    $("#pOld").value = p.oldPrice || "";
    $("#pBadge").value = p.badge || "";
    $("#pSizes").value = (p.sizes || []).join(", ");
    $("#pDesc").value = p.description || "";
    $("#pStock").checked = p.stock !== false;
    currentImage = p.image || "";
    $("#pImagePath").value = currentImage.indexOf("data:") === 0 ? "" : currentImage;
    renderPreview();
    $("#prodFormTitle").textContent = "✏️ تعديل المنتج";
    $("#saveProduct").textContent = "حفظ التعديلات";
    $(".admin-side button[data-panel='products']").click();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function deleteProduct(id) {
    if (!confirm("هل تريد حذف هذا المنتج؟")) return;
    data.products = data.products.filter(p => p.id !== id);
    persist(); renderAdminProducts(); fillCatList();
    toast("تم حذف المنتج");
  }

  function renderAdminProducts() {
    const box = $("#adminProducts");
    $("#prodCount").textContent = data.products.length;
    if (!data.products.length) {
      box.innerHTML = '<p style="color:#6b7280">لا توجد منتجات بعد. أضف أول منتج من النموذج بالأعلى.</p>';
      return;
    }
    box.innerHTML = data.products.map(p => {
      const img = p.image ? p.image : TOFA.placeholder(p.name);
      const old = Number(p.oldPrice) > 0 ? ' <span style="color:#9ca3af;text-decoration:line-through">' + p.oldPrice + "</span>" : "";
      return '<div class="ap-card">' +
        '<img src="' + esc(img) + '" alt="' + esc(p.name) + '">' +
        '<div class="info"><h4>' + esc(p.name) + "</h4>" +
        '<div class="meta">' + esc(p.category || "بدون قسم") + " • " + (p.stock !== false ? "متوفر" : "غير متوفر") + "</div>" +
        '<div class="price">' + p.price + " <small>" + esc(data.settings.currency || "") + "</small>" + old + "</div></div>" +
        '<div class="ops">' +
        '<button class="btn btn-outline btn-sm edit">تعديل</button>' +
        '<button class="btn btn-dark btn-sm del">حذف</button>' +
        "</div></div>";
    }).join("");
    $$("#adminProducts .ap-card").forEach((card, i) => {
      const id = data.products[i].id;
      card.querySelector(".edit").onclick = () => editProduct(id);
      card.querySelector(".del").onclick = () => deleteProduct(id);
    });
  }

  // ================= السلايدر =================
  function renderSliderAdmin() {
    const box = $("#sliderAdmin");
    const list = data.slider || [];
    if (!list.length) { box.innerHTML = '<p style="color:#6b7280">لا توجد صور بعد.</p>'; return; }
    box.innerHTML = list.map((src, i) =>
      '<div class="sa-item">' +
      '<span class="num">' + (i + 1) + "</span>" +
      '<img src="' + esc(src) + '" alt="slide ' + (i + 1) + '">' +
      '<button class="del" data-i="' + i + '" title="حذف">×</button>' +
      '<div style="display:flex;gap:6px;padding:8px">' +
      '<button class="btn btn-outline btn-sm" data-left="' + i + '" style="flex:1" ' + (i === 0 ? "disabled" : "") + '>→</button>' +
      '<button class="btn btn-outline btn-sm" data-right="' + i + '" style="flex:1" ' + (i === list.length - 1 ? "disabled" : "") + '>←</button>' +
      "</div></div>"
    ).join("");
    $$("#sliderAdmin .del").forEach(b => b.onclick = () => { data.slider.splice(+b.dataset.i, 1); persist(); renderSliderAdmin(); });
    $$("#sliderAdmin [data-left]").forEach(b => b.onclick = () => moveSlide(+b.dataset.left, -1));
    $$("#sliderAdmin [data-right]").forEach(b => b.onclick = () => moveSlide(+b.dataset.right, 1));
  }
  function moveSlide(i, dir) {
    const j = i + dir;
    if (j < 0 || j >= data.slider.length) return;
    const tmp = data.slider[i]; data.slider[i] = data.slider[j]; data.slider[j] = tmp;
    persist(); renderSliderAdmin();
  }

  $("#slideDrop").onclick = () => $("#sFile").click();
  $("#sFile").onchange = function () {
    const files = Array.from(this.files || []);
    if (!files.length) return;
    let done = 0;
    files.forEach(f => readFile(f, (url) => {
      data.slider.push(url);
      if (++done === files.length) { persist(); renderSliderAdmin(); toast("✓ تمت إضافة " + files.length + " صورة"); }
    }));
    this.value = "";
  };
  $("#addSlidePath").onclick = function () {
    const v = $("#sPath").value.trim();
    if (!v) return;
    data.slider.push(v); persist(); renderSliderAdmin(); $("#sPath").value = "";
    toast("✓ تمت إضافة الصورة");
  };

  // ================= الإعدادات =================
  function loadSettingsForm() {
    const s = data.settings;
    $("#sName").value = s.siteName || "";
    $("#sTag").value = s.tagline || "";
    $("#sCurrency").value = s.currency || "";
    $("#sAnnounce").value = s.announcement || "";
    $("#sPrimary").value = s.primaryColor || "#c1121f";
    $("#sDark").value = s.darkColor || "#141414";
    $("#sBannerTitle").value = s.bannerTitle || "";
    $("#sBannerText").value = s.bannerText || "";
    $("#logoPreview").innerHTML = s.logo ? '<img src="' + esc(s.logo) + '">' : "";
    $("#bannerPreview").innerHTML = s.banner ? '<img src="' + esc(s.banner) + '">' : "";
  }
  $("#logoDrop").onclick = () => $("#logoFile").click();
  $("#logoFile").onchange = function () {
    if (!this.files[0]) return;
    readFile(this.files[0], (url) => { data.settings.logo = url; persist(); $("#logoPreview").innerHTML = '<img src="' + url + '">'; $("#aLogo").src = url; toast("✓ تم تغيير الشعار"); });
  };
  $("#bannerDrop").onclick = () => $("#bannerFile").click();
  $("#bannerFile").onchange = function () {
    if (!this.files[0]) return;
    readFile(this.files[0], (url) => { data.settings.banner = url; persist(); $("#bannerPreview").innerHTML = '<img src="' + url + '">'; toast("✓ تم تغيير البانر"); });
  };
  $("#saveSettings").onclick = function () {
    const s = data.settings;
    s.siteName = $("#sName").value.trim();
    s.tagline = $("#sTag").value.trim();
    s.currency = $("#sCurrency").value.trim() || "ج.م";
    s.announcement = $("#sAnnounce").value.trim();
    s.primaryColor = $("#sPrimary").value;
    s.darkColor = $("#sDark").value;
    s.bannerTitle = $("#sBannerTitle").value.trim();
    s.bannerText = $("#sBannerText").value.trim();
    persist(); $("#aName").textContent = s.siteName || "لوحة التحكم";
    toast("✓ تم حفظ الإعدادات");
  };

  // ================= التواصل =================
  function loadContactForm() {
    const s = data.settings;
    $("#cPhone").value = s.phone || "";
    $("#cPhone2").value = s.phone2 || "";
    $("#cWhats").value = s.whatsapp || "";
    $("#cEmail").value = s.email || "";
    $("#cAddress").value = s.address || "";
    $("#cFb").value = s.facebook || "";
    $("#cIg").value = s.instagram || "";
  }
  $("#saveContact").onclick = function () {
    const s = data.settings;
    s.phone = $("#cPhone").value.trim();
    s.phone2 = $("#cPhone2").value.trim();
    s.whatsapp = $("#cWhats").value.trim();
    s.email = $("#cEmail").value.trim();
    s.address = $("#cAddress").value.trim();
    s.facebook = $("#cFb").value.trim();
    s.instagram = $("#cIg").value.trim();
    persist(); toast("✓ تم حفظ بيانات التواصل");
  };

  // ================= النسخ الاحتياطي =================
  $("#exportBtn").onclick = function () {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "tofa-backup-" + new Date().toISOString().slice(0, 10) + ".json";
    a.click(); URL.revokeObjectURL(a.href);
    toast("✓ تم تصدير النسخة");
  };
  $("#importBtn").onclick = () => $("#importFile").click();
  $("#importFile").onchange = function () {
    const f = this.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const obj = JSON.parse(r.result);
        if (!obj || typeof obj !== "object") throw 0;
        data = obj;
        data.settings = Object.assign({}, TOFA.DEFAULT_DATA.settings, data.settings || {});
        data.slider = data.slider || [];
        data.products = data.products || [];
        persist(); showApp();
        $$(".admin-side button")[0].click();
        toast("✓ تم استيراد النسخة");
      } catch (e) { toast("⚠️ ملف غير صالح"); }
    };
    r.readAsText(f); this.value = "";
  };
  $("#resetBtn").onclick = function () {
    if (!confirm("سيتم حذف كل البيانات والعودة للإعدادات الافتراضية. متأكد؟")) return;
    TOFA.reset(); data = TOFA.load(); showApp();
    $$(".admin-side button")[0].click();
    toast("تمت استعادة الإعدادات الافتراضية");
  };

  // ---------- التهيئة ----------
  if (TOFA.isLogged()) showApp();
})();
