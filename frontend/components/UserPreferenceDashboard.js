import React, { useState, useEffect } from 'react';
import styles from '../styles/UserPreferenceDashboard.module.css';

// Available genres and art styles options
const GENRES = [
  'Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy', 
  'Horror', 'Mystery', 'Romance', 'Sci-Fi', 'Slice of Life', 
  'Sports', 'Supernatural', 'Martial Arts', 'Historical', 'Psychological'
];

const ART_STYLES = [
  'Realistic', 'Cartoon', 'Chibi', 'Sketch', 'Watercolor', '3D', 'Minimalist'
];

const UserPreferenceDashboard = ({ 
  userPreferences = {}, 
  onSave,
  loading = false
}) => {
  // Initialize state with user preferences or empty arrays
  const [preferences, setPreferences] = useState({
    genres: userPreferences.genres || [],
    artStyles: userPreferences.artStyles || [],
    excludedTags: userPreferences.excludedTags || []
  });
  
  const [customTag, setCustomTag] = useState('');
  const [customExcludedTag, setCustomExcludedTag] = useState('');
  
  // Update local state when user preferences change
  useEffect(() => {
    setPreferences({
      genres: userPreferences.genres || [],
      artStyles: userPreferences.artStyles || [],
      excludedTags: userPreferences.excludedTags || []
    });
  }, [userPreferences]);
  
  // Handle genre toggle
  const toggleGenre = (genre) => {
    setPreferences(prev => {
      const genres = [...prev.genres];
      const index = genres.indexOf(genre);
      
      if (index === -1) {
        genres.push(genre);
      } else {
        genres.splice(index, 1);
      }
      
      return { ...prev, genres };
    });
  };
  
  // Handle art style toggle
  const toggleArtStyle = (style) => {
    setPreferences(prev => {
      const artStyles = [...prev.artStyles];
      const index = artStyles.indexOf(style);
      
      if (index === -1) {
        artStyles.push(style);
      } else {
        artStyles.splice(index, 1);
      }
      
      return { ...prev, artStyles };
    });
  };
  
  // Add custom tag
  const addCustomTag = (e) => {
    e.preventDefault();
    if (customTag.trim() && !preferences.genres.includes(customTag.trim())) {
      setPreferences(prev => ({
        ...prev,
        genres: [...prev.genres, customTag.trim()]
      }));
      setCustomTag('');
    }
  };
  
  // Add excluded tag
  const addExcludedTag = (e) => {
    e.preventDefault();
    if (customExcludedTag.trim() && !preferences.excludedTags.includes(customExcludedTag.trim())) {
      setPreferences(prev => ({
        ...prev,
        excludedTags: [...prev.excludedTags, customExcludedTag.trim()]
      }));
      setCustomExcludedTag('');
    }
  };
  
  // Remove tag
  const removeTag = (tag, type) => {
    setPreferences(prev => {
      const updated = { ...prev };
      const index = updated[type].indexOf(tag);
      
      if (index !== -1) {
        updated[type].splice(index, 1);
      }
      
      return updated;
    });
  };
  
  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSave) {
      onSave(preferences);
    }
  };
  
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>Your Reading Preferences</h2>
        <p>Select your favorite genres and art styles to get personalized recommendations</p>
      </div>
      
      <form onSubmit={handleSubmit}>
        <div className={styles.section}>
          <h3>Genres</h3>
          <div className={styles.options}>
            {GENRES.map(genre => (
              <label key={genre} className={styles.checkbox}>
                <input
                  type="checkbox"
                  checked={preferences.genres.includes(genre)}
                  onChange={() => toggleGenre(genre)}
                />
                <span className={styles.checkmark}></span>
                {genre}
              </label>
            ))}
          </div>
          
          <div className={styles.customTagInput}>
            <input
              type="text"
              value={customTag}
              onChange={(e) => setCustomTag(e.target.value)}
              placeholder="Add custom genre or tag"
              className={styles.input}
            />
            <button 
              type="button" 
              onClick={addCustomTag} 
              className={styles.button}
              disabled={!customTag.trim()}
            >
              Add
            </button>
          </div>
        </div>
        
        <div className={styles.section}>
          <h3>Art Styles</h3>
          <div className={styles.options}>
            {ART_STYLES.map(style => (
              <label key={style} className={styles.checkbox}>
                <input
                  type="checkbox"
                  checked={preferences.artStyles.includes(style)}
                  onChange={() => toggleArtStyle(style)}
                />
                <span className={styles.checkmark}></span>
                {style}
              </label>
            ))}
          </div>
        </div>
        
        <div className={styles.section}>
          <h3>Excluded Content (Tags to Avoid)</h3>
          <div className={styles.tagList}>
            {preferences.excludedTags.map(tag => (
              <div key={tag} className={styles.tag}>
                <span>{tag}</span>
                <button
                  type="button"
                  onClick={() => removeTag(tag, 'excludedTags')}
                  className={styles.removeTag}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          
          <div className={styles.customTagInput}>
            <input
              type="text"
              value={customExcludedTag}
              onChange={(e) => setCustomExcludedTag(e.target.value)}
              placeholder="Add tag to exclude"
              className={styles.input}
            />
            <button 
              type="button" 
              onClick={addExcludedTag} 
              className={styles.button}
              disabled={!customExcludedTag.trim()}
            >
              Add
            </button>
          </div>
        </div>
        
        <div className={styles.footer}>
          <button 
            type="submit" 
            className={styles.saveButton}
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save Preferences'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default UserPreferenceDashboard; 