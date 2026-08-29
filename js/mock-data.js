/* ==========================================================================
   BookBridge — Demo data
   Used as a fallback when the Spring Boot API isn't running yet, so the
   frontend is fully demoable on its own. Once the backend is live, the
   API_* functions below are what get replaced by real fetch() calls
   (see js/api.js) — nothing else needs to change.
   ========================================================================== */

const COVER_PALETTE = [
  ["#C1440E", "#8A3E17"], ["#3A4A6B", "#232E47"], ["#6E7A4A", "#4E5834"],
  ["#7A3B69", "#4E2244"], ["#B8862E", "#8A5F1C"], ["#2E6B5E", "#1E4A40"],
  ["#A8501F", "#6B3410"], ["#4A5A8C", "#2F3A5E"],
];

function coverGradient(seed) {
  const idx = Math.abs(hashCode(seed)) % COVER_PALETTE.length;
  const [a, b] = COVER_PALETTE[idx];
  return `linear-gradient(155deg, ${a}, ${b})`;
}
function hashCode(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) { h = (h << 5) - h + str.charCodeAt(i); h |= 0; }
  return h;
}

const MOCK_BOOKS = [
  { id: 1, title: "Atomic Habits", author: "James Clear", rating: 4.8, reviews: 120, category: "Self Help", available: true, condition: "Like New", owner: "Sarah Johnson", desc: "Tiny changes, remarkable results. This book offers a proven framework for improving every day.", imageUrl: "assets/images.jpg" },
  { id: 2, title: "The Alchemist", author: "Paulo Coelho", rating: 4.7, reviews: 98, category: "Novels", available: true, condition: "Good", owner: "Rahul Patel", desc: "A shepherd boy's journey to fulfil his personal legend, exploring destiny and self-discovery.", imageUrl: "assets/download.jpg" },
  { id: 3, title: "Rich Dad Poor Dad", author: "Robert Kiyosaki", rating: 4.6, reviews: 87, category: "Business", available: true, condition: "Good", owner: "Aisha Khan", desc: "What the rich teach their kids about money that the poor and middle class do not.", imageUrl: "assets/richdadpoordad.jpg" },
  { id: 4, title: "The 5 AM Club", author: "Robin Sharma", rating: 4.9, reviews: 110, category: "Self Help", available: true, condition: "New", owner: "Meera Nair", desc: "Own your morning, elevate your life — a story-driven guide to early rising and discipline.", imageUrl: "assets/5amclub.jpg" },
  { id: 5, title: "Sapiens", author: "Yuval Noah Harari", rating: 4.8, reviews: 143, category: "Academic", available: true, condition: "Like New", owner: "Karan Mehta", desc: "A brief history of humankind, from the Stone Age to the modern era.", imageUrl: "assets/sapiens.png" },
  { id: 6, title: "Harry Potter", author: "J.K. Rowling", rating: 4.9, reviews: 210, category: "Novels", available: true, condition: "Good", owner: "Priya Sharma", desc: "The boy who lived begins his journey at Hogwarts School of Witchcraft and Wizardry.", imageUrl: "assets/Harrypotter.jpg" },
  { id: 7, title: "Clean Code", author: "Robert C. Martin", rating: 4.7, reviews: 76, category: "Programming", available: true, condition: "Good", owner: "Devansh Rao", desc: "A handbook of agile software craftsmanship — writing code that's readable and maintainable.", imageUrl: "assets/cleancode.jpg" },
  { id: 8, title: "The Pragmatic Programmer", author: "Andrew Hunt", rating: 4.8, reviews: 92, category: "Programming", available: true, condition: "Like New", owner: "Neha Verma", desc: "Your journey to mastery — practical tips for becoming a better software developer.", imageUrl: "assets/pragmaticprogrammer.jpg" },
  { id: 9, title: "Thinking, Fast and Slow", author: "Daniel Kahneman", rating: 4.6, reviews: 134, category: "Academic", available: true, condition: "Good", owner: "Arjun Singh", desc: "How two systems drive the way we think — a landmark work on decision making.", imageUrl: "assets/thinkingfastandslow.jpg" },
  { id: 10, title: "You Don't Know JS", author: "Kyle Simpson", rating: 4.7, reviews: 65, category: "Programming", available: false, condition: "Good", owner: "Ishaan Gupta", desc: "A deep dive into the core mechanisms of the JavaScript language.", imageUrl: "assets/youdontknowjs.jpg" },
  { id: 11, title: "Deep Work", author: "Cal Newport", rating: 4.8, reviews: 101, category: "Self Help", available: true, condition: "New", owner: "Ananya Iyer", desc: "Rules for focused success in a distracted world.", imageUrl: "assets/deepwork.jpg" },
  { id: 13, title: "How to Win Friends & Influence People", author: "Dale Carnegie", rating: 4.7, reviews: 156, category: "Business", available: true, condition: "Like New", owner: "Simran Kaur", desc: "Timeless principles for building relationships and influencing people positively.", imageUrl: "assets/howtowinfriends.jpg" },
  { id: 14, title: "Educated", author: "Tara Westover", rating: 4.9, reviews: 178, category: "Academic", available: true, condition: "Good", owner: "Vikram Joshi", desc: "A memoir about the transformative power of education and self-invention.", imageUrl: "assets/educated.jpg" },
  { id: 15, title: "The Power of Now", author: "Eckhart Tolle", rating: 4.6, reviews: 99, category: "Self Help", available: true, condition: "New", owner: "Fatima Sheikh", desc: "A guide to spiritual enlightenment through presence and mindfulness.", imageUrl: "assets/poweofnow.jpg" },
];

const MOCK_CATEGORIES = [
  { name: "Programming", icon: "fa-code" },
  { name: "Novels", icon: "fa-feather" },
  { name: "Business", icon: "fa-briefcase" },
  { name: "Academic", icon: "fa-graduation-cap" },
  { name: "Self Help", icon: "fa-seedling" },
  { name: "Competitive Exams", icon: "fa-layer-group" },
];

const MOCK_USER = { id: 1, name: "Sarah Johnson", initials: "SJ", email: "sarah.johnson@example.com" };

const MOCK_STATS = { booksShared: 12, booksBorrowed: 8, pendingRequests: 5, reviewsGiven: 23 };

const MOCK_MY_REQUESTS = [
  { id: 1, book: "Atomic Habits", author: "James Clear", status: "Pending", bookId: 1 },
  { id: 2, book: "The 5 AM Club", author: "Robin Sharma", status: "Pending", bookId: 4 },
  { id: 3, book: "Deep Work", author: "Cal Newport", status: "Accepted", bookId: 11 },
];

const MOCK_RECENT = [7, 8, 9, 10];
const MOCK_WISHLIST_IDS = [5, 2, 6];
const MOCK_RECOMMENDED_IDS = [12, 3, 13];

const MOCK_REVIEWS = {
  1: [{ user: "Rahul Patel", rating: 5, date: "2 days ago", text: "Amazing book! Life changing perspective on building better habits." }],
};

function getMockBook(id) {
  return MOCK_BOOKS.find((b) => b.id === Number(id));
}
