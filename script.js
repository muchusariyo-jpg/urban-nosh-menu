/* =========================================================
   URBAN NOSH — Menu PWA — script.js
   Everything on screen is generated from menu.json and
   restaurant.json. To change the menu or business details,
   edit those two files and replace images — never edit this
   file or index.html for routine menu updates.
   ========================================================= */

(function () {
  "use strict";

  const state = {
    restaurant: null,
    items: [],
    categories: [], // ordered list of category names as they appear in menu.json
    activeCategory: "all",
    searchTerm: "",
    activeFilters: new Set(), // veg, nonveg, bestSeller, chefSpecial, newItem, favorites
    sortMode: "default",
    viewMode: "list", // list | grid
    favorites: new Set(JSON.parse(localStorage.getItem("un_favorites") || "[]")),
    recentlyViewed: JSON.parse(localStorage.getItem("un_recent") || "[]"),
  };

  const $ = (sel, ctx) => (ctx || document).querySelector(sel);
  const $$ = (sel, ctx) => Array.from((ctx || document).querySelectorAll(sel));

  // ---------------------------------------------------------
  // DATA LOADING
  // ---------------------------------------------------------
  async function loadData() {
    const [restaurantRes, menuRes] = await Promise.all([
      fetch("restaurant.json").then((r) => r.json()),
      fetch("menu.json").then((r) => r.json()),
    ]);
    state.restaurant = restaurantRes;
    state.items = menuRes.items;

    // Preserve first-seen order of categories from menu.json
    const seen = new Set();
    state.categories = [];
    state.items.forEach((it) => {
      if (!seen.has(it.category)) {
        seen.add(it.category);
        state.categories.push(it.category);
      }
    });
  }

  // ---------------------------------------------------------
  // RENDER: HEADER / RESTAURANT INFO
  // ---------------------------------------------------------
  function renderRestaurantInfo() {
    const r = state.restaurant;
    $("#brandName").textContent = r.name;
    $("#brandHandle").textContent = r.handle;
    $("#brandTagline").textContent = r.tagline;
    $("#logoCrest").textContent = r.logoText || "UN";
    $("#logoCrestSplash").textContent = r.logoText || "UN";

    const servicesRow = $("#servicesRow");
    servicesRow.innerHTML = "";
    (r.services || []).forEach((s) => {
      const span = document.createElement("span");
      span.className = "service-pill";
      span.textContent = s;
      servicesRow.appendChild(span);
    });

    // Footer
    $("#footerBrand").textContent = r.name;
    $("#footerHandle").textContent = r.handle + " — " + (r.address || "");

    // Info section
    $("#infoAddress").textContent = r.address || "Address coming soon";
    $("#infoPhone").textContent = r.phone || "";
    $("#infoHours").innerHTML = (r.openingHours || [])
      .map((h) => `<span>${h.day}: ${h.hours}</span>`)
      .join("<br>");

    const social = $("#socialRow");
    social.innerHTML = "";
    if (r.instagram) social.appendChild(makeSocialLink(r.instagram, "IG"));
    if (r.facebook) social.appendChild(makeSocialLink(r.facebook, "FB"));

    // Floating buttons
    const waNum = (r.whatsapp || "").replace(/[^0-9]/g, "");
    $("#whatsappFab").href = waNum
      ? `https://wa.me/${waNum}?text=${encodeURIComponent("Hi Urban Nosh! I'd like to place an order.")}`
      : "#";
    $("#callFab").href = r.phone ? `tel:${r.phone}` : "#";
  }

  function makeSocialLink(url, label) {
    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener";
    a.setAttribute("aria-label", label);
    a.textContent = label === "IG" ? "📷" : "📘";
    return a;
  }

  // ---------------------------------------------------------
  // RENDER: CATEGORY NAV
  // ---------------------------------------------------------
  function renderCategoryNav() {
    const nav = $("#catNav");
    nav.innerHTML = "";
    const allBtn = document.createElement("button");
    allBtn.textContent = "All";
    allBtn.dataset.cat = "all";
    allBtn.className = state.activeCategory === "all" ? "active" : "";
    nav.appendChild(allBtn);

    state.categories.forEach((cat) => {
      const btn = document.createElement("button");
      btn.textContent = cat;
      btn.dataset.cat = cat;
      btn.className = state.activeCategory === cat ? "active" : "";
      nav.appendChild(btn);
    });

    nav.addEventListener("click", (e) => {
      const btn = e.target.closest("button");
      if (!btn) return;
      state.activeCategory = btn.dataset.cat;
      $$("#catNav button").forEach((b) => b.classList.toggle("active", b === btn));
      if (btn.dataset.cat !== "all") {
        const target = document.getElementById("cat-" + slugify(btn.dataset.cat));
        if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }, { once: true });
  }

  function slugify(str) {
    return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  }

  // ---------------------------------------------------------
  // FILTERING / SORTING
  // ---------------------------------------------------------
  function getFilteredItems() {
    let list = state.items.slice();

    if (state.searchTerm.trim()) {
      const q = state.searchTerm.trim().toLowerCase();
      list = list.filter(
        (it) =>
          it.name.toLowerCase().includes(q) ||
          (it.description || "").toLowerCase().includes(q) ||
          (it.tags || []).some((t) => t.toLowerCase().includes(q)) ||
          it.category.toLowerCase().includes(q) ||
          it.subcategory.toLowerCase().includes(q)
      );
    }

    if (state.activeFilters.has("veg")) list = list.filter((it) => it.veg === true);
    if (state.activeFilters.has("nonveg")) list = list.filter((it) => it.veg === false);
    if (state.activeFilters.has("bestSeller")) list = list.filter((it) => it.bestSeller);
    if (state.activeFilters.has("chefSpecial")) list = list.filter((it) => it.chefSpecial);
    if (state.activeFilters.has("newItem")) list = list.filter((it) => it.newItem);
    if (state.activeFilters.has("favorites")) list = list.filter((it) => state.favorites.has(it.id));

    switch (state.sortMode) {
      case "priceLow":
        list.sort((a, b) => a.price - b.price);
        break;
      case "priceHigh":
        list.sort((a, b) => b.price - a.price);
        break;
      case "az":
        list.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "recent":
        list.sort((a, b) => b.id - a.id);
        break;
      default:
        break; // keep menu.json order
    }

    return list;
  }

  // ---------------------------------------------------------
  // RENDER: HIGHLIGHT STRIPS (Today's Special / Chef Recommends)
  // ---------------------------------------------------------
  function renderHighlights() {
    const specialWrap = $("#todaysSpecialScroll");
    const chefWrap = $("#chefRecoScroll");
    const specialSection = $("#todaysSpecialSection");
    const chefSection = $("#chefRecoSection");

    const specials = state.items.filter((it) => it.bestSeller).slice(0, 10);
    const chefPicks = state.items.filter((it) => it.chefSpecial).slice(0, 10);

    specialSection.style.display = specials.length ? "" : "none";
    chefSection.style.display = chefPicks.length ? "" : "none";

    specialWrap.innerHTML = specials.map(highlightCardHTML).join("");
    chefWrap.innerHTML = chefPicks.map(highlightCardHTML).join("");

    $$(".highlight-card", specialWrap).forEach((el) => el.addEventListener("click", () => openModal(Number(el.dataset.id))));
    $$(".highlight-card", chefWrap).forEach((el) => el.addEventListener("click", () => openModal(Number(el.dataset.id))));
  }

  function highlightCardHTML(it) {
    return `
      <div class="highlight-card" data-id="${it.id}" role="button" tabindex="0">
        ${photoHTML(it, "item-photo")}
        <span class="item-name">${escapeHTML(it.name)}</span>
        <span class="item-price">₹${it.price}</span>
      </div>`;
  }

  // ---------------------------------------------------------
  // RENDER: MENU SECTIONS
  // ---------------------------------------------------------
  function renderMenu() {
    const container = $("#menuSections");
    const filtered = getFilteredItems();

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="big-icon">🍽️</div>
          <p>No items match that search or filter.</p>
        </div>`;
      return;
    }

    // Group by category > subcategory, respecting original order
    const byCategory = {};
    filtered.forEach((it) => {
      byCategory[it.category] = byCategory[it.category] || {};
      byCategory[it.category][it.subcategory] = byCategory[it.category][it.subcategory] || [];
      byCategory[it.category][it.subcategory].push(it);
    });

    const categoriesToRender =
      state.activeCategory === "all" ? state.categories : [state.activeCategory];

    let html = "";
    categoriesToRender.forEach((cat) => {
      if (!byCategory[cat]) return;
      const subcats = byCategory[cat];
      const totalCount = Object.values(subcats).reduce((s, arr) => s + arr.length, 0);

      html += `
        <section class="category-section" id="cat-${slugify(cat)}">
          <div class="sec-head">
            <h2 class="sec-title">${escapeHTML(cat)}</h2>
            <span class="sec-count">${totalCount} items</span>
          </div>
          <hr class="divider">`;

      Object.keys(subcats).forEach((sub) => {
        html += `<div class="subcategory-block">`;
        if (sub && sub !== cat) {
          html += `<h3 class="subcat-title">${escapeHTML(sub)}</h3>`;
        }
        html += `<div class="item-grid ${state.viewMode === "grid" ? "grid-2col" : ""}">`;
        subcats[sub].forEach((it) => {
          html += itemCardHTML(it);
        });
        html += `</div></div>`;
      });

      html += `</section>`;
    });

    container.innerHTML = html;

    // Wire up interactions
    $$(".item-card", container).forEach((card) => {
      card.addEventListener("click", (e) => {
        if (e.target.closest(".fav-btn")) return;
        openModal(Number(card.dataset.id));
      });
    });
    $$(".fav-btn", container).forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        toggleFavorite(Number(btn.dataset.id));
      });
    });
  }

  function itemCardHTML(it) {
    const isFav = state.favorites.has(it.id);
    const vegDot = it.veg === true ? '<span class="veg-dot" title="Veg"></span>' : it.veg === false ? '<span class="veg-dot nonveg" title="Non-veg"></span>' : "";
    const badges = [];
    if (!it.available) badges.push('<span class="badge out">Out of stock</span>');
    if (it.bestSeller) badges.push('<span class="badge best">Best Seller</span>');
    if (it.chefSpecial) badges.push('<span class="badge chef">Chef Recommends</span>');
    if (it.newItem) badges.push('<span class="badge new">New</span>');

    return `
      <article class="item-card" data-id="${it.id}" role="button" tabindex="0" aria-label="${escapeHTML(it.name)}, ₹${it.price}">
        <button class="fav-btn ${isFav ? "active" : ""}" data-id="${it.id}" aria-label="${isFav ? "Remove from favorites" : "Add to favorites"}">${isFav ? "♥" : "♡"}</button>
        ${photoHTML(it, "item-photo")}
        <div class="item-info">
          <div class="item-top-row">
            <div class="item-name-row">
              ${vegDot}
              <span class="item-name">${escapeHTML(it.name)}</span>
            </div>
            <span class="item-price">₹${it.price}</span>
          </div>
          ${it.description ? `<div class="item-desc">${escapeHTML(it.description)}</div>` : ""}
          ${badges.length ? `<div class="badge-row">${badges.join("")}</div>` : ""}
        </div>
      </article>`;
  }

  function photoHTML(it, cls) {
    if (it.image) {
      return `<img class="${cls}" src="${it.image}" alt="${escapeHTML(it.name)}" loading="lazy">`;
    }
    return `<div class="${cls} empty" aria-hidden="true">🍴</div>`;
  }

  function escapeHTML(str) {
    return String(str || "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));
  }

  // ---------------------------------------------------------
  // FAVORITES
  // ---------------------------------------------------------
  function toggleFavorite(id) {
    if (state.favorites.has(id)) {
      state.favorites.delete(id);
      showToast("Removed from favorites");
    } else {
      state.favorites.add(id);
      showToast("Added to favorites");
    }
    localStorage.setItem("un_favorites", JSON.stringify(Array.from(state.favorites)));
    renderMenu();
    if ($("#modalOverlay").classList.contains("open")) {
      const openId = Number($("#modalOverlay").dataset.openId);
      if (openId === id) updateModalFavButton(id);
    }
  }

  // ---------------------------------------------------------
  // RECENTLY VIEWED
  // ---------------------------------------------------------
  function pushRecentlyViewed(id) {
    state.recentlyViewed = state.recentlyViewed.filter((x) => x !== id);
    state.recentlyViewed.unshift(id);
    state.recentlyViewed = state.recentlyViewed.slice(0, 12);
    localStorage.setItem("un_recent", JSON.stringify(state.recentlyViewed));
  }

  // ---------------------------------------------------------
  // MODAL
  // ---------------------------------------------------------
  function openModal(id) {
    const it = state.items.find((x) => x.id === id);
    if (!it) return;
    pushRecentlyViewed(id);

    const overlay = $("#modalOverlay");
    overlay.dataset.openId = id;

    $("#modalPhotoWrap").innerHTML = it.image
      ? `<img class="modal-photo" src="${it.image}" alt="${escapeHTML(it.name)}">`
      : `<div class="modal-photo empty">🍴</div>`;

    $("#modalTitle").textContent = it.name;
    $("#modalPrice").textContent = "₹" + it.price;
    $("#modalDesc").textContent = it.description || "No description added yet.";
    $("#modalCategory").textContent = it.category + (it.subcategory && it.subcategory !== it.category ? " · " + it.subcategory : "");
    $("#modalPrepTime").textContent = it.preparationTime || "—";

    const spicyMeter = $("#modalSpicyMeter");
    spicyMeter.innerHTML = "";
    for (let i = 1; i <= 3; i++) {
      const span = document.createElement("span");
      if (i <= (it.spicyLevel || 0)) span.className = "on";
      spicyMeter.appendChild(span);
    }

    const badgeWrap = $("#modalBadges");
    const badges = [];
    if (it.veg === true) badges.push('<span class="badge chef">Veg</span>');
    if (it.veg === false) badges.push('<span class="badge best">Non-Veg</span>');
    if (!it.available) badges.push('<span class="badge out">Out of stock</span>');
    if (it.bestSeller) badges.push('<span class="badge best">Best Seller</span>');
    if (it.chefSpecial) badges.push('<span class="badge chef">Chef Recommends</span>');
    if (it.newItem) badges.push('<span class="badge new">New</span>');
    badgeWrap.innerHTML = badges.join("");

    updateModalFavButton(id);

    // Related items = same category, different item, capped at 8
    const related = state.items.filter((x) => x.category === it.category && x.id !== it.id).slice(0, 8);
    const relatedWrap = $("#relatedScroll");
    $("#modalRelatedBlock").style.display = related.length ? "" : "none";
    relatedWrap.innerHTML = related.map((r) => `
      <div class="related-card" data-id="${r.id}" role="button" tabindex="0">
        ${photoHTML(r, "item-photo")}
        <span class="item-name">${escapeHTML(r.name)}</span>
        <span class="item-price">₹${r.price}</span>
      </div>`).join("");
    $$(".related-card", relatedWrap).forEach((el) =>
      el.addEventListener("click", () => openModal(Number(el.dataset.id)))
    );

    overlay.classList.add("open");
    document.body.style.overflow = "hidden";
  }

  function updateModalFavButton(id) {
    const btn = $("#modalFavBtn");
    const isFav = state.favorites.has(id);
    btn.textContent = isFav ? "♥ Saved to favorites" : "♡ Add to favorites";
    btn.classList.toggle("active", isFav);
    btn.dataset.id = id;
  }

  function closeModal() {
    $("#modalOverlay").classList.remove("open");
    document.body.style.overflow = "";
  }

  // ---------------------------------------------------------
  // TOAST
  // ---------------------------------------------------------
  let toastTimer = null;
  function showToast(msg) {
    const toast = $("#toast");
    toast.textContent = msg;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 1800);
  }

  // ---------------------------------------------------------
  // SEARCH
  // ---------------------------------------------------------
  function setupSearch() {
    const input = $("#searchInput");
    const bar = $("#searchBar");
    const clearBtn = $("#clearSearch");
    const suggestions = $("#searchSuggestions");

    input.addEventListener("input", () => {
      state.searchTerm = input.value;
      bar.classList.toggle("has-text", !!input.value);
      renderMenu();

      if (input.value.trim().length >= 2) {
        const q = input.value.trim().toLowerCase();
        const matches = state.items
          .filter((it) => it.name.toLowerCase().includes(q))
          .slice(0, 6);
        if (matches.length) {
          suggestions.innerHTML = matches
            .map((m) => `<button data-id="${m.id}">${escapeHTML(m.name)} — ₹${m.price}</button>`)
            .join("");
          suggestions.classList.add("show");
        } else {
          suggestions.classList.remove("show");
        }
      } else {
        suggestions.classList.remove("show");
      }
    });

    suggestions.addEventListener("click", (e) => {
      const btn = e.target.closest("button");
      if (!btn) return;
      suggestions.classList.remove("show");
      openModal(Number(btn.dataset.id));
    });

    document.addEventListener("click", (e) => {
      if (!bar.contains(e.target)) suggestions.classList.remove("show");
    });

    clearBtn.addEventListener("click", () => {
      input.value = "";
      state.searchTerm = "";
      bar.classList.remove("has-text");
      suggestions.classList.remove("show");
      renderMenu();
    });
  }

  // ---------------------------------------------------------
  // FILTER CHIPS / SORT / VIEW TOGGLE
  // ---------------------------------------------------------
  function setupControls() {
    $$(".filter-chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        const key = chip.dataset.filter;
        if (state.activeFilters.has(key)) {
          state.activeFilters.delete(key);
          chip.classList.remove("active");
        } else {
          state.activeFilters.add(key);
          chip.classList.add("active");
        }
        renderMenu();
      });
    });

    $("#sortSelect").addEventListener("change", (e) => {
      state.sortMode = e.target.value;
      renderMenu();
    });

    $$(".view-toggle button").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.viewMode = btn.dataset.view;
        $$(".view-toggle button").forEach((b) => b.classList.toggle("active", b === btn));
        renderMenu();
      });
    });
  }

  // ---------------------------------------------------------
  // DARK MODE
  // ---------------------------------------------------------
  function setupDarkMode() {
    const toggle = $("#darkModeToggle");
    const saved = localStorage.getItem("un_theme");
    if (saved === "dark") {
      document.documentElement.setAttribute("data-theme", "dark");
      toggle.textContent = "☀️";
    }
    toggle.addEventListener("click", () => {
      const isDark = document.documentElement.getAttribute("data-theme") === "dark";
      if (isDark) {
        document.documentElement.removeAttribute("data-theme");
        localStorage.setItem("un_theme", "light");
        toggle.textContent = "🌙";
      } else {
        document.documentElement.setAttribute("data-theme", "dark");
        localStorage.setItem("un_theme", "dark");
        toggle.textContent = "☀️";
      }
    });
  }

  // ---------------------------------------------------------
  // SCROLL PROGRESS + BACK TO TOP + STICKY NAV HIGHLIGHT
  // ---------------------------------------------------------
  function setupScrollBehavior() {
    const progress = $("#scrollProgress");
    const topFab = $("#topFab");

    window.addEventListener("scroll", () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.width = docHeight > 0 ? (scrollTop / docHeight) * 100 + "%" : "0%";
      topFab.classList.toggle("show", scrollTop > 500);

      // Highlight active category pill based on scroll position
      const sections = $$("section.category-section");
      let currentCat = null;
      sections.forEach((sec) => {
        if (sec.getBoundingClientRect().top <= 140) currentCat = sec.id.replace("cat-", "");
      });
      if (currentCat) {
        $$("#catNav button").forEach((b) => {
          b.classList.toggle("active", slugify(b.dataset.cat) === currentCat);
        });
      }
    });

    topFab.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
  }

  // ---------------------------------------------------------
  // MODAL EVENTS
  // ---------------------------------------------------------
  function setupModalEvents() {
    $("#modalOverlay").addEventListener("click", (e) => {
      if (e.target.id === "modalOverlay") closeModal();
    });
    $("#modalCloseBtn").addEventListener("click", closeModal);
    $("#modalFavBtn").addEventListener("click", () => {
      toggleFavorite(Number($("#modalFavBtn").dataset.id));
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeModal();
    });
  }

  // ---------------------------------------------------------
  // SPLASH SCREEN
  // ---------------------------------------------------------
  function hideSplash() {
    setTimeout(() => {
      $("#splash").classList.add("hide");
    }, 500);
  }

  // ---------------------------------------------------------
  // INIT
  // ---------------------------------------------------------
  async function init() {
    try {
      await loadData();
    } catch (err) {
      console.error("Failed to load menu data:", err);
      $("#menuSections").innerHTML = `
        <div class="empty-state">
          <div class="big-icon">⚠️</div>
          <p>Couldn't load the menu. If you're viewing this file directly on your
          computer, open it through a local server or your published GitHub Pages
          link instead — browsers block local file loading for menu.json.</p>
        </div>`;
      hideSplash();
      return;
    }

    renderRestaurantInfo();
    renderCategoryNav();
    renderHighlights();
    renderMenu();
    setupSearch();
    setupControls();
    setupDarkMode();
    setupScrollBehavior();
    setupModalEvents();
    hideSplash();

    // Register service worker for offline support
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("service-worker.js").catch(() => {
        /* offline support is a bonus, not required for the page to work */
      });
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
