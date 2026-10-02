// Platform fee utility functions for both client and server
export const calculateFee = (amount: number): number => {
  // Actual platform fee rates (what we charge)
  if (amount <= 499) {
    return amount * 0.15; // 15%
  } else if (amount <= 1499) {
    return amount * 0.10; // 10%
  } else {
    return amount * 0.05; // 5%
  }
};

export const getFeeRate = (amount: number): number => {
  // Actual platform fee rates (what we charge)
  if (amount <= 499) {
    return 0.15; // 15%
  } else if (amount <= 1499) {
    return 0.10; // 10%
  } else {
    return 0.05; // 5%
  }
};

// Display functions for showing discounted pricing strategy
export const getDisplayedFeeRate = (amount: number): number => {
  // Always show 20% as the "original" rate for psychological pricing
  return 0.20; // 20%
};

export const calculateDisplayedFee = (amount: number): number => {
  // Show what 20% would be
  return amount * 0.20; // 20%
};

export const getDiscountPercentage = (amount: number): number => {
  // Calculate discount percentage from 20% to actual rate
  const actualRate = getFeeRate(amount);
  const displayRate = 0.20;
  return ((displayRate - actualRate) / displayRate) * 100;
};

// Keep backward compatibility
export const calculateCommission = calculateFee;
export const getCommissionRate = getFeeRate;
export const calculateDisplayedCommission = calculateFee;
export const getDisplayedCommissionRate = getFeeRate;
export const calculateActualCommission = calculateFee;

export const getFeeTier = (amount: number): string => {
  if (amount <= 499) {
    return "₹0-₹499";
  } else if (amount <= 1499) {
    return "₹500-₹1499"; 
  } else {
    return "Above ₹1500";
  }
};

// Keep backward compatibility
export const getCommissionTier = getFeeTier;