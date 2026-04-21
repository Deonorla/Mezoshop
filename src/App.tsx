/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';

const pageTransition = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
  transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as const }
};

export default function App() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-mezo-bg selection:bg-mezo-rose/30">
      <AnimatePresence mode="wait">
        <motion.div
          key={location.pathname}
          {...pageTransition}
          className="min-h-screen"
        >
          {/* Router outlet is handled by RouterProvider */}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
