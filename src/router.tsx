import { lazy, Suspense } from 'react';
import type { ReactNode } from 'react';
import { createBrowserRouter, RouteObject } from 'react-router-dom';
import { motion } from 'motion/react';
import ProtectedRoute from './components/ProtectedRoute';

// Lazy load pages for performance
const Landing = lazy(() => import('./pages/Landing'));
const Auth = lazy(() => import('./pages/Auth'));
const Onboarding = lazy(() => import('./pages/Onboarding'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Portfolio = lazy(() => import('./pages/Portfolio'));
const Orders = lazy(() => import('./pages/Orders'));
const ProductDetail = lazy(() => import('./pages/ProductDetail'));
const Checkout = lazy(() => import('./pages/Checkout'));
const Borrow = lazy(() => import('./pages/Borrow'));
const Discovery = lazy(() => import('./pages/Discovery'));
const Profile = lazy(() => import('./pages/Profile'));

const LoadingFallback = () => (
  <div className="flex h-screen items-center justify-center bg-mezo-ink">
    <motion.div
      animate={{ scale: [1, 1.2, 1], opacity: [0.3, 1, 0.3] }}
      transition={{ duration: 2, repeat: Infinity }}
      className="text-white font-display text-4xl font-black tracking-tighter"
    >
      MEZOSHOP
    </motion.div>
  </div>
);

const PageWrapper = ({ children }: { children: ReactNode }) => (
  <Suspense fallback={<LoadingFallback />}>
    {children}
  </Suspense>
);

const Protected = ({ children }: { children: ReactNode }) => (
  <PageWrapper>
    <ProtectedRoute>{children}</ProtectedRoute>
  </PageWrapper>
);

export const routes: RouteObject[] = [
  { path: '/',            element: <PageWrapper><Landing /></PageWrapper> },
  { path: '/auth',        element: <PageWrapper><Auth /></PageWrapper> },
  { path: '/onboarding',  element: <PageWrapper><Onboarding /></PageWrapper> },
  { path: '/dashboard',   element: <Protected><Dashboard /></Protected> },
  { path: '/portfolio',   element: <Protected><Portfolio /></Protected> },
  { path: '/orders',      element: <Protected><Orders /></Protected> },
  { path: '/product/:id', element: <Protected><ProductDetail /></Protected> },
  { path: '/checkout',    element: <Protected><Checkout /></Protected> },
  { path: '/borrow',      element: <Protected><Borrow /></Protected> },
  { path: '/discovery',   element: <Protected><Discovery /></Protected> },
  { path: '/profile',     element: <Protected><Profile /></Protected> },
];

export const router = createBrowserRouter(routes);
