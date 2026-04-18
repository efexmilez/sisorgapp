'use client';

import { usePaystackPayment } from 'react-paystack';

interface PaystackPaymentProps {
  amount: string;
  user: any;
  paystackKey: string;
  onSuccess: (reference: any) => void;
  onClose: () => void;
  initializeRef: { current: ((onSuccess: any, onClose: any) => void) | null };
}

export default function PaystackPayment({ 
  amount, 
  user, 
  paystackKey, 
  onSuccess, 
  onClose,
  initializeRef
}: PaystackPaymentProps) {
  const config = {
    reference: `contrib_${user?.id?.slice(0, 8)}_${Date.now()}`,
    email: user?.email || '',
    amount: Math.round(parseFloat(amount) * 100),
    publicKey: paystackKey,
  };

  const initializePayment = usePaystackPayment(config);
  
  // We expose the initialize function via a ref so the parent can call it
  // This is a bit hacky but avoids rendering a button here if we want to keep the parent UI
  if (initializeRef) {
    initializeRef.current = (successCb: any, closeCb: any) => {
      initializePayment({ onSuccess: successCb || onSuccess, onClose: closeCb || onClose });
    };
  }

  return null; // This component doesn't render anything
}
