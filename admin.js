/* =========================================================
   URBAN NOSH — admin.js
   A visual, form-based editor for menu.json. Runs entirely in
   the browser — nothing is sent to any server. When you're
   done editing, click "Download Updated menu.json" and upload
   that file to your GitHub repo, replacing the old one.

   Photos: picking a photo here compresses it and embeds it
   directly into menu.json as the item's image — no separate
   image file upload needed.
   ========================================================= */

(function () {
  "use strict";

  let items = [];
  let nextId = 1;

  const $ = (sel, ctx) => (ctx || document).querySelector(sel);
  const $$ = (sel, ctx) => Array.from((ctx || document).querySelectorAll(sel));

  function showBanner(msg, type) {
    const area = $("#bannerArea");
    area.innerHTML = `<div class="banner ${type || ""}">${msg}</div>`;
  }

  // ---------------------------------------------------------
  // LOADING
  // ---------------------------------------------------------
  $("#loadFromSiteBtn").addEventListener("click", async () => {
    try {
      const res = await fetch("menu.json");
      if (!res.ok) throw new Error("not found");
      const data = await res.json();
      loadItems(data.items);
      showBanner("Loaded the current menu.json from this site.", "success");
    } catch (err) {
      showBanner(
        "Couldn't load menu.json automatically (this happens if you're opening this page directly from your computer instead of your published site). Use \"Upload a menu.json\" instead — pick the file from your unzipped project folder.",
        "error"
      );
    }
  });

  $("#loadFromFileBtn").addEventListener("click", () => $("#fileInput").click());

  $("#fileInput").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        loadItems(data.items);
        showBanner(`Loaded ${data.items.length} items from ${file.name}.`, "success");
      } catch (err) {
        showBanner("That file doesn't look like a valid menu.json. Please pick the correct file.", "error");
      }
    };
    reader.readAsText(file);
  });

  function loadItems(loadedItems) {
    items = loadedItems.map((it) => Object.assign({}, it));
    nextId = Math.max(0, ...items.map((it) => it.id)) + 1;
    render();
    $("#downloadBtn").style.display = "block";
  }

  // ---------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------
  function render(filterText) {
    const list = $("#adminList");
    const q = (filterText || "").trim().toLowerCase();

    const filtered = q
      ? items.filter(
          (it) =>
            it.name.toLowerCase().includes(q) ||
            it.category.toLowerCase().includes(q) ||
            it.subcategory.toLowerCase().includes(q)
        )
      : items;

    if (filtered.length === 0) {
      list.innerHTML = `<p style="text-align:center;color:var(--coffee-soft);padding:40px 0;">No items match.</p>`;
      return;
    }

    // group by category, preserving first-seen order
    const groups = [];
    const groupIndex = {};
    filtered.forEach((it) => {
      if (!(it.category in groupIndex)) {
        groupIndex[it.category] = groups.length;
        groups.push({ category: it.category, list: [] });
      }
      groups[groupIndex[it.category]].list.push(it);
    });

    list.innerHTML = groups
      .map(
        (g) => `
      <div class="admin-cat-group">
        <div class="admin-cat-header">${escapeHTML(g.category)}</div>
        ${g.list.map(editCardHTML).join("")}
      </div>`
      )
      .join("");

    wireCardEvents();
  }

  function editCardHTML(it) {
    return `
    <div class="edit-card" data-id="${it.id}">
      <div class="photo-row">
        ${it.image ? `<img class="photo-preview" src="${it.image}" alt="">` : `<div class="photo-preview empty">🍴</div>`}
        <div class="photo-actions">
          <button type="button" class="btn-change-photo">Change Photo</button>
          ${it.image ? `<button type="button" class="btn-remove-photo">Remove Photo</button>` : ""}
          <input type="file" class="photo-input" accept="image/*" style="display:none;">
        </div>
      </div>

      <div class="edit-row">
        <div>
          <label>Name</label>
          <input type="text" class="f-name" value="${escapeAttr(it.name)}">
        </div>
        <div>
          <label>Price (₹)</label>
          <input type="number" class="f-price" value="${it.price}">
        </div>
      </div>

      <div class="edit-row">
        <div>
          <label>Category</label>
          <input type="text" class="f-category" value="${escapeAttr(it.category)}">
        </div>
        <div>
          <label>Subcategory</label>
          <input type="text" class="f-subcategory" value="${escapeAttr(it.subcategory)}">
        </div>
      </div>

      <div>
        <label>Description</label>
        <textarea class="f-desc">${escapeHTML(it.description || "")}</textarea>
      </div>

      <div class="edit-row" style="margin-top:8px;">
        <div>
          <label>Veg / Non-Veg</label>
          <select class="f-veg">
            <option value="veg" ${it.veg === true ? "selected" : ""}>Veg</option>
            <option value="nonveg" ${it.veg === false ? "selected" : ""}>Non-Veg</option>
            <option value="unset" ${it.veg == null ? "selected" : ""}>Not set</option>
          </select>
        </div>
        <div>
          <label>Spice Level</label>
          <select class="f-spicy">
            <option value="0" ${!it.spicyLevel ? "selected" : ""}>None</option>
            <option value="1" ${it.spicyLevel === 1 ? "selected" : ""}>Mild</option>
            <option value="2" ${it.spicyLevel === 2 ? "selected" : ""}>Medium</option>
            <option value="3" ${it.spicyLevel === 3 ? "selected" : ""}>Hot</option>
          </select>
        </div>
        <div>
          <label>Prep Time</label>
          <input type="text" class="f-prep" value="${escapeAttr(it.preparationTime || "")}" placeholder="e.g. 15 mins">
        </div>
      </div>

      <div class="toggle-row">
        <label><input type="checkbox" class="f-available" ${it.available !== false ? "checked" : ""}> In stock</label>
        <label><input type="checkbox" class="f-bestseller" ${it.bestSeller ? "checked" : ""}> Best Seller</label>
        <label><input type="checkbox" class="f-chef" ${it.chefSpecial ? "checked" : ""}> Chef Special</label>
        <label><input type="checkbox" class="f-new" ${it.newItem ? "checked" : ""}> New</label>
      </div>

      <div class="card-footer">
        <span class="id-tag">ID: ${it.id}</span>
        <button type="button" class="delete-btn">Delete item</button>
      </div>
    </div>`;
  }

  function escapeHTML(str) {
    return String(str || "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
  }
  function escapeAttr(str) {
    return String(str || "").replace(/"/g, "&quot;");
  }

  // ---------------------------------------------------------
  // WIRE UP EDIT / DELETE / PHOTO EVENTS
  // ---------------------------------------------------------
  function wireCardEvents() {
    $$(".edit-card").forEach((card) => {
      const id = Number(card.dataset.id);
      const item = items.find((it) => it.id === id);
      if (!item) return;

      const bind = (sel, field, transform) => {
        const el = $(sel, card);
        if (!el) return;
        const evt = el.type === "checkbox" || el.tagName === "SELECT" ? "change" : "input";
        el.addEventListener(evt, () => {
          const raw = el.type === "checkbox" ? el.checked : el.value;
          item[field] = transform ? transform(raw) : raw;
        });
      };

      bind(".f-name", "name");
      bind(".f-price", "price", (v) => Number(v) || 0);
      bind(".f-category", "category");
      bind(".f-subcategory", "subcategory");
      bind(".f-desc", "description");
      bind(".f-prep", "preparationTime");
      bind(".f-available", "available");
      bind(".f-bestseller", "bestSeller");
      bind(".f-chef", "chefSpecial");
      bind(".f-new", "newItem");
      bind(".f-spicy", "spicyLevel", (v) => Number(v));
      $(".f-veg", card).addEventListener("change", (e) => {
        const v = e.target.value;
        item.veg = v === "veg" ? true : v === "nonveg" ? false : null;
      });

      $(".delete-btn", card).addEventListener("click", () => {
        if (!confirm(`Delete "${item.name}"? This can't be undone here (though your old menu.json on GitHub is untouched until you upload the new one).`)) return;
        items = items.filter((it) => it.id !== id);
        render($("#adminSearch").value);
      });

      const photoInput = $(".photo-input", card);
      $(".btn-change-photo", card).addEventListener("click", () => photoInput.click());
      photoInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (!file) return;
        compressImage(file, (dataUrl) => {
          item.image = dataUrl;
          render($("#adminSearch").value);
          showBanner(`Photo added for "${item.name}". Remember to download the updated menu.json when you're done.`, "success");
        });
      });

      const removeBtn = $(".btn-remove-photo", card);
      if (removeBtn) {
        removeBtn.addEventListener("click", () => {
          item.image = "";
          render($("#adminSearch").value);
        });
      }
    });
  }

  // ---------------------------------------------------------
  // IMAGE COMPRESSION (resize + JPEG compress, output as base64)
  // ---------------------------------------------------------
  function compressImage(file, callback) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 640;
        let { width, height } = img;
        if (width > height && width > maxDim) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else if (height > maxDim) {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.72);
        callback(dataUrl);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  // ---------------------------------------------------------
  // ADD ITEM
  // ---------------------------------------------------------
  $("#addItemBtn").addEventListener("click", () => {
    if (items.length === 0) {
      showBanner("Load a menu first (click \"Load current menu\" or \"Upload a menu.json\") before adding items.", "error");
      return;
    }
    const newItem = {
      id: nextId++,
      name: "New Item",
      description: "",
      price: 0,
      category: items[items.length - 1].category,
      subcategory: items[items.length - 1].subcategory,
      image: "",
      veg: null,
      available: true,
      recommended: false,
      popular: false,
      spicyLevel: 0,
      bestSeller: false,
      newItem: true,
      chefSpecial: false,
      preparationTime: "",
      tags: [],
    };
    items.push(newItem);
    render($("#adminSearch").value);
    showBanner("New item added at the bottom of its category — fill in the details above.", "success");
    setTimeout(() => {
      const card = document.querySelector(`.edit-card[data-id="${newItem.id}"]`);
      if (card) card.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 50);
  });

  // ---------------------------------------------------------
  // SEARCH
  // ---------------------------------------------------------
  $("#adminSearch").addEventListener("input", (e) => render(e.target.value));

  // ---------------------------------------------------------
  // DOWNLOAD
  // ---------------------------------------------------------
  $("#downloadBtn").addEventListener("click", () => {
    const payload = { items };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "menu.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showBanner("Downloaded menu.json — upload this file to your GitHub repo (same filename overwrites the old one automatically).", "success");
  });
})();
