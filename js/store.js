/* ==========================================================================
   BookBridge — Local mock backend (Store) v2
   Simulates the Spring Boot + MySQL backend using localStorage so the whole
   app is fully functional end-to-end before the real API exists. js/api.js
   tries the real backend first on every call and only falls back to this
   Store if it's not reachable — so nothing here needs to change once
   Spring Boot is live.
   ========================================================================== */

const DB_KEY = "bb_db_v2";
const BORROW_PERIOD_DAYS = 14;

const DEFAULT_CATEGORIES = [
  { id: 1, name: "Programming", icon: "fa-code" },
  { id: 2, name: "Novels", icon: "fa-feather" },
  { id: 3, name: "Business", icon: "fa-briefcase" },
  { id: 4, name: "Academic", icon: "fa-graduation-cap" },
  { id: 5, name: "Self Help", icon: "fa-seedling" },
  { id: 6, name: "Competitive Exams", icon: "fa-layer-group" },
];

const BADGE_DEFS = [
  { id: "sharer_5", label: "Top Sharer", icon: "fa-book", check: (s) => s.booksShared >= 5 },
  { id: "sharer_1", label: "First Share", icon: "fa-seedling", check: (s) => s.booksShared >= 1 },
  { id: "reviewer_5", label: "5-Star Reviewer", icon: "fa-star", check: (s) => s.reviewsGiven >= 5 },
  { id: "reviewer_1", label: "First Review", icon: "fa-comment", check: (s) => s.reviewsGiven >= 1 },
  { id: "reader_3", label: "Avid Reader", icon: "fa-glasses", check: (s) => s.booksBorrowed >= 3 },
  { id: "reader_1", label: "First Borrow", icon: "fa-hand-holding-heart", check: (s) => s.booksBorrowed >= 1 },
];

function seedDB() {
  const users = [
    { id: 1, name: "Sarah Johnson", email: "sarah@example.com", phone: "9876543210", password: "password", role: "user", initials: "SJ", area: "Andheri West" },
    { id: 2, name: "Admin", email: "admin@bookbridge.com", phone: "9999999999", password: "admin123", role: "admin", initials: "AD", area: "" },
  ];
  const books = MOCK_BOOKS.map((b) => ({ ...b, ownerId: 1, subcategory: "", imageUrl: null, listingType: "Lend / Borrow", price: null }));
  return {
    nextIds: { user: 3, book: books.length + 1, request: 1, review: 2, message: 1, thread: 1, notification: 1, category: DEFAULT_CATEGORIES.length + 1, donation: 1, activity: 1 },
    users, books,
    categories: DEFAULT_CATEGORIES.slice(),
    requests: [],
    wishlist: [],
    reviews: { 1: [{ id: 1, bookId: 1, userId: 1, userName: "Rahul Patel", rating: 5, text: "Amazing book! Life changing perspective on building better habits.", date: "2 days ago" }] },
    threads: [],
    messages: {},
    notifications: [],
    donations: [],
    activity: [],
    membershipTiers: [
      { id: "reader", name: "Reader", price: 0, perks: ["Borrow up to 2 books at a time", "Standard support"] },
      { id: "plus", name: "BookBridge Plus", price: 149, perks: ["Borrow up to 6 books at a time", "Priority requests", "Early access to events"] },
      { id: "patron", name: "Community Patron", price: 349, perks: ["Unlimited borrowing", "Patron badge", "Vote on new features", "Invite to meetups"] },
    ],
    events: [
      { id: 1, title: "Monsoon Reads Book Swap", date: "2026-09-14", location: "Andheri Community Hall", type: "Meetup", desc: "Bring 2 books, take 2 books — casual meetup with chai and book talk." },
      { id: 2, title: "September Donation Drive", date: "2026-09-20", location: "Online", type: "Offer", desc: "Donate 3+ books this month and unlock a bonus 'Generous Reader' badge." },
      { id: 3, title: "Author Meet: Local Writers Circle", date: "2026-10-05", location: "Bandra Reading Room", type: "Meetup", desc: "Meet self-published local authors and get books signed." },
    ],
  };
}

function loadDB() {
  const raw = localStorage.getItem(DB_KEY);
  if (raw) return JSON.parse(raw);
  const db = seedDB();
  saveDB(db);
  return db;
}
function saveDB(db) { localStorage.setItem(DB_KEY, JSON.stringify(db)); }

class ApiError extends Error {}

function publicUser(u) {
  if (!u) return null;
  const { password, ...rest } = u;
  return rest;
}
function enrichRequest(r, db) {
  const book = db.books.find((b) => b.id === r.bookId);
  const requester = db.users.find((u) => u.id === r.requesterId);
  const owner = db.users.find((u) => u.id === r.ownerId);
  return {
    ...r, book,
    requesterName: requester ? requester.name : "Unknown",
    requesterEmail: requester ? requester.email : "",
    requesterPhone: requester ? requester.phone : "",
    ownerName: owner ? owner.name : "Unknown",
    ownerEmail: owner ? owner.email : "",
    ownerPhone: owner ? owner.phone : "",
  };
}
function pushNotification(db, userId, type, text, link) {
  db.notifications.unshift({
    id: db.nextIds.notification++, userId, type, text, link, read: false, date: new Date().toISOString(),
  });
}
/** Admin-visible audit trail — every meaningful action across the platform lands here. */
function pushActivity(db, type, text) {
  if (!db.activity) db.activity = [];
  db.activity.unshift({ id: db.nextIds.activity++, type, text, date: new Date().toISOString() });
  db.activity = db.activity.slice(0, 300);
}

const Store = {
  /* ---------------- Users / Auth ---------------- */
  findUserByEmail(email) {
    return loadDB().users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  },
  register({ fullName, email, phone, password, area }) {
    const db = loadDB();
    if (db.users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
      throw new ApiError("An account with this email already exists.");
    }
    const user = {
      id: db.nextIds.user++, name: fullName, email, phone, password, role: "user", area: area || "",
      initials: fullName.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase(),
    };
    db.users.push(user);
    pushActivity(db, "user_registered", `New user registered: ${user.name} (${user.email})`);
    saveDB(db);
    return { token: `demo-token-${user.id}`, user: publicUser(user) };
  },
  login({ email, password, role }) {
    const db = loadDB();
    const user = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (!user || user.password !== password) throw new ApiError("Invalid email or password.");
    if (role && user.role !== role) {
      throw new ApiError(role === "admin" ? "This account doesn't have admin access." : "Please use the Admin Login tab for this account.");
    }
    return { token: `demo-token-${user.id}`, user: publicUser(user) };
  },
  resetPasswordRequest(email) {
    const db = loadDB();
    const user = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (!user) throw new ApiError("No account found with that email.");
    return { sent: true };
  },
  listUsers() { return loadDB().users.map(publicUser); },
  removeUser(id) {
    const db = loadDB();
    db.users = db.users.filter((u) => u.id !== Number(id));
    saveDB(db);
  },
  updateUser(id, payload) {
    const db = loadDB();
    const user = db.users.find((u) => u.id === Number(id));
    if (!user) throw new ApiError("User not found.");
    Object.assign(user, payload);
    saveDB(db);
    return publicUser(user);
  },

  /* ---------------- Books ---------------- */
  listBooks(filters = {}) {
    const db = loadDB();
    let books = db.books.slice();
    if (filters.category) books = books.filter((b) => b.category === filters.category);
    if (filters.subcategory) books = books.filter((b) => b.subcategory === filters.subcategory);
    if (filters.area) {
      books = books.filter((b) => {
        const owner = db.users.find((u) => u.id === b.ownerId);
        return owner && owner.area && owner.area.toLowerCase() === filters.area.toLowerCase();
      });
    }
    if (filters.limit) books = books.slice(0, Number(filters.limit));
    return books.map((b) => {
      const owner = db.users.find((u) => u.id === b.ownerId);
      return { ...b, ownerArea: owner ? owner.area : "" };
    });
  },
  searchBooks(query) {
    const q = (query || "").trim().toLowerCase();
    if (!q) return [];
    return loadDB().books.filter((b) => b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q)).slice(0, 6);
  },
  getBook(id) {
    const db = loadDB();
    const book = db.books.find((b) => b.id === Number(id));
    if (!book) return null;
    const owner = db.users.find((u) => u.id === book.ownerId);
    return { ...book, ownerArea: owner ? owner.area : "" };
  },
  createBook(payload, ownerId) {
    const db = loadDB();
    const book = {
      id: db.nextIds.book++, title: payload.title, author: payload.author,
      category: payload.category, subcategory: payload.subcategory || "", condition: payload.condition,
      desc: payload.desc, imageUrl: payload.imageUrl || null,
      listingType: payload.listingType || "Lend / Borrow",
      price: payload.listingType === "Sell" ? Number(payload.price) || 0 : null,
      rating: 0, reviews: 0, available: true, ownerId,
      owner: (db.users.find((u) => u.id === ownerId) || {}).name || "You",
    };
    db.books.unshift(book);
    pushActivity(db, "book_listed", `${book.owner} listed "${book.title}" (${book.listingType})`);
    saveDB(db);
    return book;
  },
  updateBook(id, payload) {
    const db = loadDB();
    const book = db.books.find((b) => b.id === Number(id));
    if (!book) throw new ApiError("Book not found.");
    Object.assign(book, payload);
    saveDB(db);
    return book;
  },
  deleteBook(id) {
    const db = loadDB();
    db.books = db.books.filter((b) => b.id !== Number(id));
    saveDB(db);
  },
  myBooks(ownerId) { return loadDB().books.filter((b) => b.ownerId === ownerId); },

  /* ---------------- Categories ---------------- */
  categories() { return loadDB().categories.slice(); },
  createCategory(name, icon) {
    const db = loadDB();
    if (db.categories.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
      throw new ApiError("This category already exists.");
    }
    const cat = { id: db.nextIds.category++, name, icon: icon || "fa-book" };
    db.categories.push(cat);
    saveDB(db);
    return cat;
  },
  removeCategory(id) {
    const db = loadDB();
    const cat = db.categories.find((c) => c.id === Number(id));
    if (!cat) throw new ApiError("Category not found.");
    const inUse = db.books.some((b) => b.category === cat.name);
    if (inUse) throw new ApiError(`Can't delete "${cat.name}" — books are still listed under it.`);
    db.categories = db.categories.filter((c) => c.id !== Number(id));
    saveDB(db);
  },

  /* ---------------- Requests ---------------- */
  createRequest(bookId, requesterId, extra = {}) {
    const db = loadDB();
    const book = db.books.find((b) => b.id === Number(bookId));
    if (!book) throw new ApiError("Book not found.");
    if (book.ownerId === requesterId) throw new ApiError("You can't request your own book.");
    const existing = db.requests.find((r) => r.bookId === book.id && r.requesterId === requesterId && r.status === "Pending");
    if (existing) throw new ApiError("You've already requested this book.");
    const req = {
      id: db.nextIds.request++, bookId: book.id, requesterId, ownerId: book.ownerId,
      status: "Pending", createdAt: new Date().toISOString(), dueDate: null,
      deliveryStatus: "Not Started", deliveryPartner: "", trackingId: "", adminNotes: "",
      deliveryAddress: extra.address || "", paymentMethod: extra.paymentMethod || "",
      price: book.listingType === "Sell" ? book.price : null,
      isPurchase: book.listingType === "Sell",
    };
    db.requests.unshift(req);
    pushNotification(db, book.ownerId, "request", `New ${req.isPurchase ? "purchase" : ""} request for "${book.title}"`, "requests.html");
    pushActivity(db, "request_created", `Request #${req.id} created for "${book.title}"${req.isPurchase ? ` (Sale, ₹${req.price})` : ""}`);
    saveDB(db);
    return req;
  },
  myRequests(userId) {
    const db = loadDB();
    return db.requests.filter((r) => r.requesterId === userId).map((r) => enrichRequest(r, db));
  },
  incomingRequests(ownerId) {
    const db = loadDB();
    return db.requests.filter((r) => r.ownerId === ownerId).map((r) => enrichRequest(r, db));
  },
  updateRequestStatus(id, status) {
    const db = loadDB();
    const req = db.requests.find((r) => r.id === Number(id));
    if (!req) throw new ApiError("Request not found.");
    req.status = status;
    const book = db.books.find((b) => b.id === req.bookId);
    if (status === "Accepted") {
      if (book) book.available = false;
      req.dueDate = new Date(Date.now() + BORROW_PERIOD_DAYS * 86400000).toISOString();
      req.deliveryStatus = "Awaiting Pickup";
      pushNotification(db, req.requesterId, "accepted", `Your request for "${book ? book.title : "a book"}" was accepted!`, "requests.html");
    }
    if (status === "Rejected") {
      pushNotification(db, req.requesterId, "rejected", `Your request for "${book ? book.title : "a book"}" was declined.`, "requests.html");
    }
    if (status === "Completed") {
      if (book && !req.isPurchase) book.available = true;
      if (book && req.isPurchase) { db.books = db.books.filter((b) => b.id !== book.id); }
      req.deliveryStatus = "Delivered";
      pushNotification(db, req.requesterId, "completed", `Exchange for "${book ? book.title : "a book"}" is complete. Leave a review!`, `book-details.html?id=${req.bookId}`);
    }
    pushActivity(db, "request_status", `Request #${req.id} ("${book ? book.title : "?"}") → ${status}`);
    saveDB(db);
    return enrichRequest(req, db);
  },
  updateDelivery(id, payload) {
    const db = loadDB();
    const req = db.requests.find((r) => r.id === Number(id));
    if (!req) throw new ApiError("Request not found.");
    Object.assign(req, payload);
    saveDB(db);
    return enrichRequest(req, db);
  },
  allAcceptedExchanges() {
    const db = loadDB();
    return db.requests.filter((r) => r.status === "Accepted" || r.status === "Completed").map((r) => enrichRequest(r, db));
  },
  /** Books the current user currently has on loan (accepted, not yet completed). */
  borrowedBooks(userId) {
    const db = loadDB();
    return db.requests.filter((r) => r.requesterId === userId && r.status === "Accepted" && !r.isPurchase).map((r) => enrichRequest(r, db));
  },

  /* ---------------- Wishlist ---------------- */
  getWishlist(userId) {
    const db = loadDB();
    return db.wishlist.filter((w) => w.userId === userId).map((w) => db.books.find((b) => b.id === w.bookId)).filter(Boolean);
  },
  isWishlisted(userId, bookId) {
    return loadDB().wishlist.some((w) => w.userId === userId && w.bookId === Number(bookId));
  },
  toggleWishlist(userId, bookId) {
    const db = loadDB();
    const idx = db.wishlist.findIndex((w) => w.userId === userId && w.bookId === Number(bookId));
    let added;
    if (idx >= 0) { db.wishlist.splice(idx, 1); added = false; }
    else { db.wishlist.push({ userId, bookId: Number(bookId) }); added = true; }
    saveDB(db);
    return { added };
  },

  /* ---------------- Reviews ---------------- */
  getReviews(bookId) { return (loadDB().reviews[bookId] || []).slice().reverse(); },
  addReview(bookId, userId, userName, rating, text) {
    const db = loadDB();
    if (!db.reviews[bookId]) db.reviews[bookId] = [];
    const review = { id: db.nextIds.review++, bookId: Number(bookId), userId, userName, rating, text, date: "Just now" };
    db.reviews[bookId].push(review);
    const book = db.books.find((b) => b.id === Number(bookId));
    if (book) {
      const all = db.reviews[bookId];
      book.reviews = all.length;
      book.rating = Number((all.reduce((s, r) => s + r.rating, 0) / all.length).toFixed(1));
      if (book.ownerId !== userId) pushNotification(db, book.ownerId, "review", `${userName} left a ${rating}★ review on "${book.title}"`, `book-details.html?id=${book.id}`);
    }
    pushActivity(db, "review_added", `${userName} left a ${rating}★ review on "${book ? book.title : "a book"}"`);
    saveDB(db);
    return review;
  },
  reviewsGivenBy(userId) {
    const db = loadDB();
    return Object.values(db.reviews).flat().filter((r) => r.userId === userId).length;
  },

  /* ---------------- Messages ---------------- */
  getThreads(userId) {
    const db = loadDB();
    return db.threads.filter((t) => t.participantIds.includes(userId)).map((t) => ({
      ...t,
      otherUser: publicUser(db.users.find((u) => u.id === t.participantIds.find((id) => id !== userId)) || {}),
      book: db.books.find((b) => b.id === t.bookId),
    }));
  },
  startThread(userId, ownerId, bookId) {
    const db = loadDB();
    let thread = db.threads.find((t) => t.bookId === bookId && t.participantIds.includes(userId) && t.participantIds.includes(ownerId));
    if (!thread) {
      thread = { id: db.nextIds.thread++, participantIds: [userId, ownerId], bookId, lastMessage: "", updatedAt: new Date().toISOString() };
      db.threads.push(thread);
      db.messages[thread.id] = [];
      saveDB(db);
    }
    return thread.id;
  },
  getMessages(threadId) { return loadDB().messages[threadId] || []; },
  sendMessage(threadId, senderId, text) {
    const db = loadDB();
    if (!db.messages[threadId]) db.messages[threadId] = [];
    const msg = { id: db.nextIds.message++, senderId, text, date: new Date().toISOString() };
    db.messages[threadId].push(msg);
    const thread = db.threads.find((t) => t.id === Number(threadId));
    if (thread) {
      thread.lastMessage = text; thread.updatedAt = msg.date;
      const recipientId = thread.participantIds.find((id) => id !== senderId);
      if (recipientId) pushNotification(db, recipientId, "message", "You have a new message", `messages.html?thread=${threadId}`);
    }
    saveDB(db);
    return msg;
  },

  /* ---------------- Notifications ---------------- */
  listNotifications(userId) { return loadDB().notifications.filter((n) => n.userId === userId).slice(0, 20); },
  unreadCount(userId) { return loadDB().notifications.filter((n) => n.userId === userId && !n.read).length; },
  markAllRead(userId) {
    const db = loadDB();
    db.notifications.forEach((n) => { if (n.userId === userId) n.read = true; });
    saveDB(db);
  },

  /* ---------------- Badges ---------------- */
  badgesFor(userId) {
    const stats = Store.dashboardSummary(userId);
    return BADGE_DEFS.filter((b) => b.check(stats));
  },

  /* ---------------- Dashboard / Admin summaries ---------------- */
  dashboardSummary(userId) {
    const db = loadDB();
    const booksShared = db.books.filter((b) => b.ownerId === userId).length;
    const booksBorrowed = db.requests.filter((r) => r.requesterId === userId && (r.status === "Accepted" || r.status === "Completed")).length;
    const pendingRequests = db.requests.filter((r) => (r.requesterId === userId || r.ownerId === userId) && r.status === "Pending").length;
    const reviewsGiven = Store.reviewsGivenBy(userId);
    return { booksShared, booksBorrowed, pendingRequests, reviewsGiven };
  },
  adminStats() {
    const db = loadDB();
    return {
      totalUsers: db.users.filter((u) => u.role === "user").length,
      totalBooks: db.books.length,
      pendingRequests: db.requests.filter((r) => r.status === "Pending").length,
      totalExchanges: db.requests.filter((r) => r.status === "Completed").length,
      totalDonations: (db.donations || []).reduce((s, d) => s + d.amount, 0),
      donationCount: (db.donations || []).length,
    };
  },

  /* ---------------- Membership ---------------- */
  membershipTiers() { return loadDB().membershipTiers || []; },
  joinMembership(userId, tierId) {
    const db = loadDB();
    const user = db.users.find((u) => u.id === userId);
    if (!user) throw new ApiError("User not found.");
    const tier = (db.membershipTiers || []).find((t) => t.id === tierId);
    if (!tier) throw new ApiError("Membership tier not found.");
    user.membership = tierId;
    pushActivity(db, "membership", `${user.name} joined the "${tier.name}" membership tier`);
    saveDB(db);
    return publicUser(user);
  },

  /* ---------------- Events / Offers ---------------- */
  listEvents() { return (loadDB().events || []).slice().sort((a, b) => new Date(a.date) - new Date(b.date)); },

  /* ---------------- Donations ---------------- */
  createDonation(userId, amount, message) {
    const db = loadDB();
    const user = db.users.find((u) => u.id === userId);
    const donation = {
      id: db.nextIds.donation++, userId, userName: user ? user.name : "Anonymous",
      amount: Number(amount) || 0, message: message || "", date: new Date().toISOString(),
    };
    db.donations.unshift(donation);
    pushActivity(db, "donation", `${donation.userName} donated ₹${donation.amount}${message ? ` — "${message}"` : ""}`);
    saveDB(db);
    return donation;
  },
  listDonations() { return loadDB().donations || []; },

  /* ---------------- Admin activity log ---------------- */
  listActivity() { return (loadDB().activity || []).slice(0, 200); },
};
