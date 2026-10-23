import { Link } from "react-router-dom";
import { ArrowLeft, Compass, Home, WifiOff } from "lucide-react";
import { useOnline } from "../hooks/useDevice";
import { usePageMeta } from "../lib/usePageMeta";
import { Button } from "../components/ui";
import { SearchBar } from "../components/common";

export function NotFound() {
  usePageMeta("Page not found", "The page you were looking for does not exist on EasyHome.");

  return (
    <div className="page page--narrow">
      <div className="offline-page">
        <div style={{ maxWidth: 460 }}>
          <span className="offline-page__icon">
            <Compass size={30} />
          </span>
          <p className="eyebrow">Error 404</p>
          <h1 style={{ fontSize: "clamp(28px, 5vw, 40px)" }}>This page moved out.</h1>
          <p className="muted" style={{ margin: "10px 0 22px" }}>
            The link may be old or mistyped. Start from the homepage or search for the service
            you need.
          </p>
          <div style={{ marginBottom: 18 }}>
            <SearchBar />
          </div>
          <div className="row row--wrap" style={{ justifyContent: "center" }}>
            <Link to="/" className="btn btn--primary">
              <Home size={16} /> Go home
            </Link>
            <Link to="/services" className="btn btn--outline">
              Browse services
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Offline() {
  const online = useOnline();
  usePageMeta("You are offline", "EasyHome is offline. Reconnect to continue booking and tracking jobs.");

  return (
    <div className="page page--narrow">
      <div className="offline-page">
        <div style={{ maxWidth: 440 }}>
          <span className="offline-page__icon">
            <WifiOff size={30} />
          </span>
          <p className="eyebrow">{online ? "Back online" : "No connection"}</p>
          <h1 style={{ fontSize: "clamp(28px, 5vw, 38px)" }}>
            {online ? "You are back online." : "EasyHome is offline."}
          </h1>
          <p className="muted" style={{ margin: "10px 0 22px" }}>
            {online
              ? "Your saved data is syncing. Reload to pick up the latest updates."
              : "Cached pages are still available. New bookings and live updates will resume when you reconnect."}
          </p>
          <div className="row row--wrap" style={{ justifyContent: "center" }}>
            {online ? (
              <Button onClick={() => window.location.reload()}>Reload EasyHome</Button>
            ) : (
              <Button onClick={() => window.location.reload()} icon={WifiOff}>
                Try again
              </Button>
            )}
            <Link to="/" className="btn btn--outline">
              <ArrowLeft size={15} /> Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
