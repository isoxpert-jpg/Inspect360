# HSE Compliance Inspector

AI-powered Health, Safety, and Environment compliance inspection platform built with React, Vite, Supabase, and Google Gemini AI.

## Features

- 🔐 **Authentication** - Email/password and Google OAuth via Supabase
- 🤖 **AI Analysis** - Automated safety inspection using Google Gemini Vision
- 📊 **Dashboard** - Track all inspections with filtering and search
- 📸 **Image Capture** - Upload or capture images for analysis
- 📄 **Reports** - Generate comprehensive inspection reports
- 🖨️ **Print Ready** - Professional print-optimized output

## Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS
- **Build**: Vite
- **Backend**: Vercel Serverless Functions
- **Database**: Supabase (PostgreSQL)
- **AI**: Google Gemini 2.0 Flash

## Getting Started

### Prerequisites

- Node.js 18+
- Supabase account
- Google AI Studio API key
- Vercel account (for deployment)

### Environment Variables

Create a `.env.local` file:

```env
# Supabase
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Google Gemini (server-side only)
GEMINI_API_KEY=your_gemini_api_key

# App
VITE_APP_URL=http://localhost:3000
```

### Supabase Setup

1. Create a new Supabase project
2. Run the SQL from `supabase/schema.sql` in the SQL editor
3. Enable Google OAuth in Authentication > Providers
4. Add your site URL to the allowed redirect URLs

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

### Deployment to Vercel

1. Push your code to GitHub
2. Import the repository in Vercel
3. Add environment variables in Vercel dashboard:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `GEMINI_API_KEY`
4. Deploy!

## Project Structure

```
├── api/                    # Vercel serverless functions
│   ├── analyze.ts          # AI image analysis endpoint
│   ├── evacuation-plan.ts  # Evacuation plan generator
│   └── health.ts           # Health check endpoint
├── src/
│   ├── components/         # Reusable UI components
│   ├── hooks/              # Custom React hooks
│   ├── lib/                # Utilities and configs
│   ├── pages/              # Page components
│   └── types/              # TypeScript types
├── supabase/               # Database schema
└── vercel.json             # Vercel configuration
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/analyze` | POST | Analyze image for safety compliance |
| `/api/evacuation-plan` | POST | Generate evacuation plan |
| `/api/health` | GET | Health check |

## License

MIT
