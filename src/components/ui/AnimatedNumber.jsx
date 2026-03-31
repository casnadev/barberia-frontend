import { useEffect, useRef, useState } from "react";

function AnimatedNumber({ value, duration = 1000, decimals = 2, prefix = "" }) {
  const [displayValue, setDisplayValue] = useState(value);
  const startValueRef = useRef(value);

  useEffect(() => {
    let start = startValueRef.current;
    let end = Number(value);
    let startTime = null;

    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;

      const progress = Math.min((timestamp - startTime) / duration, 1);
      const current = start + (end - start) * progress;

      setDisplayValue(current);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        startValueRef.current = end; // actualiza base para siguiente animación
      }
    };

    requestAnimationFrame(animate);
  }, [value, duration]);

  return (
    <span>
      {prefix}
      {Number(displayValue).toFixed(decimals)}
    </span>
  );
}

export default AnimatedNumber;