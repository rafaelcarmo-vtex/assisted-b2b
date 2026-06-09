import React from 'react';

const LoadingBar: React.FC = () => (
  <div className="loading-bar-container animate-in fade-in duration-300">
    <div className="loading-bar-inner">
      <div className="loading-bar-piece primary"></div>
      <div className="loading-bar-piece secondary"></div>
    </div>
  </div>
);

export default LoadingBar;
