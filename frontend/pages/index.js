import { useState, useEffect } from 'react';
import Head from 'next/head';
import RecommendationGrid from '../components/RecommendationGrid';
import styles from '../styles/Home.module.css';

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // Function to check if user is authenticated
  const checkAuthentication = async () => {
    try {
      // Check if token exists in localStorage
      const token = localStorage.getItem('token');
      if (token) {
        // Verify token validity with backend
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/verify`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          setIsAuthenticated(true);
        } else {
          // Token invalid, remove it
          localStorage.removeItem('token');
          setIsAuthenticated(false);
        }
      } else {
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('Authentication check failed:', error);
      setIsAuthenticated(false);
    }
  };
  
  // Function to fetch recommendations
  const fetchRecommendations = async (pageNum = 1) => {
    try {
      setLoading(true);
      
      // Determine which API endpoint to use based on authentication status
      const endpoint = isAuthenticated 
        ? `${process.env.NEXT_PUBLIC_API_URL}/recommendations?limit=12&offset=${(pageNum - 1) * 12}`
        : `${process.env.NEXT_PUBLIC_API_URL}/recommendations/trending?limit=12&offset=${(pageNum - 1) * 12}`;
      
      // Set up headers for authenticated requests
      const headers = {};
      if (isAuthenticated) {
        const token = localStorage.getItem('token');
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(endpoint, { headers });
      
      if (!response.ok) {
        throw new Error('Failed to fetch recommendations');
      }
      
      const data = await response.json();
      
      if (pageNum === 1) {
        setRecommendations(data.items);
      } else {
        setRecommendations(prev => [...prev, ...data.items]);
      }
      
      // Check if there are more items to load
      setHasMore(data.items.length === 12 && (data.metadata?.total > page * 12));
      setError(null);
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };
  
  // Load initial recommendations
  useEffect(() => {
    const loadInitialData = async () => {
      await checkAuthentication();
      await fetchRecommendations(1);
    };
    
    loadInitialData();
  }, []);
  
  // Reload recommendations when authentication state changes
  useEffect(() => {
    if (page === 1) {
      fetchRecommendations(1);
    } else {
      setPage(1); // Reset page which will trigger a reload
    }
  }, [isAuthenticated]);
  
  // Handle loading more recommendations
  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchRecommendations(nextPage);
  };
  
  return (
    <div className={styles.container}>
      <Head>
        <title>Manhwa AI - Personalized Webtoon Recommendations</title>
        <meta name="description" content="Discover the best manhwa and manhua webtoons tailored to your preferences" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      
      <main className={styles.main}>
        <section className={styles.hero}>
          <div className={styles.heroContent}>
            <h1 className={styles.title}>
              Discover Your Next Favorite Manhwa
            </h1>
            <p className={styles.description}>
              Personalized recommendations powered by AI, tailored to your reading preferences
            </p>
            
            {!isAuthenticated && (
              <div className={styles.cta}>
                <a href="/login" className={styles.ctaButton}>
                  Sign In for Personalized Recommendations
                </a>
                <p className={styles.ctaSubtext}>
                  Don't have an account? <a href="/signup">Sign up for free</a>
                </p>
              </div>
            )}
          </div>
        </section>
        
        <section className={styles.recommendationsSection}>
          <div className={styles.sectionHeader}>
            <h2>{isAuthenticated ? 'Your Recommendations' : 'Trending Now'}</h2>
            <p>
              {isAuthenticated 
                ? 'Manhwas we think you\'ll love based on your preferences'
                : 'Popular manhwas that readers are enjoying this week'}
            </p>
          </div>
          
          <RecommendationGrid 
            recommendations={recommendations}
            loading={loading}
            error={error}
            onLoadMore={handleLoadMore}
            hasMore={hasMore}
          />
        </section>
      </main>
    </div>
  );
} 