import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import UserPreferenceDashboard from '../components/UserPreferenceDashboard';
import ReadingHistory from '../components/ReadingHistory';
import styles from '../styles/Profile.module.css';

export default function Profile() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('preferences');
  const [user, setUser] = useState(null);
  const [preferences, setPreferences] = useState({});
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [error, setError] = useState(null);
  
  // Check if user is authenticated and redirect if not
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login?redirect=profile');
    } else {
      fetchUserData(token);
    }
  }, [router]);
  
  // Fetch user data including preferences
  const fetchUserData = async (token) => {
    try {
      setLoading(true);
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          // Unauthorized - token invalid or expired
          localStorage.removeItem('token');
          router.push('/login?redirect=profile');
          return;
        }
        throw new Error('Failed to fetch user data');
      }
      
      const userData = await response.json();
      setUser(userData);
      setPreferences(userData.preferences || {});
      setError(null);
    } catch (error) {
      console.error('Error fetching user data:', error);
      setError('Failed to load user profile. Please try again later.');
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch reading history
  const fetchReadingHistory = async () => {
    try {
      setLoadingHistory(true);
      const token = localStorage.getItem('token');
      
      if (!token) {
        router.push('/login?redirect=profile');
        return;
      }
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/history`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch reading history');
      }
      
      const historyData = await response.json();
      setHistory(historyData);
      setError(null);
    } catch (error) {
      console.error('Error fetching reading history:', error);
      setError('Failed to load reading history. Please try again later.');
    } finally {
      setLoadingHistory(false);
    }
  };
  
  // Load reading history when tab changes to history
  useEffect(() => {
    if (activeTab === 'history' && user) {
      fetchReadingHistory();
    }
  }, [activeTab, user]);
  
  // Handle saving preferences
  const handleSavePreferences = async (updatedPreferences) => {
    try {
      setSavingPreferences(true);
      const token = localStorage.getItem('token');
      
      if (!token) {
        router.push('/login?redirect=profile');
        return;
      }
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/preferences`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatedPreferences)
      });
      
      if (!response.ok) {
        throw new Error('Failed to update preferences');
      }
      
      // Update local state
      setPreferences(updatedPreferences);
      
      // Show success message
      alert('Preferences saved successfully!');
      
    } catch (error) {
      console.error('Error saving preferences:', error);
      alert('Failed to save preferences. Please try again.');
    } finally {
      setSavingPreferences(false);
    }
  };
  
  if (loading && !user) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Loading profile...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className={styles.errorContainer}>
        <h2>Error</h2>
        <p>{error}</p>
        <button 
          onClick={() => fetchUserData(localStorage.getItem('token'))} 
          className={styles.retryButton}
        >
          Retry
        </button>
      </div>
    );
  }
  
  return (
    <div className={styles.container}>
      <Head>
        <title>Your Profile | Manhwa AI</title>
        <meta name="description" content="Manage your preferences and reading history" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      
      <main className={styles.main}>
        <div className={styles.profileHeader}>
          <h1>Your Profile</h1>
          <p>Manage your preferences and reading history</p>
        </div>
        
        <div className={styles.tabsContainer}>
          <button 
            className={`${styles.tabButton} ${activeTab === 'preferences' ? styles.active : ''}`}
            onClick={() => setActiveTab('preferences')}
          >
            Preferences
          </button>
          <button 
            className={`${styles.tabButton} ${activeTab === 'history' ? styles.active : ''}`}
            onClick={() => setActiveTab('history')}
          >
            Reading History
          </button>
        </div>
        
        <div className={styles.tabContent}>
          {activeTab === 'preferences' && (
            <UserPreferenceDashboard 
              userPreferences={preferences}
              onSave={handleSavePreferences}
              loading={savingPreferences}
            />
          )}
          
          {activeTab === 'history' && (
            <ReadingHistory 
              historyItems={history}
              loading={loadingHistory}
            />
          )}
        </div>
      </main>
    </div>
  );
} 