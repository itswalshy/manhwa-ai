# Manhwa-AI: Personalized Manhwa/Manhua Recommendation System

A full-stack AI-powered recommendation system for manhwa and manhua webtoons, optimized for free hosting services.

## Features

- Personalized recommendations based on user preferences and reading history
- Tiered recommendation system that scales based on resource availability
- Efficient content indexing and metadata extraction
- User preference tracking for genres, art styles, and tags
- Reading history and progress tracking
- Advanced search with filters
- Responsive UI optimized for all device sizes

## Tech Stack

### Frontend
- **Framework**: Next.js hosted on Vercel
- **State Management**: React Hooks and Context API
- **Styling**: CSS Modules
- **Key Optimizations**: 
  - Image optimization with Next/Image
  - Server components for data-heavy pages
  - Incremental Static Regeneration for trending content
  - Pagination limited to small batches

### Backend
- **Framework**: Express.js deployed as serverless functions on Railway
- **Database**: MongoDB Atlas (free tier)
- **Caching**: In-memory caching with Redis-like interface
- **Key Optimizations**:
  - Resource-based tier selection for recommendations
  - Scheduled jobs during off-peak hours
  - Automatic hibernation during inactive periods
  - Request throttling when approaching limits

### AI Recommendation System
- **Tier 1 (Lightweight)**: Tag/genre-based matching for minimal resource usage
- **Tier 2 (Standard)**: Collaborative filtering for users with sufficient history
- **Tier 3 (Enhanced)**: Content-based analysis with art style matching
- **Optimizations**:
  - Pre-computed similarity metrics
  - Caching for 24-hour periods
  - Graceful degradation across tiers

## Project Structure

```
manhwa-ai/
├── frontend/               # Next.js frontend
│   ├── components/         # React components
│   ├── pages/              # Next.js pages
│   ├── public/             # Static assets
│   ├── styles/             # CSS modules
│   ├── utils/              # Utility functions
│   └── hooks/              # Custom React hooks
│
├── backend/                # Express.js backend
│   ├── controllers/        # Request handlers
│   ├── models/             # MongoDB schemas
│   ├── routes/             # API routes
│   ├── config/             # Configuration files
│   ├── services/           # Business logic
│   └── utils/              # Utility functions
│
└── README.md               # Project documentation
```

## Getting Started

### Prerequisites
- Node.js v16 or higher
- MongoDB Atlas account (free tier)
- Vercel account (free tier)
- Railway account (free tier)

### Development Setup

1. Clone the repository:
```bash
git clone https://github.com/yourusername/manhwa-ai.git
cd manhwa-ai
```

2. Install frontend dependencies:
```bash
cd frontend
npm install
```

3. Install backend dependencies:
```bash
cd ../backend
npm install
```

4. Create `.env` files:

Frontend `.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

Backend `.env`:
```
PORT=3001
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.example.mongodb.net/manhwa-ai
JWT_SECRET=your_jwt_secret
```

5. Start the development servers:

Backend:
```bash
npm run dev
```

Frontend:
```bash
cd ../frontend
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Deployment

### Frontend (Vercel)
1. Connect your GitHub repository to Vercel
2. Set environment variables
3. Deploy with default settings

### Backend (Railway)
1. Connect your GitHub repository to Railway
2. Set environment variables
3. Configure auto-scaling settings
4. Set up auto-hibernation during off-peak hours

### Database (MongoDB Atlas)
1. Create a free tier cluster
2. Set up database access
3. Configure network access for Vercel and Railway
4. Create indexes for optimized queries

## Scaling Strategy

The project is designed to scale efficiently within free tier constraints:

1. **Phase 1 (1-500 users)**:
   - Basic recommendation system using Lightweight Tier
   - Simple content library with manual curation

2. **Phase 2 (500-2000 users)**:
   - Standard Tier recommendations for established users
   - Expanded content library with automated indexing

3. **Phase 3 (2000+ users)**:
   - Evaluate migration to paid tiers based on usage patterns
   - Enhanced Tier recommendations for premium features
   - Consider hybrid storage with cold storage for historical data

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

* The manhwa and manhua community for inspiration
* Free tier hosting services that make projects like this possible #   m a n h w a - a i  
 