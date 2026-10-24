import { useState } from "react";
import { CheckCircle2, LockKeyhole, ShieldCheck } from "lucide-react";
import { Button } from "./ui";
import { api } from "../lib/api";
import { inr } from "../lib/format";
import { loadRazorpayCheckout } from "../lib/razorpay";
import "../styles/razorpay-payment.css";

/**
 * Opens Razorpay Checkout, then verifies the signature on the server before
 * granting membership or clearing commission dues. Card/UPI details never
 * touch EasyHome's frontend or backend.
 */
export default function RazorpayPayment({
  amount,
  description,
  orderEndpoint,
  verifyEndpoint,
  orderBody,
  verifyBody = {},
  onSuccess,
  disabled = false,
  buttonLabel,
}) {
  const [busy, setBusy] = useState(false);
  const [paid, setPaid] = useState(false);
  const [error, setError] = useState("");

  const pay = async () => {
    if (busy || disabled) return;
    setBusy(true);
    setError("");
    try {
      const order = await api.post(orderEndpoint, orderBody);
      const Razorpay = await loadRazorpayCheckout();

      await new Promise((resolve, reject) => {
        const checkout = new Razorpay({
          key: order.keyId,
          amount: order.amount,
          currency: order.currency || "INR",
          order_id: order.orderId,
          name: order.name || "EasyHome",
          description: order.description || description,
          prefill: order.prefill || {},
          theme: { color: "#ffd60a" },
          handler: async (response) => {
            try {
              const verified = await api.post(verifyEndpoint, {
                ...response,
                ...verifyBody,
              });
              setPaid(true);
              try {
                await onSuccess?.(verified, order);
              } catch {
                // Fulfilment already succeeded; a refresh failure must not
                // make the customer think the payment failed.
              }
              resolve();
            } catch (verifyError) {
              setError(verifyError.message);
              reject(verifyError);
            }
          },
          modal: {
            ondismiss: () => resolve(),
          },
        });
        checkout.on("payment.failed", (response) => {
          setError(
            response?.error?.description ||
              "The payment could not be completed. No money was charged.",
          );
          resolve();
        });
        checkout.open();
      });
    } catch (payError) {
      setError(payError.message);
    } finally {
      setBusy(false);
    }
  };

  if (paid) {
    return (
      <div className="rzp-pay rzp-pay--success">
        <CheckCircle2 size={22} />
        <div>
          <strong>Payment successful</strong>
          <p>Your payment was verified automatically. Nothing else is needed.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rzp-pay">
      <div className="rzp-pay__summary">
        <div>
          <span>Amount</span>
          <strong>{inr(amount)}</strong>
        </div>
        <span className="rzp-pay__badge">
          <LockKeyhole size={12} /> Razorpay secured
        </span>
      </div>

      <p className="rzp-pay__copy">
        Pay securely with UPI, cards, net banking or wallets. Activation is automatic —
        no UTR or admin approval needed.
      </p>

      {error ? <p className="rzp-pay__error">{error}</p> : null}

      <Button
        className="btn--block"
        size="lg"
        loading={busy}
        disabled={disabled}
        onClick={pay}
        icon={ShieldCheck}
      >
        {busy ? "Opening secure checkout…" : buttonLabel || `Pay ${inr(amount)} securely`}
      </Button>

      <p className="rzp-pay__safe">
        <LockKeyhole size={12} />
        EasyHome never stores your card or UPI credentials.
      </p>
    </div>
  );
}
