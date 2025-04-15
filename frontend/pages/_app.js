import { useState, useEffect } from 'react';
import Head from 'next/head';
import Layout from '../components/Layout';
import '../styles/globals.css';

function MyApp({ Component, pageProps }) {
  const [isClient, setIsClient] = useState(false);
  
  // This effect ensures that we don't try to access window/document during SSR
  useEffect(() => {
    setIsClient(true);
    
    // Initialize window error handler for API requests
    window.addEventListener('unhandledrejection', event => {
      // Log API errors but don't overwhelm the console
      if (event.reason?.message?.includes('API request failed')) {
        console.error('[API Error]:', event.reason.message);
        event.preventDefault();
      }
    });
    
    return () => {
      window.removeEventListener('unhandledrejection', () => {});
    };
  }, []);
  
  return (
    <>
      <Head>
        <title>Manhwa AI - Discover Your Next Favorite Manhwa</title>
        <meta name="description" content="Personalized manhwa and manhua recommendations powered by AI" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      
      <Layout>
        {/* Only render the component after we're on the client */}
        {isClient && <Component {...pageProps} />}
      </Layout>
    </>
  );
}

export default MyApp; 