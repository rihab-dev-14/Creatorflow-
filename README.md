# CreatorFlow Pro 🚀

The ultimate content strategy OS for modern creators. Generate viral sprints, track trends, and connect with a community of high-growth creators.

## Features

- **AI Trend Radar**: Real-time trend analysis using Gemini AI with Google Search grounding.
- **7-Day Viral Sprints**: Custom content plans tailored to your niche and platform (TikTok, YouTube, Instagram).
- **Creator Lab**: A community hub for sharing ideas, getting feedback, and collaborating.
- **Brand Profile**: Professional dashboard to manage your creator identity and growth stats.
- **Pro Subscriptions**: Integrated with Stripe for premium feature access.

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS, Framer Motion (animations), Lucide React (icons)
- **Backend**: Firebase (Auth, Firestore)
- **AI**: Gemini 3.1 Flash (via `@google/genai`)

## Getting Started

### Prerequisites

- Node.js 18+
- Firebase Project
- Gemini API Key

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/creatorflow-pro.git
   cd creatorflow-pro
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   Create a `.env` file based on `.env.example` and add your keys.

4. Run the development server:
   ```bash
   npm run dev
   ```

## Deployment

The app is ready for deployment on platforms like Vercel, Netlify, or Cloud Run.

1. Build the project:
   ```bash
   npm run build
   ```

2. Deploy the `dist` folder.

## Security Rules

Ensure you deploy the `firestore.rules` to your Firebase project to protect user data.

## License

MIT
