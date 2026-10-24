let checkoutPromise = null;

export function loadRazorpayCheckout() {
  if (typeof window === "undefined") return Promise.reject(new Error("Browser only"));
  if (window.Razorpay) return Promise.resolve(window.Razorpay);
  if (checkoutPromise) return checkoutPromise;
  checkoutPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(window.Razorpay);
    script.onerror = () => {
      checkoutPromise = null;
      reject(new Error("Could not load the secure checkout. Check your connection."));
    };
    document.body.appendChild(script);
  });
  return checkoutPromise;
}
