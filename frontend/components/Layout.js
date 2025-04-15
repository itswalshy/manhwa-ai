import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import styles from '../styles/Layout.module.css';

const Layout = ({ children }) => {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  
  // Check if user is authenticated
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setIsAuthenticated(true);
      // Try to get user info
      fetchUserData(token);
    } else {
      setIsAuthenticated(false);
      setUser(null);
    }
  }, [router.asPath]);
  
  // Fetch user data for header display
  const fetchUserData = async (token) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      } else {
        // Clear invalid token
        localStorage.removeItem('token');
        setIsAuthenticated(false);
        setUser(null);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };
  
  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
    setUser(null);
    router.push('/');
  };
  
  // Toggle mobile menu
  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };
  
  return (
    <div className={styles.container}>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <Link href="/" className={styles.logo}>
            <span className={styles.logoText}>Manhwa<span className={styles.logoHighlight}>AI</span></span>
          </Link>
          
          <button className={styles.menuButton} onClick={toggleMenu}>
            <span className={styles.menuIcon}></span>
          </button>
          
          <nav className={`${styles.nav} ${menuOpen ? styles.open : ''}`}>
            <Link href="/" className={styles.navLink}>
              Home
            </Link>
            <Link href="/explore" className={styles.navLink}>
              Explore
            </Link>
            <Link href="/trending" className={styles.navLink}>
              Trending
            </Link>
            
            {isAuthenticated ? (
              <>
                <Link href="/profile" className={styles.navLink}>
                  Profile
                </Link>
                <button onClick={handleLogout} className={styles.navButton}>
                  Logout
                </button>
                {user && (
                  <div className={styles.userInfo}>
                    <span className={styles.username}>{user.username}</span>
                  </div>
                )}
              </>
            ) : (
              <>
                <Link href="/login" className={styles.navLink}>
                  Login
                </Link>
                <Link href="/signup" className={styles.navButton}>
                  Sign Up
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>
      
      <main className={styles.main}>{children}</main>
      
      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <div className={styles.footerSection}>
            <h3 className={styles.footerTitle}>Manhwa AI</h3>
            <p className={styles.footerText}>
              Personalized manhwa and manhua recommendations powered by AI.
            </p>
          </div>
          
          <div className={styles.footerSection}>
            <h3 className={styles.footerTitle}>Links</h3>
            <ul className={styles.footerLinks}>
              <li>
                <Link href="/" className={styles.footerLink}>
                  Home
                </Link>
              </li>
              <li>
                <Link href="/explore" className={styles.footerLink}>
                  Explore
                </Link>
              </li>
              <li>
                <Link href="/trending" className={styles.footerLink}>
                  Trending
                </Link>
              </li>
              <li>
                <Link href="/about" className={styles.footerLink}>
                  About
                </Link>
              </li>
            </ul>
          </div>
          
          <div className={styles.footerSection}>
            <h3 className={styles.footerTitle}>Legal</h3>
            <ul className={styles.footerLinks}>
              <li>
                <Link href="/terms" className={styles.footerLink}>
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/privacy" className={styles.footerLink}>
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/disclaimer" className={styles.footerLink}>
                  Disclaimer
                </Link>
              </li>
            </ul>
          </div>
        </div>
        
        <div className={styles.footerBottom}>
          <p className={styles.copyright}>
            © {new Date().getFullYear()} Manhwa AI. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Layout; 