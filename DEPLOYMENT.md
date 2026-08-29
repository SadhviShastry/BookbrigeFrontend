# BookBridge — Free Deployment Guide (Step by Step)

Isme teen cheezein deploy karni hain, sab **free tier** pe:
1. **MySQL database** → Railway (ya Aiven)
2. **Spring Boot backend** → Render
3. **Frontend (HTML/CSS/JS)** → Netlify

Poora process ~30-45 min lagega. Har step ke baad verify kar lena.

---

## Part 1 — MySQL Database (Railway)

1. Jaake [railway.app](https://railway.app) pe sign up karo (GitHub se login easiest hai).
2. Dashboard mein **"New Project" → "Provision MySQL"** click karo.
3. Railway apna khud ka MySQL instance bana dega. Iske **"Variables"** tab pe jaake yeh 4 cheezein note kar lo:
   - `MYSQLHOST`
   - `MYSQLPORT`
   - `MYSQLDATABASE`
   - `MYSQLUSER`
   - `MYSQLPASSWORD`
4. Yeh values baad mein backend ke environment variables mein daalni hain — abhi ke liye kahin safe jagah copy kar lo (jaise Notepad).

**Free tier limit**: Railway ka free tier ek monthly credit deta hai ($5 approx) — ek college project ke liye kaafi hai. Agar khatam ho jaye toh Aiven.io ka free MySQL bhi try kar sakti ho (alternative, same idea).

---

## Part 2 — Backend (Render)

1. Pehle apna `bookbridge-backend` folder ek **GitHub repository** mein push karo:
   ```
   cd bookbridge-backend
   git init
   git add .
   git commit -m "Initial backend"
   git branch -M main
   git remote add origin https://github.com/<your-username>/bookbridge-backend.git
   git push -u origin main
   ```
   (GitHub Desktop use kar sakti ho agar terminal mein comfortable nahi ho.)

2. [render.com](https://render.com) pe sign up karo (GitHub se login).

3. Dashboard pe **"New +" → "Web Service"** click karo, apna `bookbridge-backend` repo select karo.

4. Configuration:
   - **Name**: `bookbridge-backend` (ya jo bhi chahiye)
   - **Region**: Singapore (India ke closest)
   - **Branch**: `main`
   - **Runtime**: `Docker` nahi — **Java** select karo, ya "Native Environment" mein:
     - **Build Command**: `mvn clean package -DskipTests`
     - **Start Command**: `java -jar target/bookbridge-backend.jar`
   - **Instance Type**: Free

5. **Environment Variables** add karo (Render dashboard mein "Environment" tab):
   ```
   DB_HOST       = <Railway ka MYSQLHOST>
   DB_PORT       = <Railway ka MYSQLPORT>
   DB_NAME       = <Railway ka MYSQLDATABASE>
   DB_USER       = <Railway ka MYSQLUSER>
   DB_PASSWORD   = <Railway ka MYSQLPASSWORD>
   JWT_SECRET    = <ek lambi random string — neeche generate karne ka tareeka hai>
   CORS_ORIGINS  = https://your-frontend-name.netlify.app
   PORT          = 8080
   ```

   **JWT_SECRET generate karne ke liye** — terminal mein ye chalao (ya koi bhi 40+ character random string use karo):
   ```
   openssl rand -base64 48
   ```
   Isko kabhi bhi GitHub pe commit mat karna — sirf Render ke environment variable mein daalna.

6. **"Create Web Service"** click karo. Render build karega (5-10 min lagenge first time). Build logs mein dekhte raho — agar koi error aaye, wahi copy karke mujhe bhejo, main fix kar dungi.

7. Deploy hone ke baad Render tumhe ek URL dega, jaise:
   ```
   https://bookbridge-backend.onrender.com
   ```
   Isko test karo browser mein: `https://bookbridge-backend.onrender.com/api/categories` khol ke dekho — agar JSON mein categories dikh rahi hain, backend live hai! 🎉

   **Note**: Render ka free tier 15 min inactivity ke baad "sleep" ho jata hai — pehli request thodi slow (20-30 sec) hogi jab wake up hoga. College project demo ke liye bilkul theek hai.

---

## Part 3 — Frontend (Netlify)

1. `js/api.js` file mein yeh line dhundo:
   ```js
   const API_BASE = "http://localhost:8080/api";
   ```
   Isse change karo apne Render backend URL pe:
   ```js
   const API_BASE = "https://bookbridge-backend.onrender.com/api";
   ```

2. Apne poore frontend folder (index.html, css/, js/, sab kuch) ko [netlify.com](https://app.netlify.com) pe drag-and-drop karo:
   - Netlify pe sign up karo (GitHub se easiest)
   - Dashboard pe **"Add new site" → "Deploy manually"**
   - Apna poora `bookbridge` folder drag karke drop kar do
   - Netlify turant deploy kar dega aur ek URL dega jaise `https://bookbridge-sadhvi.netlify.app`

3. **Important**: Ab wapas Render ke environment variables mein jaake `CORS_ORIGINS` ko is exact Netlify URL se update karo (agar pehle placeholder daala tha), phir Render service ko **"Manual Deploy" → "Deploy latest commit"** se restart karo taaki naya CORS setting apply ho.

4. Apna live site kholo aur test karo:
   - Register karke dekho — agar successful hai, backend se connect ho raha hai
   - Admin login try karo (`admin@bookbridge.com` / `admin123`) — **turant password change kar lena Settings se**

---

## Verification Checklist

- [ ] `https://<backend-url>/api/categories` browser mein JSON dikhata hai
- [ ] Frontend pe Register karne se naya user MySQL mein save ho raha hai (Railway dashboard → Data tab se check kar sakti ho)
- [ ] Login karke Dashboard load ho raha hai
- [ ] Admin panel mein Users/Books/Donations/Activity Log sab dikh rahe hain
- [ ] Book list/request/accept/PDF receipt flow end-to-end kaam kar raha hai

---

## Common Issues

**"CORS error" browser console mein** → `CORS_ORIGINS` env variable Render pe exactly tumhare Netlify URL se match honi chahiye (https:// ke saath, trailing slash ke bina).

**Backend build fail ho raha hai** → Render logs mein exact error dekho; zyada tar case mein Java version mismatch hota hai — Render Settings mein confirm karo Java 17 use ho raha hai.

**"Access denied for user" MySQL error** → Railway ke variables dubara check karo, especially `DB_PASSWORD` mein koi extra space toh nahi aa gaya copy-paste karte waqt.

**Login/Register kaam nahi kar raha but categories load ho rahi hain** → Yeh normal hai agar abhi MySQL tables auto-create nahi hui — Render logs mein "Hibernate: create table..." dikhna chahiye startup pe. Agar nahi dikh raha, DB connection hi fail ho rahi hai — Part 1 ke credentials dubara check karo.

---

## After deployment — production checklist

1. **Admin password badlo** — demo `admin123` sirf development ke liye hai.
2. `JWT_SECRET` production mein kabhi bhi placeholder ke saath mat rakhna.
3. Agar real users honge, HTTPS already Render/Netlify dono free mein deta hain — extra kuch nahi karna padega.
4. Weekly email digest (jo tumne mention kiya tha) ke liye — Spring Boot mein `spring-boot-starter-mail` add karke `@Scheduled` job likhna padega, aur ek free SMTP provider (jaise Brevo/Sendinblue free tier — 300 emails/day free) connect karna padega. Yeh agla phase hai agar chahiye toh bata dena, main wire kar dungi.

Kahin bhi atak jao — jo bhi error aaye, uska poora message copy-paste karke bhej dena, main turant dekh ke bata dungi kya fix karna hai.
