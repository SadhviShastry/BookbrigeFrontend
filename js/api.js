/* ==========================================================================
   BookBridge — API layer
   Talks to the Spring Boot backend (controller / service / repository layers
   described in the project doc). Change API_BASE to match your deployed
   backend. Every function tries the real endpoint first; if the backend
   isn't running yet, it transparently falls back to the local Store
   (js/store.js) so the whole app keeps working end-to-end during development.
   Once Spring Boot is live and matches these routes, the fallback simply
   never triggers — no page code needs to change.
   ========================================================================== */

const API_BASE = "https://bookbridge-backend-vrkx.onrender.com/api";

function getToken() { return localStorage.getItem("bb_token"); }
function setSession(token, user) {
  localStorage.setItem("bb_token", token);
  localStorage.setItem("bb_user", JSON.stringify(user));
}
function clearSession() {
  localStorage.removeItem("bb_token");
  localStorage.removeItem("bb_user");
}
function getCurrentUser() {
  const raw = localStorage.getItem("bb_user");
  return raw ? JSON.parse(raw) : null;
}
function isLoggedIn() { return !!getToken(); }
function isAdmin() { const u = getCurrentUser(); return !!u && u.role === "admin"; }

async function request(path, { method = "GET", body, auth = true } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth && getToken()) headers["Authorization"] = `Bearer ${getToken()}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method, headers, body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401) { clearSession(); throw new Error("Session expired. Please log in again."); }

  let data = null;
  const text = await res.text();
  try { data = text ? JSON.parse(text) : null; } catch (e) { data = text; }

  if (!res.ok) throw new Error((data && data.message) || `Request failed (${res.status})`);
  return data;
}

/** Wraps a real-API call with an automatic Store fallback. */
async function withStore(realCall, storeCall) {
  try {
    return await realCall();
  } catch (err) {
    return storeCall();
  }
}

function currentUserId() {
  const u = getCurrentUser();
  if (!u) throw new Error("You need to be logged in.");
  return u.id;
}

/* ---------- Auth: AuthController ---------- */
const AuthAPI = {
  register: (payload) => withStore(
    () => request("/auth/register", { method: "POST", body: payload, auth: false }),
    () => Store.register(payload)
  ),
  login: (payload) => withStore(
    () => request("/auth/login", { method: "POST", body: payload, auth: false }),
    () => Store.login(payload)
  ),
  requestPasswordReset: (email) => withStore(
    () => request("/auth/forgot-password", { method: "POST", body: { email }, auth: false }),
    () => Store.resetPasswordRequest(email)
  ),
  logout: () => clearSession(),
};

/* ---------- Books: BookController ---------- */
const BookAPI = {
  list: (params = {}) => withStore(
    () => { const qs = new URLSearchParams(params).toString(); return request(`/books${qs ? `?${qs}` : ""}`, { auth: false }); },
    () => Store.listBooks(params)
  ),
  getById: (id) => withStore(() => request(`/books/${id}`, { auth: false }), () => Store.getBook(id)),
  create: (payload) => withStore(
    () => request("/books", { method: "POST", body: payload }),
    () => Store.createBook(payload, currentUserId())
  ),
  update: (id, payload) => withStore(() => request(`/books/${id}`, { method: "PUT", body: payload }), () => Store.updateBook(id, payload)),
  remove: (id) => withStore(() => request(`/books/${id}`, { method: "DELETE" }), () => Store.deleteBook(id)),
  myBooks: () => withStore(() => request("/books/mine"), () => Store.myBooks(currentUserId())),
  search: (query) => withStore(() => request(`/books/search?q=${encodeURIComponent(query)}`, { auth: false }), () => Store.searchBooks(query)),
  categories: () => withStore(() => request("/categories", { auth: false }), () => Store.categories()),
};

/* ---------- Categories: CategoryController ---------- */
const CategoryAPI = {
  list: () => withStore(() => request("/categories", { auth: false }), () => Store.categories()),
  create: (name, icon) => withStore(
    () => request("/categories", { method: "POST", body: { name, icon } }),
    () => Store.createCategory(name, icon)
  ),
  remove: (id) => withStore(() => request(`/categories/${id}`, { method: "DELETE" }), () => Store.removeCategory(id)),
};

/* ---------- Exchange requests: RequestController ---------- */
const RequestAPI = {
  create: (bookId, extra = {}) => withStore(
    () => request("/requests", { method: "POST", body: { bookId, ...extra } }),
    () => Store.createRequest(bookId, currentUserId(), extra)
  ),
  myRequests: () => withStore(() => request("/requests/mine"), () => Store.myRequests(currentUserId())),
  incoming: () => withStore(() => request("/requests/incoming"), () => Store.incomingRequests(currentUserId())),
  borrowed: () => withStore(() => request("/requests/borrowed"), () => Store.borrowedBooks(currentUserId())),
  accept: (id) => withStore(() => request(`/requests/${id}/accept`, { method: "PUT" }), () => Store.updateRequestStatus(id, "Accepted")),
  reject: (id) => withStore(() => request(`/requests/${id}/reject`, { method: "PUT" }), () => Store.updateRequestStatus(id, "Rejected")),
  complete: (id) => withStore(() => request(`/requests/${id}/complete`, { method: "PUT" }), () => Store.updateRequestStatus(id, "Completed")),
  updateDelivery: (id, payload) => withStore(() => request(`/requests/${id}/delivery`, { method: "PUT", body: payload }), () => Store.updateDelivery(id, payload)),
};

/* ---------- Membership: MembershipController ---------- */
const MembershipAPI = {
  tiers: () => withStore(() => request("/membership/tiers", { auth: false }), () => Store.membershipTiers()),
  join: (tierId) => withStore(
    () => request("/membership/join", { method: "POST", body: { tierId } }),
    () => Store.joinMembership(currentUserId(), tierId)
  ),
};

/* ---------- Events / Offers: EventController ---------- */
const EventsAPI = {
  list: () => withStore(() => request("/events", { auth: false }), () => Store.listEvents()),
};

/* ---------- Donations: DonationController ---------- */
const DonationAPI = {
  create: ({ amount, message }) => withStore(
    () => request("/donations", { method: "POST", body: { amount, message } }),
    () => Store.createDonation(currentUserId(), amount, message)
  ),
  list: () => withStore(() => request("/donations"), () => Store.listDonations()),
};

/* ---------- Wishlist: WishlistController ---------- */
const WishlistAPI = {
  list: () => withStore(() => request("/wishlist"), () => Store.getWishlist(currentUserId())),
  toggle: (bookId) => withStore(
    () => request(`/wishlist/${bookId}/toggle`, { method: "POST" }),
    () => Store.toggleWishlist(currentUserId(), bookId)
  ),
  isWishlisted: (bookId) => withStore(() => request(`/wishlist/${bookId}/status`), () => Store.isWishlisted(currentUserId(), bookId)),
};

/* ---------- Reviews: ReviewController ---------- */
const ReviewAPI = {
  forBook: (bookId) => withStore(() => request(`/books/${bookId}/reviews`, { auth: false }), () => Store.getReviews(bookId)),
  create: (bookId, payload) => withStore(
    () => request(`/books/${bookId}/reviews`, { method: "POST", body: payload }),
    () => { const u = getCurrentUser(); return Store.addReview(bookId, u.id, u.name, payload.rating, payload.text); }
  ),
};

/* ---------- Messages: MessageController ---------- */
const MessageAPI = {
  threads: () => withStore(() => request("/messages/threads"), () => Store.getThreads(currentUserId())),
  startThread: (ownerId, bookId) => withStore(
  () => request("/messages/threads", { method: "POST", body: { ownerId, bookId } }).then(r => r.id),
  () => Store.startThread(currentUserId(), ownerId, bookId)
),
  messages: (threadId) => withStore(() => request(`/messages/threads/${threadId}`), () => Store.getMessages(threadId)),
  send: (threadId, text) => withStore(
    () => request(`/messages/threads/${threadId}`, { method: "POST", body: { text } }),
    () => Store.sendMessage(threadId, currentUserId(), text)
  ),
};

/* ---------- Dashboard summary ---------- */
const DashboardAPI = {
  summary: () => withStore(() => request("/dashboard/summary"), () => Store.dashboardSummary(currentUserId())),
};

/* ---------- Notifications: NotificationController ---------- */
const NotificationAPI = {
  list: () => withStore(() => request("/notifications"), () => Store.listNotifications(currentUserId())),
  unreadCount: () => withStore(() => request("/notifications/unread-count"), () => Store.unreadCount(currentUserId())),
  markAllRead: () => withStore(() => request("/notifications/mark-read", { method: "PUT" }), () => Store.markAllRead(currentUserId())),
};

/* ---------- Badges ---------- */
const BadgeAPI = {
  mine: () => withStore(() => request("/badges/mine"), () => Store.badgesFor(currentUserId())),
};

/* ---------- Profile ---------- */
const UserAPI = {
  me: () => withStore(() => request("/users/me"), () => getCurrentUser()),
  update: (payload) => withStore(
    () => request("/users/me", { method: "PUT", body: payload }),
    () => Store.updateUser(currentUserId(), payload)
  ),
};

/* ---------- Admin: AdminController ---------- */
const AdminAPI = {
  stats: () => withStore(() => request("/admin/stats"), () => Store.adminStats()),
  users: () => withStore(() => request("/admin/users"), () => Store.listUsers()),
  removeUser: (id) => withStore(() => request(`/admin/users/${id}`, { method: "DELETE" }), () => Store.removeUser(id)),
  books: () => withStore(() => request("/admin/books"), () => Store.listBooks()),
  removeBook: (id) => withStore(() => request(`/admin/books/${id}`, { method: "DELETE" }), () => Store.deleteBook(id)),
  acceptedExchanges: () => withStore(() => request("/admin/exchanges"), () => Store.allAcceptedExchanges()),
  activity: () => withStore(() => request("/admin/activity"), () => Store.listActivity()),
  donations: () => withStore(() => request("/admin/donations"), () => Store.listDonations()),
};
