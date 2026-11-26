import React, { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';

/** Live PayPal app client id. Public by design (used by the SDK in the browser). */
const DEFAULT_CLIENT_ID =
  'BAAlH7lAs3DQ36DjLjy2a2jPiZZtt2PtO_77CkLZII4xA0gHj5lrv8dUARtnvHqIG_dcG1Nq0jDVU988q0';
const CLIENT_ID =
  (import.meta.env.VITE_PAYPAL_CLIENT_ID as string | undefined)?.trim() || DEFAULT_CLIENT_ID;

interface PayPalSubscriptionActions {
  subscription: { create: (options: { plan_id: string }) => Promise<string> };
}
interface PayPalButtonsInstance {
  render: (target: HTMLElement | string) => Promise<void>;
}
interface PayPalSDK {
  Buttons: (config: {
    style: { shape: string; color: string; layout: string; label: string };
    createSubscription: (data: unknown, actions: PayPalSubscriptionActions) => Promise<string>;
    onApprove: (data: { subscriptionID?: string }) => Promise<void> | void;
    onError: () => void;
  }) => PayPalButtonsInstance;
}

declare global {
  interface Window {
    paypal?: PayPalSDK;
  }
}

let sdkPromise: Promise<void> | null = null;
function loadPayPalSdk(): Promise<void> {
  if (window.paypal) return Promise.resolve();
  if (sdkPromise) return sdkPromise;
  sdkPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(
      CLIENT_ID
    )}&vault=true&intent=subscription`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('PayPal SDK failed to load'));
    document.head.appendChild(script);
  });
  return sdkPromise;
}

interface Props {
  planId: string;
  planKey: string;
  email: string;
  onSuccess: () => void;
  onError: (message: string) => void;
}

/**
 * Renders the official PayPal Subscribe button for a chosen plan. On approval
 * the subscription id is verified server-side via /api/billing/paypal/confirm,
 * which writes the entitlement and credits referrals.
 */
export const PayPalSubscribeButton: React.FC<Props> = ({
  planId,
  planKey,
  email,
  onSuccess,
  onError,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    onSuccessRef.current = onSuccess;
    onErrorRef.current = onError;
  }, [onSuccess, onError]);

  useEffect(() => {
    let cancelled = false;
    loadPayPalSdk()
      .then(() => {
        if (!cancelled) {
          setReady(true);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLoading(false);
          onErrorRef.current('Could not load PayPal checkout. Please try again.');
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready || !planId || !containerRef.current || !window.paypal) return;
    const container = containerRef.current;
    container.innerHTML = '';
    try {
      window.paypal
        .Buttons({
          style: { shape: 'rect', color: 'gold', layout: 'vertical', label: 'subscribe' },
          createSubscription: (_data, actions) =>
            actions.subscription.create({ plan_id: planId }),
          onApprove: async (data) => {
            if (!data.subscriptionID) {
              onErrorRef.current('PayPal did not return a subscription id. Please try again.');
              return;
            }
            try {
              const res = await fetch('/api/billing/paypal/confirm', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  subscriptionId: data.subscriptionID,
                  email,
                  planKey,
                }),
              });
              const json = await res.json();
              if (!res.ok || json?.success === false) {
                onErrorRef.current(
                  json?.error || 'We could not confirm your subscription. Please contact support.'
                );
                return;
              }
              onSuccessRef.current();
            } catch {
              onErrorRef.current(
                'Could not confirm your subscription. Check your connection and try again.'
              );
            }
          },
          onError: () =>
            onErrorRef.current('PayPal could not complete the subscription. Please try again.'),
        })
        .render(container);
    } catch {
      onErrorRef.current('Could not render PayPal checkout. Please try again.');
    }
    return () => {
      container.innerHTML = '';
    };
  }, [ready, planId, planKey, email]);

  if (!planId) {
    return <p className="text-xs text-rose-300">This plan is not configured yet.</p>;
  }

  return (
    <div className="mt-4">
      {loading && (
        <p className="flex items-center gap-2 text-xs text-slate-400 mb-2">
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading PayPal checkout…
        </p>
      )}
      <div ref={containerRef} />
    </div>
  );
};
