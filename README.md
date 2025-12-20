# 🧾 SplitBuddy

A smart bill-splitting app that uses OCR to scan physical receipts, allows users to input participant names, enables interactive assignment of individual items to specific people, and calculates each person's total, including optional shared items, tax, and tip.

## ✨ Features

- **📸 OCR Receipt Scanning**: Use your camera or upload an image to automatically extract items and prices from receipts
- **👥 Participant Management**: Easily add and remove people splitting the bill
- **🎯 Interactive Item Assignment**: Assign items to specific people with a simple click interface
- **🔀 Shared Items**: Support for items shared among multiple people with automatic split calculation
- **💰 Smart Calculations**: Automatically distributes tax and tip proportionally based on each person's subtotal
- **📊 Detailed History**: View past splits with complete breakdowns and export to CSV
- **🎨 Modern UI**: Clean, friendly green and white theme designed for ease of use
- **📱 PWA Support**: Install as a native app on your mobile device for offline access
- **📱 Responsive Design**: Works seamlessly on mobile and desktop devices

## 📱 Install as Mobile App

SplitBuddy is a Progressive Web App (PWA) that can be installed on your mobile device:

### iOS (iPhone/iPad)
1. Open SplitBuddy in Safari
2. Tap the Share button (box with arrow)
3. Scroll down and tap "Add to Home Screen"
4. Tap "Add" to confirm
5. The app icon will appear on your home screen

### Android
1. Open SplitBuddy in Chrome
2. Tap the menu button (three dots)
3. Tap "Add to Home screen" or "Install app"
4. Tap "Install" to confirm
5. The app icon will appear on your home screen

### Desktop (Chrome/Edge)
1. Open SplitBuddy in Chrome or Edge
2. Look for the install icon in the address bar (+ or computer icon)
3. Click "Install" to add to your applications

**Note**: To generate app icons, open `/public/create-icons.html` in your browser, right-click each canvas, and save as `icon-192x192.png` and `icon-512x512.png` in the `public/` folder.

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

1. Clone the repository or download the project
2. Navigate to the project directory:
   ```bash
   cd SplitBuddy
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open your browser and navigate to `http://localhost:5173`

## 🗄️ Backend (MySQL) Setup

This project now includes a lightweight Node.js API server that connects to your cloud-hosted MySQL instance.

### Configure and run the server

1. Copy the example env and fill with your MySQL credentials (see screenshot):

```bash
cd server
cp .env.example .env
# Edit .env to set DB_PASSWORD and optional CORS_ORIGIN
```

2. Install and start the server:

```bash
npm install
npm run dev
```

The server listens on `http://localhost:3001` and Vite proxies `/api` to it during development. First startup will ensure tables `users` and `profiles` exist.

### Client configuration

- Dev proxy is already set in [vite.config.ts](vite.config.ts). You can optionally set `VITE_API_BASE_URL` in `.env.local` to point to a remote API.

### Available endpoints

- `GET /api/ping` – health check
- `POST /api/auth/signup` – create account, returns JWT + user/profile
- `POST /api/auth/login` – authenticate, returns JWT + user/profile
- `GET /api/me` – current user and profile (Authorization: Bearer <token>)
- `PUT /api/profiles` – update profile fields (e.g., name)
- `POST /api/profiles/scans/increment` – atomically increment scan count with monthly reset
- `POST /api/auth/request-reset` – send a password reset link (email or console log)
- `POST /api/auth/reset` – set a new password using the token

### Password reset email

- By default, the server uses `MOCK_EMAIL=true` and will log the reset link in the API terminal. Look for `[MOCK EMAIL] Password reset link:` after submitting your email.
- To enable real emails, set the following in `server/.env`:

```env
MOCK_EMAIL=false
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your_username
SMTP_PASSWORD=your_password
SMTP_SECURE=false
RESET_PUBLIC_URL=https://your-api-host
```

The reset page is served by the server at `/reset?token=...`.

## 📖 How to Use

### Step 1: Scan Receipt
- Click "📷 Open Camera" to capture a photo of your receipt
- Or click "📁 Upload Image" to select an existing photo
- The app will automatically extract items and prices using OCR
- You can also skip this step and add items manually

### Step 2: Add Participants
- Enter the names of people splitting the bill
- Each participant gets assigned a unique color for easy identification
- Add or remove participants as needed

### Step 3: Assign Items
- Each receipt item is displayed with its description and price
- Click on participant names to assign items to specific people
- Items can be assigned to multiple people (automatically marked as "Shared")
- Edit item descriptions or prices if OCR made any mistakes
- Add additional items manually if needed

### Step 4: View Results
- Enter tax and tip amounts (these are distributed proportionally)
- View each person's breakdown:
  - Items total
  - Tax share
  - Tip share
  - Grand total
- See the overall grand total for the entire bill

## 🛠️ Built With

- **React** - UI framework
- **TypeScript** - Type safety and better developer experience
- **Vite** - Fast build tool and development server
- **Tesseract.js** - OCR engine for receipt scanning
- **CSS Modules** - Scoped styling

## 📁 Project Structure

```
SplitBuddy/
├── src/
│   ├── components/         # React components
│   │   ├── CameraCapture.tsx
│   │   ├── ParticipantManager.tsx
│   │   ├── ItemAssignment.tsx
│   │   └── Results.tsx
│   ├── utils/             # Utility functions
│   │   ├── ocrProcessor.ts    # OCR and text parsing
│   │   └── calculations.ts    # Split calculations
│   ├── types/             # TypeScript type definitions
│   │   └── index.ts
│   ├── App.tsx            # Main app component
│   ├── App.css            # App styles
│   ├── main.tsx           # App entry point
│   └── index.css          # Global styles
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## 🎨 Color Theme

The app uses a modern, friendly green and white theme:
- Primary Green: `#10b981`
- Dark Green: `#059669`
- Light Green: `#d1fae5`
- Background: `#f0fdf4`

## 🧪 Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Adding New Features

1. Create new components in `src/components/`
2. Add utility functions in `src/utils/`
3. Define types in `src/types/`
4. Update `App.tsx` to integrate new features

## 📝 Tips for Best Results

- **Receipt Quality**: Ensure receipts are well-lit and text is clear for best OCR results
- **Manual Review**: Always review OCR-extracted items as accuracy can vary
- **Shared Items**: Click multiple people for items that should be split equally
- **Tax & Tip**: These are distributed proportionally based on each person's item total

## 🤝 Contributing

Contributions are welcome! Feel free to submit issues or pull requests.

## 📄 License

This project is open source and available under the MIT License.

## 🙏 Acknowledgments

- Tesseract.js for OCR capabilities
- React and Vite teams for excellent developer tools
- The open-source community

---

Made with 💚 by IgN3eL
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
