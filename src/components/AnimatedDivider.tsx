import React from 'react';
import { motion } from 'framer-motion';

const AnimatedDivider: React.FC = () => {
  return (
    <div className="px-[10px] my-10">
      <div className="relative h-1 w-full overflow-hidden rounded-full bg-white/5">
        <motion.div
          className="absolute inset-0 w-full h-full"
          style={{
            background: 'linear-gradient(90deg, #FF4500, #FFD700, #FF4500)',
            backgroundSize: '200% 100%',
          }}
          animate={{
            backgroundPosition: ['0% 0%', '200% 0%'],
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      </div>
    </div>
  );
};

export default AnimatedDivider;
