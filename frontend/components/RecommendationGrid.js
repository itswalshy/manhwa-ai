import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useInView } from 'react-intersection-observer';
import styles from '../styles/RecommendationGrid.module.css';

const RecommendationCard = ({ item, priority = false }) => {
  const { manhwa, score, reason } = item;
  const [imageError, setImageError] = useState(false);
  
  // Handle image loading errors
  const handleImageError = () => {
    setImageError(true);
  };
  
  // Format reason for display
  const formatReason = (reason) => {
    switch (reason) {
      case 'genre_match':
        return 'Based on your genre preferences';
      case 'similar_to_read':
        return 'Similar to manhwas you\'ve read';
      case 'art_style_match':
        return 'Matches your preferred art style';
      case 'tag_match':
        return 'Matches your favorite tags';
      case 'trending':
        return 'Popular right now';
      default:
        return 'Recommended for you';
    }
  };
  
  return (
    <div className={styles.card}>
      <div className={styles.imageContainer}>
        <Link href={`/manhwa/${manhwa._id}`}>
          <div className={styles.imageWrapper}>
            {!imageError ? (
              <Image
                src={manhwa.thumbnailImage || manhwa.coverImage}
                alt={manhwa.title}
                width={200}
                height={300}
                layout="responsive"
                objectFit="cover"
                priority={priority}
                onError={handleImageError}
                className={styles.image}
              />
            ) : (
              <div className={styles.fallbackImage}>
                <span>{manhwa.title.charAt(0)}</span>
              </div>
            )}
            <div className={styles.score}>{Math.round(score * 100)}% Match</div>
          </div>
        </Link>
      </div>
      <div className={styles.content}>
        <h3 className={styles.title}>{manhwa.title}</h3>
        <div className={styles.genres}>
          {manhwa.genres.slice(0, 3).map(genre => (
            <span key={genre} className={styles.genre}>{genre}</span>
          ))}
        </div>
        <div className={styles.meta}>
          <span className={styles.chapters}>{manhwa.chapters?.total || 0} chapters</span>
          <span className={styles.status}>{manhwa.status}</span>
        </div>
        <div className={styles.reason}>{formatReason(reason)}</div>
      </div>
    </div>
  );
};

const RecommendationGrid = ({ 
  recommendations, 
  loading, 
  error, 
  onLoadMore,
  hasMore = false
}) => {
  const { ref, inView } = useInView({
    threshold: 0.1,
    triggerOnce: false
  });
  
  // Trigger load more when the last element is in view
  useEffect(() => {
    if (inView && hasMore && !loading) {
      onLoadMore();
    }
  }, [inView, hasMore, loading, onLoadMore]);
  
  if (error) {
    return (
      <div className={styles.error}>
        <p>Failed to load recommendations. Please try again later.</p>
        <button onClick={onLoadMore} className={styles.retryButton}>
          Retry
        </button>
      </div>
    );
  }
  
  return (
    <div className={styles.container}>
      <div className={styles.grid}>
        {recommendations.length > 0 ? (
          recommendations.map((item, index) => (
            <RecommendationCard
              key={`${item.manhwa._id}-${index}`}
              item={item}
              priority={index < 4} // Prioritize loading for first 4 images
            />
          ))
        ) : loading ? (
          // Show placeholder cards while loading
          Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className={`${styles.card} ${styles.placeholder}`}>
              <div className={styles.imageContainer}>
                <div className={`${styles.imageWrapper} ${styles.loading}`} />
              </div>
              <div className={styles.content}>
                <div className={`${styles.title} ${styles.loading}`} />
                <div className={styles.genres}>
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className={`${styles.genre} ${styles.loading}`} />
                  ))}
                </div>
                <div className={`${styles.meta} ${styles.loading}`} />
              </div>
            </div>
          ))
        ) : (
          <div className={styles.empty}>
            <p>No recommendations found. Try adjusting your preferences.</p>
          </div>
        )}
      </div>
      
      {loading && recommendations.length > 0 && (
        <div className={styles.loadingMore}>
          <div className={styles.spinner} />
          <p>Loading more recommendations...</p>
        </div>
      )}
      
      {hasMore && !loading && (
        <div ref={ref} className={styles.loadMoreTrigger}>
          {/* This element is used to detect when to load more */}
        </div>
      )}
    </div>
  );
};

export default RecommendationGrid; 