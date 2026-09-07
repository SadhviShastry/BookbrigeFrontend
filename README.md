# 📖 BookBridge — Frontend

> Share, borrow, donate, exchange, or sell books within your community.

**🔗 Live Site:** [https://mybookbridge.netlify.app](https://mybookbridge.netlify.app)
**🔗 Backend Repo:** [bookbridge-backend](https://github.com/SadhviShastry/bookbridge-backend)
**🔗 Backend API:** [https://bookbridge-backend-vrkx.onrender.com/api](https://bookbridge-backend-vrkx.onrender.com/api)

![Status](https://img.shields.io/badge/status-live-brightgreen)
![Made with](https://img.shields.io/badge/made%20with-HTML%20%7C%20CSS%20%7C%20JavaScript-C1440E)
![Deployed on](https://img.shields.io/badge/deployed%20on-Netlify-00C7B7)

---

## ✨ What is BookBridge?

BookBridge is a community book-sharing platform. Instead of letting a book sit unread on a shelf, users can **lend, borrow, donate, exchange, or sell** it to someone nearby who'll actually read it. This repository is the **frontend** — a lightweight, framework-free HTML/CSS/JavaScript application that talks to the [BookBridge Spring Boot backend](https://github.com/SadhviShastry/bookbridge-backend).

## 🚀 Features

- 🔐 JWT-based authentication (user & admin login)
- 📚 Book listings — Lend, Donate, Exchange, or **Sell** (with price + payment method)
- 🔍 Search, filter, and autocomplete on the Browse page
- 📩 Borrow/purchase requests with a full lifecycle: `Pending → Accepted/Rejected → Completed`
- 💬 In-app messaging between book owner and requester
- 🔔 Real-time-style in-app notifications
- ⭐ Reviews & ratings on completed exchanges
- 🧾 **Auto-generated PDF receipts** for every completed exchange
- 🏅 Badges, rewards, and community **membership tiers**
- 📅 Community **events & donation drives**
- 🌗 Dark mode
- 🛠️ Full **Admin Dashboard** — user/listing moderation, exchange & delivery coordination, category management, donation tracking, and a platform-wide activity log

## 🧱 Tech Stack

| Layer | Technology |
|---|---|
| Structure | HTML5 |
| Styling | CSS3 (custom design system — no framework) |
| Logic | Vanilla JavaScript (ES6+) |
| Icons / Fonts | Font Awesome, Google Fonts |
| PDF Generation | jsPDF (CDN) |
| Hosting | Netlify |

## 📁 Project Structure

```
bookbridge-frontend/
├── index.html, login.html, register.html, dashboard.html, ...
├── css/
│   └── style.css
├── js/
│   ├── api.js          # talks to the Spring Boot backend, falls back to store.js if unreachable
│   ├── store.js         # localStorage mock backend (offline/dev fallback)
│   ├── mock-data.js      # seed/demo data
│   └── main.js           # shared UI logic (navbar, theme, toasts, modals, notifications)
├── assets/                # book cover images
└── .vscode/                # Live Server config
```

## 📦 Related Repository

This frontend is powered by a Java Spring Boot + MySQL backend:
👉 **[github.com/SadhviShastry/bookbridge-backend](https://github.com/SadhviShastry/bookbridge-backend)**

## 👩‍💻 Author

Built by **Sadhvi Shastry** as a full-stack mini project — K. C. College of Engineering and Management Studies & Research, Department of Information Technology.

---

<p align="center">Made with 📖 and a lot of ☕ — BookBridge, 2026</p>
