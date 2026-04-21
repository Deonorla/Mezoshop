import { useNavigate } from 'react-router-dom';

export const useAppNavigation = () => {
  const navigate = useNavigate();

  return {
    goToLanding: () => navigate('/'),
    goToAuth: () => navigate('/auth'),
    goToOnboarding: () => navigate('/onboarding'),
    goToDashboard: () => navigate('/dashboard'),
    goToPortfolio: () => navigate('/portfolio'),
    goToOrders: () => navigate('/orders'),
    goToProduct: (id: string) => navigate(`/product/${id}`),
    goToCheckout: () => navigate('/checkout'),
    goToBorrow: () => navigate('/borrow'),
    goToDiscovery: () => navigate('/discovery'),
    navigate,
  };
};
