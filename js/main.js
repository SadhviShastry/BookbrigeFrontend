/* ==========================================================================
   BookBridge — Shared UI helpers
   ========================================================================== */

function starRating(rating) {
  const full = Math.round(rating);
  let out = "";
  for (let i = 0; i < 5; i++) out += `<i class="fa-solid fa-star star" style="${i < full ? "" : "opacity:.25"}"></i>`;
  return out;
}

/** Returns the inline style for a cover element — blank if a real image exists (image tag handles it), else the gradient. */
function coverStyleAttr(book) {
  return book.imageUrl ? "" : `background:${coverGradient(book.title)}`;
}
/** Returns the inner HTML for a cover element — an <img> if a real photo was uploaded, else optional title text. */
function coverInnerHTML(book, showTitle = false) {
  if (book.imageUrl) return `<img src="${book.imageUrl}" alt="${book.title}" class="cover-img">`;
  return showTitle ? book.title : "";
}

function listingTypeBadge(book) {
  if (!book.listingType || book.listingType === "Lend / Borrow") return "";
  const cls = book.listingType === "Sell" ? "sell" : book.listingType === "Donate" ? "donate" : "exchange";
  const label = book.listingType === "Sell" ? (book.price ? `₹${book.price}` : "For Sale") : book.listingType;
  return `<span class="listing-tag ${cls}">${label}</span>`;
}

function bookCardHTML(book) {
  return `
    <article class="book-card">
      <a href="book-details.html?id=${book.id}" class="book-cover" style="${coverStyleAttr(book)}">${coverInnerHTML(book, true)}${listingTypeBadge(book)}</a>
      <div class="book-body">
        <span class="availability-tag ${book.available ? "" : "unavailable"}">${book.available ? "Available" : "Borrowed"}</span>
        <a href="book-details.html?id=${book.id}" class="book-title">${book.title}</a>
        <div class="book-author">${book.author}</div>
        <div class="book-rating">${starRating(book.rating)} ${book.rating || "—"} (${book.reviews || 0})</div>
        <button class="btn btn-primary btn-block btn-sm" data-request-book="${book.id}">
          ${book.listingType === "Sell" ? "Buy Now" : book.available ? "Borrow Now" : "Notify Me"}
        </button>
      </div>
    </article>`;
}

function miniCoverStyle(title) { return `background:${coverGradient(title)}`; }

function toast(message, type = "success") {
  let el = document.querySelector(".toast");
  if (!el) { el = document.createElement("div"); el.className = "toast"; document.body.appendChild(el); }
  el.className = `toast show ${type}`;
  el.innerHTML = `<i class="fa-solid ${type === "error" ? "fa-circle-exclamation" : "fa-circle-check"}"></i> ${message}`;
  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.remove("show"), 3200);
}

/** Confirmation modal shown after a successful borrow/request action. */
function showAckModal({ title, body, primaryLabel, primaryHref }) {
  let overlay = document.querySelector(".modal-overlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    document.body.appendChild(overlay);
  }
  overlay.innerHTML = `
    <div class="modal-box">
      <div class="modal-icon"><i class="fa-solid fa-circle-check"></i></div>
      <h3>${title}</h3>
      <p>${body}</p>
      <div class="modal-actions">
        <button class="btn btn-outline" data-modal-close>Close</button>
        <a href="${primaryHref}" class="btn btn-primary">${primaryLabel}</a>
      </div>
    </div>`;
  overlay.classList.add("show");
  overlay.querySelectorAll("[data-modal-close]").forEach((b) => b.addEventListener("click", () => overlay.classList.remove("show")));
  overlay.addEventListener("click", (e) => { if (e.target === overlay) overlay.classList.remove("show"); });
}

/** Delegated handler for "Borrow Now" / "Request Book" buttons anywhere on the page. */
function wireRequestButtons(root = document) {
  root.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-request-book]");
    if (!btn) return;
    if (!isLoggedIn()) {
      toast("Please log in to request a book.", "error");
      setTimeout(() => (window.location.href = "login.html"), 900);
      return;
    }
    const bookId = btn.dataset.requestBook;
    const book = await BookAPI.getById(bookId);
    if (book && book.listingType === "Sell") { openBuyModal(book); return; }
    btn.disabled = true;
    const original = btn.textContent;
    btn.textContent = "Requesting…";
    try {
      await RequestAPI.create(bookId);
      btn.textContent = "Requested ✓";
      showAckModal({
        title: "Request Sent!",
        body: `Your request for <strong>${book ? book.title : "this book"}</strong> has been sent to the owner. You'll be notified once they respond — track it anytime from My Requests.`,
        primaryLabel: "View My Requests",
        primaryHref: "requests.html",
      });
    } catch (err) {
      toast(err.message, "error");
      btn.textContent = original;
      btn.disabled = false;
    }
  });
}

/** Buy flow for "Sell" listings — collects delivery + payment method before creating the request. */
function openBuyModal(book) {
  let overlay = document.querySelector(".modal-overlay");
  if (!overlay) { overlay = document.createElement("div"); overlay.className = "modal-overlay"; document.body.appendChild(overlay); }
  overlay.innerHTML = `
    <div class="modal-box" style="max-width:440px;text-align:left;">
      <h3 style="text-align:center;">Buy "${book.title}"</h3>
      <p style="text-align:center;">Price: <strong style="color:var(--clay);">₹${book.price || 0}</strong></p>
      <div class="form-group">
        <label>Delivery Address</label>
        <textarea class="input" id="buyAddress" placeholder="Where should this be delivered?"></textarea>
      </div>
      <div class="form-group">
        <label>Payment Method</label>
        <select class="select" id="buyPayment">
          <option>Cash on Delivery</option>
          <option>UPI</option>
          <option>Bank Transfer</option>
        </select>
      </div>
      <div class="modal-actions">
        <button class="btn btn-outline" data-modal-close>Cancel</button>
        <button class="btn btn-primary" id="confirmBuyBtn">Confirm Purchase</button>
      </div>
    </div>`;
  overlay.classList.add("show");
  overlay.querySelectorAll("[data-modal-close]").forEach((b) => b.addEventListener("click", () => overlay.classList.remove("show")));
  overlay.addEventListener("click", (e) => { if (e.target === overlay) overlay.classList.remove("show"); });
  document.getElementById("confirmBuyBtn").addEventListener("click", async () => {
    const address = document.getElementById("buyAddress").value.trim();
    const paymentMethod = document.getElementById("buyPayment").value;
    if (!address) { toast("Please add a delivery address.", "error"); return; }
    try {
      await RequestAPI.create(book.id, { address, paymentMethod, price: book.price });
      overlay.classList.remove("show");
      celebrate();
      showAckModal({
        title: "Purchase Requested!",
        body: `Your purchase request for <strong>${book.title}</strong> has been sent to the seller. Once confirmed, you'll get a receipt in My Requests.`,
        primaryLabel: "View My Requests",
        primaryHref: "requests.html",
      });
    } catch (err) { toast(err.message, "error"); }
  });
}

function markActiveNav() {
  const page = window.location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll("[data-nav]").forEach((link) => {
    if (link.dataset.nav === page) link.classList.add("active");
  });
}

function wireNavToggle() {
  const toggle = document.querySelector(".nav-toggle");
  const links = document.querySelector(".nav-links");
  if (!toggle || !links) return;
  toggle.addEventListener("click", () => {
    const isOpen = links.style.display === "flex";
    links.style.display = isOpen ? "none" : "flex";
    links.style.cssText += isOpen ? "" : "position:absolute;top:64px;left:0;right:0;background:var(--cream);flex-direction:column;padding:20px 32px;border-bottom:1px solid var(--border);gap:16px;z-index:60;";
  });
}

function wireSidebarToggle() {
  const toggle = document.querySelector(".sidebar-toggle");
  const sidebar = document.querySelector(".sidebar");
  if (!toggle || !sidebar) return;
  let backdrop = document.querySelector(".sidebar-backdrop");
  if (!backdrop) { backdrop = document.createElement("div"); backdrop.className = "sidebar-backdrop"; document.body.appendChild(backdrop); }
  const close = () => { sidebar.classList.remove("open"); backdrop.classList.remove("show"); };
  toggle.addEventListener("click", () => { sidebar.classList.add("open"); backdrop.classList.add("show"); });
  backdrop.addEventListener("click", close);
}

function paintUserChrome() {
  const user = getCurrentUser();
  if (!user) return;
  document.querySelectorAll("[data-user-name]").forEach((el) => (el.textContent = user.name));
  document.querySelectorAll("[data-user-initials]").forEach((el) => (el.textContent = (user.initials || user.name || "U").slice(0, 2).toUpperCase()));
  const adminLink = document.querySelector("[data-admin-only]");
  if (adminLink) adminLink.style.display = user.role === "admin" ? "" : "none";
}

/** Guards app pages: only logged-in users may view them. */
function requireAuth() {
  if (!isLoggedIn()) { window.location.href = "login.html"; }
}
/** Guards admin-only pages. */
function requireAdmin() {
  requireAuth();
  if (!isAdmin()) { window.location.href = "dashboard.html"; }
}

function wireLogout() {
  document.querySelectorAll("#logoutLink").forEach((el) => {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      AuthAPI.logout();
      window.location.href = "index.html";
    });
  });
}

/* ======================= Dark mode ======================= */
function initTheme() {
  const saved = localStorage.getItem("bb_theme") || "light";
  document.documentElement.setAttribute("data-theme", saved);
  document.querySelectorAll("[data-theme-toggle]").forEach((btn) => {
    updateThemeIcon(btn, saved);
    btn.addEventListener("click", () => {
      const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      localStorage.setItem("bb_theme", next);
      document.querySelectorAll("[data-theme-toggle]").forEach((b) => updateThemeIcon(b, next));
    });
  });
}
function updateThemeIcon(btn, theme) {
  btn.innerHTML = `<i class="fa-solid ${theme === "dark" ? "fa-sun" : "fa-moon"}"></i>`;
}

/* ======================= 3D tilt on book cards ======================= */
function initTilt() {
  document.querySelectorAll(".book-card").forEach((card) => {
    if (card._tiltWired) return;
    card._tiltWired = true;
    card.addEventListener("mousemove", (e) => {
      const rect = card.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      card.style.transform = `perspective(700px) rotateY(${x * 10}deg) rotateX(${-y * 10}deg) translateY(-4px)`;
    });
    card.addEventListener("mouseleave", () => { card.style.transform = ""; });
  });
}
const _tiltObserver = new MutationObserver(() => initTilt());
document.addEventListener("DOMContentLoaded", () => {
  _tiltObserver.observe(document.body, { childList: true, subtree: true });
});

/* ======================= Animated stat counters ======================= */
function initCounters() {
  const els = document.querySelectorAll("[data-count]");
  if (!els.length) return;
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      observer.unobserve(el);
      const target = parseInt(el.dataset.count, 10);
      const suffix = el.dataset.suffix || "";
      const duration = 1200;
      const start = performance.now();
      function tick(now) {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = Math.round(eased * target) + suffix;
        if (progress < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    });
  }, { threshold: 0.4 });
  els.forEach((el) => observer.observe(el));
}

/* ======================= Skeleton loader helper ======================= */
function skeletonCards(count = 4) {
  return Array.from({ length: count }).map(() => `
    <div class="skeleton-card">
      <div class="skeleton skeleton-cover"></div>
      <div class="skeleton skeleton-line"></div>
      <div class="skeleton skeleton-line short"></div>
      <div class="skeleton skeleton-line" style="margin-bottom:14px;"></div>
    </div>`).join("");
}

/* ======================= Confetti (loads canvas-confetti lazily) ======================= */
function celebrate() {
  if (typeof confetti === "function") {
    confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 }, colors: ["#C1440E", "#A8501F", "#E3A23C", "#6E7A4A"] });
    return;
  }
  const script = document.createElement("script");
  script.src = "https://cdnjs.cloudflare.com/ajax/libs/canvas-confetti/1.9.2/confetti.browser.min.js";
  script.onload = () => confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 }, colors: ["#C1440E", "#A8501F", "#E3A23C", "#6E7A4A"] });
  document.body.appendChild(script);
}

/* ======================= Notifications dropdown ======================= */
function timeAgo(iso) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}
const NOTIF_ICONS = { request: "fa-inbox", accepted: "fa-circle-check", rejected: "fa-circle-xmark", completed: "fa-flag-checkered", review: "fa-star", message: "fa-message" };

async function wireNotifications() {
  const btn = document.getElementById("notifBtn");
  if (!btn || !isLoggedIn()) return;

  const wrap = document.createElement("div");
  wrap.className = "notif-dropdown";
  btn.parentElement.appendChild(wrap);

  async function refresh() {
    const count = await NotificationAPI.unreadCount();
    const dot = btn.querySelector(".dot");
    if (dot) dot.style.display = count > 0 ? "" : "none";
  }

  async function open() {
    const items = await NotificationAPI.list();
    wrap.innerHTML = `
      <div class="notif-head"><span>Notifications</span>${items.length ? `<button class="btn btn-ghost btn-sm" id="markAllReadBtn" style="padding:2px 8px;">Mark all read</button>` : ""}</div>
      ${items.length ? items.map((n) => `
        <a href="${n.link || "#"}" class="notif-item ${n.read ? "" : "unread"}">
          <span class="notif-icon"><i class="fa-solid ${NOTIF_ICONS[n.type] || "fa-bell"}"></i></span>
          <div><div>${n.text}</div><div class="notif-time">${timeAgo(n.date)}</div></div>
        </a>`).join("") : `<div class="notif-empty"><i class="fa-regular fa-bell-slash" style="font-size:20px;display:block;margin-bottom:8px;"></i>No notifications yet</div>`}
    `;
    wrap.classList.toggle("show");
    const markBtn = document.getElementById("markAllReadBtn");
    if (markBtn) markBtn.addEventListener("click", async (e) => { e.preventDefault(); await NotificationAPI.markAllRead(); refresh(); open(); });
  }

  btn.addEventListener("click", (e) => { e.stopPropagation(); open(); });
  document.addEventListener("click", (e) => { if (!wrap.contains(e.target) && e.target !== btn) wrap.classList.remove("show"); });
  refresh();
}

/* ======================= Badges display ======================= */
async function renderBadges(targetEl) {
  if (!isLoggedIn() || !targetEl) return;
  const badges = await BadgeAPI.mine();
  targetEl.innerHTML = badges.length
    ? badges.map((b) => `<span class="badge-chip"><i class="fa-solid ${b.icon}"></i> ${b.label}</span>`).join("")
    : `<p style="font-size:13px;color:var(--brown-500);">No badges yet — share, borrow, or review a book to earn your first one!</p>`;
}

/* ======================= Password strength meter ======================= */
function scorePassword(pw) {
  let score = 0;
  if (pw.length >= 6) score++;
  if (pw.length >= 10) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return Math.min(score, 4);
}
function wirePasswordStrength(inputId, meterId) {
  const input = document.getElementById(inputId);
  const meter = document.getElementById(meterId);
  if (!input || !meter) return;
  const labels = ["Very Weak", "Weak", "Okay", "Strong", "Very Strong"];
  input.addEventListener("input", () => {
    const score = scorePassword(input.value);
    meter.innerHTML = `<div class="pw-bar-track"><div class="pw-bar-fill s${score}"></div></div><span class="pw-bar-label s${score}">${input.value ? labels[score] : ""}</span>`;
  });
}

/* ======================= Donation modal (with optional message) ======================= */
function showDonationModal() {
  let overlay = document.querySelector(".modal-overlay");
  if (!overlay) { overlay = document.createElement("div"); overlay.className = "modal-overlay"; document.body.appendChild(overlay); }
  let selected = 99;
  const render = () => `
    <div class="modal-box">
      <div class="modal-icon" style="color:var(--terracotta);"><i class="fa-solid fa-heart"></i></div>
      <h3>Support BookBridge</h3>
      <p>BookBridge is free and community-run. If it's helped you find or share a book, consider chipping in for hosting costs.</p>
      <div class="donate-amounts">
        ${[49, 99, 199, 499].map((amt) => `<button class="donate-amount ${amt === selected ? "active" : ""}" data-amt="${amt}">₹${amt}</button>`).join("")}
      </div>
      <div class="form-group" style="text-align:left;">
        <label>Message (optional)</label>
        <textarea class="input" id="donateMessage" placeholder="Say something nice to the community…" style="min-height:60px;"></textarea>
      </div>
      <div class="modal-actions">
        <button class="btn btn-outline" data-modal-close>Maybe later</button>
        <button class="btn btn-primary" id="confirmDonateBtn"><i class="fa-solid fa-heart"></i> Donate</button>
      </div>
    </div>`;
  overlay.innerHTML = render();
  overlay.classList.add("show");
  function wire() {
    overlay.querySelectorAll("[data-amt]").forEach((b) => b.addEventListener("click", () => { selected = Number(b.dataset.amt); const msg = document.getElementById("donateMessage").value; overlay.innerHTML = render(); document.getElementById("donateMessage").value = msg; wire(); }));
    overlay.querySelectorAll("[data-modal-close]").forEach((b) => b.addEventListener("click", () => overlay.classList.remove("show")));
    const confirmBtn = document.getElementById("confirmDonateBtn");
    if (confirmBtn) confirmBtn.addEventListener("click", async () => {
      const message = document.getElementById("donateMessage").value.trim();
      try { await DonationAPI.create({ amount: selected, message }); } catch (e) { /* still celebrate for demo */ }
      overlay.classList.remove("show");
      celebrate();
      toast(`Thank you for your ₹${selected} support! 💛`);
    });
  }
  wire();
  overlay.addEventListener("click", (e) => { if (e.target === overlay) overlay.classList.remove("show"); });
}

document.addEventListener("DOMContentLoaded", () => {
  markActiveNav();
  wireNavToggle();
  wireSidebarToggle();
  wireRequestButtons(document);
  paintUserChrome();
  wireLogout();
  initTheme();
  initTilt();
  initCounters();
  wireNotifications();
  document.querySelectorAll("[data-donate-trigger]").forEach((el) => el.addEventListener("click", (e) => { e.preventDefault(); showDonationModal(); }));
});
