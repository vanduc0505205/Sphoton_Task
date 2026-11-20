# SphotonTask — Hệ thống Quản lý Nhân sự & Công việc Doanh nghiệp

Ứng dụng web Full-stack hiện đại phục vụ quản lý nhân sự, phân quyền đa tầng (RBAC) và quản lý công việc cá nhân/đội ngũ theo phong cách SaaS tối giản (lấy cảm hứng từ Linear & Notion).

---

## 1. Kiến trúc & Công nghệ sử dụng

Dự án được tổ chức theo cấu trúc **Monorepo** gồm 2 thư mục độc lập:

- **`/client` (Frontend)**:
  - React 18 + Vite + TypeScript
  - Tailwind CSS + Hệ thống UI Component theo chuẩn shadcn/ui (Hỗ trợ Sáng/Tối - Dark Mode, Bo góc 12px, Font Inter)
  - TanStack Query (React Query v5), React Router v6, React Hook Form + Zod validate thời gian thực
  - Lucide React Icons
- **`/server` (Backend)**:
  - Node.js + Express + TypeScript
  - **SQLite** + **Prisma ORM**
  - Xác thực JWT (Access Token 15 phút + Refresh Token 7 ngày lưu trong `httpOnly` cookie, cơ chế xoay vòng Refresh Token lưu mã băm SHA-256 trong DB)
  - Bcrypt, Zod, Nodemailer, Helmet, CORS, Express-rate-limit, Cookie-parser, Multer (tải ảnh đại diện)
  - Kiểm thử tích hợp tự động với **Vitest + Supertest**

---

## 2. Cấu trúc thư mục

```text
management_app/
├── client/                     # Ứng dụng Frontend (React + Vite + TS)
│   ├── src/
│   │   ├── components/         # Layout, Route Guards, Modal, Badges, States
│   │   ├── context/            # AuthContext, ThemeContext, ToastContext
│   │   ├── lib/                # API Client (tự động refresh token), Utils
│   │   ├── pages/              # Auth, Dashboard, Tasks (Bảng + Kanban), Admin, Profile
│   │   └── types/              # Định nghĩa TypeScript interfaces đồng bộ với API
│   └── .env.example
├── server/                     # Ứng dụng Backend (Express + Prisma + SQLite)
│   ├── prisma/
│   │   ├── schema.prisma       # Mô hình dữ liệu User, Task, RefreshToken, VerificationToken...
│   │   └── seed.ts             # Script khởi tạo tài khoản SUPER_ADMIN và dữ liệu mẫu
│   ├── src/
│   │   ├── config/             # Kiểm tra biến môi trường bằng Zod
│   │   ├── controllers/        # Xử lý HTTP Request/Response
│   │   ├── middlewares/        # authenticate, authorize, rateLimit, upload, errorHandler
│   │   ├── routes/             # Định tuyến API (/auth, /tasks, /profile, /admin)
│   │   ├── services/           # Nghiệp vụ Auth, Email, Task, User
│   │   ├── validators/         # Schema kiểm tra đầu vào bằng Zod
│   │   └── __tests__/          # Kiểm thử tự động luồng Auth & RBAC
│   └── .env.example
├── .env.example
├── .gitignore
└── package.json                # Script điều phối toàn bộ Monorepo
```

---

## 3. Hướng dẫn cài đặt và khởi chạy

### Bước 1: Cài đặt thư viện
Tại thư mục gốc của dự án, chạy:

```bash
npm install
cd server && npm install
cd ../client && npm install
cd ..
```

### Bước 2: Cấu hình biến môi trường (`.env`)
Sao chép file `.env.example` sang `.env` ở cả `server` và `client` (nếu chưa có):

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

Trong file `server/.env`, thiết lập các giá trị cấu hình của bạn (sử dụng biến môi trường, tuyệt đối không hardcode secret vào mã nguồn):

```env
PORT=4000
NODE_ENV=development
CLIENT_URL=http://localhost:5173
DATABASE_URL="file:./dev.db"

JWT_ACCESS_SECRET=YOUR_LOCAL_DEV_JWT_ACCESS_SECRET_KEY_2026
JWT_REFRESH_SECRET=YOUR_LOCAL_DEV_JWT_REFRESH_SECRET_KEY_2026

SUPER_ADMIN_EMAIL=superadmin@sphoton.local
SUPER_ADMIN_PASSWORD=YOUR_SUPER_ADMIN_PASSWORD_123a
SUPER_ADMIN_NAME="Quản trị viên cấp cao"

DEMO_ADMIN_EMAIL=admin@sphoton.local
DEMO_USER_EMAIL=nhanvien@sphoton.local
DEMO_ACCOUNT_PASSWORD=YOUR_DEMO_PASSWORD_123a
```

### Bước 3: Khởi tạo cơ sở dữ liệu SQLite & Seed dữ liệu
```bash
npm run db:setup
```
*(Lệnh trên sẽ đồng bộ schema Prisma vào SQLite và chạy script `seed.ts` để tạo tài khoản `SUPER_ADMIN`, `ADMIN`, `USER` cùng các công việc mẫu).*

### Bước 4: Chạy đồng thời cả Client và Server
Tại thư mục gốc, chạy duy nhất lệnh:

```bash
npm run dev
```

- **Frontend (Client)**: `http://localhost:5173`
- **Backend (Server API)**: `http://localhost:4000/api`

---

## 4. Thông tin tài khoản mặc định (từ biến môi trường `.env`)

Sau khi chạy `npm run db:setup`, các tài khoản sau được tạo dựa trên cấu hình trong `server/.env`:

| Vai trò (Role) | Email (theo biến môi trường) | Mật khẩu | Quyền hạn |
| :--- | :--- | :--- | :--- |
| **SUPER_ADMIN** | Giá trị `SUPER_ADMIN_EMAIL` (`superadmin@sphoton.local`) | Giá trị `SUPER_ADMIN_PASSWORD` trong `server/.env` | Toàn quyền quản trị nhân sự, đổi role, khóa/mở khóa, xóa user, toàn quyền CRUD mọi công việc |
| **ADMIN** | Giá trị `DEMO_ADMIN_EMAIL` (`admin@sphoton.local`) | Giá trị `DEMO_ACCOUNT_PASSWORD` trong `server/.env` | Xem danh sách toàn bộ nhân sự và toàn bộ công việc (chế độ chỉ đọc) |
| **USER** | Giá trị `DEMO_USER_EMAIL` (`nhanvien@sphoton.local`) | Giá trị `DEMO_ACCOUNT_PASSWORD` trong `server/.env` | Quản lý công việc cá nhân (Bảng & Kanban), cập nhật hồ sơ cá nhân |

---

## 5. Kiểm thử tự động (Automated Tests)

Để chạy bộ kiểm thử tích hợp cho luồng xác thực (đăng ký, xác thực email, khóa tạm sau 5 lần sai mật khẩu, xoay vòng refresh token) và phân quyền RBAC:

```bash
npm test
```
