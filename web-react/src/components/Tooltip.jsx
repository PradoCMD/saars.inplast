import { useEffect, useState } from 'react';
import './Tooltip.css';

export default function Tooltip({ children, content, position = 'bottom', delay = 200 }) {
  const [isVisible, setIsVisible] = useState(false);
  const [timeoutId, setTimeoutId] = useState(null);

  const handleMouseEnter = () => {
    const id = setTimeout(() => setIsVisible(true), delay);
    setTimeoutId(id);
  };

  const handleMouseLeave = () => {
    if (timeoutId) clearTimeout(timeoutId);
    setIsVisible(false);
  };

  useEffect(() => {
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [timeoutId]);

  return (
    <div
      className="saars-tooltip-wrapper"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleMouseLeave} // Click somem a tooltip conforme instrução
    >
      {children}
      {isVisible && content && (
        <div className={`saars-tooltip-content saars-tooltip-${position}`}>
          {content}
        </div>
      )}
    </div>
  );
}
