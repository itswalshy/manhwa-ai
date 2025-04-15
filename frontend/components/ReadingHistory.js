import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { format } from 'date-fns';
import styles from '../styles/ReadingHistory.module.css';

const ITEMS_PER_PAGE = 10;

const ReadingHistoryItem = ({ historyItem }) => {
  const { manhwa, lastChapterRead, overallProgress, dateRead, readingStatus, rating } = historyItem;
  const [imageError, setImageError] = useState(false);
  
  // Format the date
  const formattedDate = format(new Date(dateRead), 'MMM d, yyyy');
  
  // Generate rating stars
  const renderStars = (rating) => {
    const stars = [];
    const roundedRating = Math.round(rating);
    
    for (let i = 1; i <= 5; i++) {
      if (i <= roundedRating) {
        stars.push(<span key={i} className={styles.starFilled}>★</span>);
      } else {
        stars.push(<span key={i} className={styles.starEmpty}>☆</span>);
      }
    }
    
    return <div className={styles.stars}>{stars}</div>;
  };
  
  return (
    <div className={styles.historyItem}>
      <div className={styles.imageContainer}>
        <Link href={`/manhwa/${manhwa._id}`}>
          {!imageError ? (
            <Image
              src={manhwa.thumbnailImage || manhwa.coverImage}
              alt={manhwa.title}
              width={80}
              height={120}
              objectFit="cover"
              className={styles.image}
              onError={() => setImageError(true)}
            />
          ) : (
            <div className={styles.fallbackImage}>
              <span>{manhwa.title.charAt(0)}</span>
            </div>
          )}
        </Link>
      </div>
      
      <div className={styles.content}>
        <div className={styles.titleRow}>
          <Link href={`/manhwa/${manhwa._id}`} className={styles.title}>
            {manhwa.title}
          </Link>
          <span className={styles.date}>{formattedDate}</span>
        </div>
        
        <div className={styles.details}>
          <div className={styles.progress}>
            <div className={styles.progressBar}>
              <div 
                className={styles.progressFill} 
                style={{ width: `${overallProgress}%` }}
              ></div>
            </div>
            <span className={styles.progressText}>
              {overallProgress}% • Ch. {lastChapterRead}
            </span>
          </div>
          
          <div className={styles.meta}>
            <span className={styles.status} data-status={readingStatus.toLowerCase().replace(' ', '-')}>
              {readingStatus}
            </span>
            {rating > 0 && renderStars(rating)}
          </div>
        </div>
      </div>
      
      <div className={styles.actions}>
        <Link href={`/manhwa/${manhwa._id}/read?chapter=${lastChapterRead + 1}`} className={styles.continueButton}>
          Continue
        </Link>
      </div>
    </div>
  );
};

const ReadingHistory = ({ historyItems = [], loading = false }) => {
  const [currentPage, setCurrentPage] = useState(1);
  
  // Calculate pagination
  const totalPages = Math.ceil(historyItems.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentItems = historyItems.slice(startIndex, endIndex);
  
  // Change page
  const goToPage = (pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo(0, 0);
  };
  
  // Generate pagination controls
  const renderPagination = () => {
    if (totalPages <= 1) return null;
    
    const pages = [];
    
    // Add first page
    pages.push(
      <button
        key="first"
        onClick={() => goToPage(1)}
        disabled={currentPage === 1}
        className={`${styles.pageButton} ${currentPage === 1 ? styles.disabled : ''}`}
      >
        &laquo;
      </button>
    );
    
    // Add previous page
    pages.push(
      <button
        key="prev"
        onClick={() => goToPage(currentPage - 1)}
        disabled={currentPage === 1}
        className={`${styles.pageButton} ${currentPage === 1 ? styles.disabled : ''}`}
      >
        &lsaquo;
      </button>
    );
    
    // Add page numbers
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + 4);
    
    // Adjust if we're at the end
    if (endPage - startPage < 4) {
      startPage = Math.max(1, endPage - 4);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <button
          key={i}
          onClick={() => goToPage(i)}
          className={`${styles.pageButton} ${currentPage === i ? styles.active : ''}`}
        >
          {i}
        </button>
      );
    }
    
    // Add next page
    pages.push(
      <button
        key="next"
        onClick={() => goToPage(currentPage + 1)}
        disabled={currentPage === totalPages}
        className={`${styles.pageButton} ${currentPage === totalPages ? styles.disabled : ''}`}
      >
        &rsaquo;
      </button>
    );
    
    // Add last page
    pages.push(
      <button
        key="last"
        onClick={() => goToPage(totalPages)}
        disabled={currentPage === totalPages}
        className={`${styles.pageButton} ${currentPage === totalPages ? styles.disabled : ''}`}
      >
        &raquo;
      </button>
    );
    
    return <div className={styles.pagination}>{pages}</div>;
  };
  
  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingState}>
          <div className={styles.spinner}></div>
          <p>Loading your reading history...</p>
        </div>
      </div>
    );
  }
  
  if (historyItems.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyState}>
          <h3>No Reading History</h3>
          <p>You haven't read any manhwas yet. Start exploring and your history will appear here.</p>
          <Link href="/explore" className={styles.exploreButton}>
            Explore Manhwas
          </Link>
        </div>
      </div>
    );
  }
  
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>Your Reading History</h2>
        <p>Track your progress across all manhwas</p>
      </div>
      
      <div className={styles.historyList}>
        {currentItems.map((item, index) => (
          <ReadingHistoryItem key={`${item.manhwa._id}-${index}`} historyItem={item} />
        ))}
      </div>
      
      {renderPagination()}
    </div>
  );
};

export default ReadingHistory; 