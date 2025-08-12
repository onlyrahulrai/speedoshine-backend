# Backend API

A robust, scalable backend application built with **Node.js**, **Express.js**, **TSOA**, **MongoDB**, **BullMQ**, and **Nodemailer**.  
This project is designed with clean architecture principles, featuring REST APIs, background job processing, and email integration.

---

## 🚀 Features

- **Type-Safe API** with [TSOA](https://github.com/lukeautry/tsoa) for automatic route generation and Swagger docs.
- **Database**: MongoDB with Mongoose for schema-based modeling.
- **Job Queue**: [BullMQ](https://docs.bullmq.io/) for background tasks and delayed jobs.
- **Email Service**: Nodemailer for sending emails (transactional, notifications, etc.).
- **Environment Config** using `.env` files.
- **Error Handling** with consistent response formatting.
- **Scalable Folder Structure** for large applications.

---

## 🛠️ Tech Stack

| Technology     | Purpose |
|----------------|---------|
| Node.js        | Runtime environment |
| Express.js     | HTTP server & routing |
| TSOA           | API generation & Swagger documentation |
| MongoDB        | NoSQL database |
| Mongoose       | ODM for MongoDB |
| BullMQ         | Job queue processing |
| Redis          | Backend for BullMQ |
| Nodemailer     | Email sending |
| TypeScript     | Type-safe development |

---

## 📂 Project Structure
```
├── src
│   ├── auth/                   # Authentication-related modules
│   |   ├── expressAuthentication.ts # Express authentication middleware
│   ├── config/                  # Environment variables & configs
│   ├── controllers/             # API controllers (TSOA)
│   ├── helper/                  # Utility/helper functions
│   ├── jobs/                    # BullMQ job processors
│   ├── models/                  # Mongoose schemas
│   ├── services/                # Business logic
│   ├── types/                   # TypeScript type definitions
│   ├── workers/                 # BullMQ workers
│   └── server.ts                # App entry point
├── .gitignore                    # Git ignored files & folders
├── package.json                  # Project dependencies & scripts
├── scripts.md                    # Script usage documentation
├── tsconfig.json                 # TypeScript configuration
├── tsoa.json                    # TSOA configuration
└── README.md                     # Project documentation
```

---

## 📦 Installation & Setup

### 1️⃣ Clone the repository
```bash
git clone https://github.com/your-username/your-repo-name.git
cd your-repo-name
```
**2️⃣ Install dependencies**

```
npm install
```

**3️⃣ Environment variables**
Create a .env file in the root directory:
```
PORT=5500
MONGO_URI=mongodb://localhost:27017/your-db
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
SMTP_HOST=smtp.your-email.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASS=your-email-password
```
**4️⃣ Run the development server**
```
npm run dev
```

**📜 API Documentation**
The API documentation is auto-generated using TSOA and available at:
```
http://localhost:5000/docs
```

**📜 Scripts**
```
| Script                 | Description                                                           |
|------------------------|---------------------------------------------------------------------- |
| `yarn dev`             | Start the development server with auto reload using tsx               |
| `yarn start`           | Start the production server                                           |
| `yarn tsoa:routes`     | Generate tsoa route bindings from controllers                         |
| `yarn tsoa:spec`       | Generate Swagger (OpenAPI) JSON documentation                         |
| `yarn tsoa:build`      | Generate both route bindings and Swagger spec                         |
```

**🤝 Contributing**
- Fork the repo
- Create a new branch (feature/xyz)
- Commit your changes
- Push to your branch
- Open a pull request

### **💡 Author**
**Rahul Rai**
Passionate about building scalable backend systems and clean APIs.
```
---

If you want, I can also make a **version with emojis for section titles** and **badges for Node.js, MongoDB, Redis, etc.** so the README looks more attractive for GitHub.  
Do you want me to make that upgraded visual version?
```

