import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  BellRing,
  CheckCircle2,
  Clock3,
  MapPin,
  Navigation,
  Phone,
  Radio,
  ShieldAlert,
  Volume2,
} from "lucide-react";
import { api } from "../lib/api";
import { INACTIVITY_MS, trackingMeta } from "../lib/constants";
import { formatDateTime } from "../lib/format";
import "../styles/worker-tracking.css";

function toDate(value) {
  if (!value) return null;
  if (typeof value.toDate === "function") return value.toDate();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function lastActivity(job) {
  return (
    toDate(job?.lastUpdatedTimestamp) ||
    toDate(job?.lastLocationAt) ||
    toDate(job?.acceptedAt) ||
    toDate(job?.createdAt)
  );
}

function phaseOf(job) {
  if (job?.trackingPhase) return job.trackingPhase;
  if (job?.status === "ongoing") return "working";
  if (job?.status === "accepted") return "assigned";
  if (job?.status === "completed") return "completed";
  return "";
}

/** Broadcasts the worker's GPS to the active job every ~25 seconds. */
export function useGpsBroadcast(activeJobs = []) {
  const job = activeJobs.find(
    (item) => item.activeJob !== false && ["accepted", "ongoing"].includes(item.status),
  );
  const [state, setState] = useState({
    status: "idle",
    error: "",
    lastSentAt: null,
    lat: null,
    lng: null,
  });
  const lastSentRef = useRef(0);
  const lastPointRef = useRef(null);
  const jobIdRef = useRef("");

  useEffect(() => {
    if (jobIdRef.current !== (job?.id || "")) {
      jobIdRef.current = job?.id || "";
      lastSentRef.current = 0;
      lastPointRef.current = null;
    }
    if (!job?.id) {
      setState((current) =>
        current.status === "idle" ? current : { ...current, status: "idle" },
      );
      return;
    }
    if (!navigator.geolocation) {
      setState((current) => ({
        ...current,
        status: "unavailable",
        error: "GPS is not available on this device.",
      }));
      return;
    }

    setState((current) => ({ ...current, status: "starting", error: "" }));
    let active = true;

    const send = (position) => {
      if (!active) return;
      const { latitude, longitude, accuracy, heading, speed } = position.coords;
      const now = Date.now();
      const moved =
        lastPointRef.current === null ||
        Math.abs(lastPointRef.current.lat - latitude) > 0.00015 ||
        Math.abs(lastPointRef.current.lng - longitude) > 0.00015;
      if (lastSentRef.current && now - lastSentRef.current < 22_000 && !moved) return;
      lastSentRef.current = now;
      lastPointRef.current = { lat: latitude, lng: longitude };
      api
        .patch(`/worker/jobs/${job.id}/location`, {
          lat: latitude,
          lng: longitude,
          accuracy: Math.round(accuracy || 0),
          heading: Number.isFinite(Number(heading)) ? Number(heading) : null,
          speed: Number.isFinite(Number(speed)) ? Number(speed) : null,
        })
        .then(() => {
          if (!active) return;
          setState({
            status: "sharing",
            error: "",
            lastSentAt: new Date().toISOString(),
            lat: latitude,
            lng: longitude,
          });
        })
        .catch((error) => {
          if (!active) return;
          setState((current) => ({
            ...current,
            status: "retrying",
            error: error.message || "Could not send GPS.",
          }));
        });
    };

    const watchId = navigator.geolocation.watchPosition(
      send,
      (error) => {
        if (!active) return;
        setState((current) => ({
          ...current,
          status: error.code === 1 ? "denied" : "unavailable",
          error:
            error.code === 1
              ? "Location permission is blocked. Enable it to keep customers updated."
              : "GPS signal is weak. Move near a window or outdoors.",
        }));
      },
      {
        enableHighAccuracy: true,
        maximumAge: 15_000,
        timeout: 20_000,
      },
    );

    return () => {
      active = false;
      navigator.geolocation.clearWatch(watchId);
    };
  }, [job?.id, job?.status]);

  const sendNow = useCallback(() => {
    if (!job?.id || !navigator.geolocation) return;
    setState((current) => ({ ...current, status: "locating" }));
    navigator.geolocation.getCurrentPosition(
      (position) => {
        lastSentRef.current = 0;
        const { latitude, longitude, accuracy, heading, speed } = position.coords;
        lastSentRef.current = Date.now();
        lastPointRef.current = { lat: latitude, lng: longitude };
        api
          .patch(`/worker/jobs/${job.id}/location`, {
            lat: latitude,
            lng: longitude,
            accuracy: Math.round(accuracy || 0),
            heading: Number.isFinite(Number(heading)) ? Number(heading) : null,
            speed: Number.isFinite(Number(speed)) ? Number(speed) : null,
          })
          .then(() => {
            setState({
              status: "sharing",
              error: "",
              lastSentAt: new Date().toISOString(),
              lat: latitude,
              lng: longitude,
            });
          })
          .catch((error) => {
            setState((current) => ({
              ...current,
              status: "retrying",
              error: error.message || "Could not send GPS.",
            }));
          });
      },
      (error) => {
        setState((current) => ({
          ...current,
          status: error.code === 1 ? "denied" : "unavailable",
          error:
            error.code === 1
              ? "Location permission is blocked. Enable it to keep customers updated."
              : "GPS signal is weak. Try again outdoors.",
        }));
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 5_000 },
    );
  }, [job?.id]);

  return { ...state, jobId: job?.id || "", sendNow };
}

/** Detects a job that has not had a status or GPS update for ten minutes. */
export function useTrackingAlert(activeJobs = []) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 15_000);
    return () => window.clearInterval(timer);
  }, []);

  const alerts = useMemo(
    () =>
      activeJobs
        .map((job) => {
          const last = lastActivity(job);
          const idleMinutes = last
            ? Math.max(0, Math.floor((now - last.getTime()) / 60000))
            : 0;
          const stale = Boolean(last && now - last.getTime() >= INACTIVITY_MS);
          return {
            job,
            last,
            idleMinutes,
            stale,
            alert: Boolean(job.trackingAlert) || stale,
          };
        })
        .filter((item) => item.alert)
        .sort((a, b) => b.idleMinutes - a.idleMinutes),
    [activeJobs, now],
  );

  return alerts[0] || null;
}

export function TrackingBuzzer({
  alert,
  gps,
  supportPhone = "",
  onUpdate,
}) {
  const [muted, setMuted] = useState(false);
  const [suppressedUntil, setSuppressedUntil] = useState(0);
  const [audioReady, setAudioReady] = useState(false);
  const audioRef = useRef(null);
  const notifiedRef = useRef("");

  const beep = useCallback(() => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      if (!audioRef.current) audioRef.current = new AudioContext();
      const ctx = audioRef.current;
      if (ctx.state === "suspended") ctx.resume().catch(() => {});
      const now = ctx.currentTime;
      [0, 0.22, 0.44].forEach((offset, index) => {
        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();
        oscillator.type = "square";
        oscillator.frequency.value = index === 2 ? 1040 : 830;
        gain.gain.setValueAtTime(0.0001, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.18, now + offset + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.14);
        oscillator.connect(gain);
        gain.connect(ctx.destination);
        oscillator.start(now + offset);
        oscillator.stop(now + offset + 0.16);
      });
      setAudioReady(true);
    } catch {
      setAudioReady(false);
    }
  }, []);

  const alertKey = alert?.job?.id || "";
  const suppressed = suppressedUntil > Date.now();
  const visible = Boolean(alert) && !suppressed;

  useEffect(() => {
    setMuted(false);
    setSuppressedUntil(0);
    notifiedRef.current = "";
  }, [alertKey]);

  useEffect(() => {
    if (!visible || muted) return undefined;
    beep();
    const timer = window.setInterval(beep, 18_000);
    return () => window.clearInterval(timer);
  }, [visible, muted, beep, alert?.job?.trackingAlertAt]);

  useEffect(() => {
    if (!visible || !alert) return;
    const key = `${alert.job.id}:${alert.job.trackingAlertAt || alert.idleMinutes}`;
    if (notifiedRef.current === key) return;
    notifiedRef.current = key;
    if (typeof Notification === "undefined") return;
    const show = () => {
      try {
        new Notification("EasyHome: status update required", {
          body: `Please update your status for ${alert.job.service} at ${alert.job.area}.`,
          tag: `tracking-${alert.job.id}`,
          requireInteraction: true,
        });
      } catch {
        /* notification permission or platform may block this */
      }
    };
    if (Notification.permission === "granted") show();
    else if (Notification.permission !== "denied") {
      Notification.requestPermission().then((permission) => {
        if (permission === "granted") show();
      });
    }
  }, [visible, alert]);

  if (!alert) return null;

  return (
    <div
      className={`wk-buzzer${visible ? " is-open" : ""}`}
      role="alertdialog"
      aria-modal={visible ? "true" : undefined}
      aria-labelledby="wk-buzzer-title"
    >
      <div className="wk-buzzer__card">
        <div className="wk-buzzer__pulse">
          <ShieldAlert size={30} />
          <span />
        </div>
        <p className="wk-buzzer__eyebrow">Accountability check · 10 minutes</p>
        <h2 id="wk-buzzer-title">Please update your job status</h2>
        <p className="wk-buzzer__body">
          No status or GPS update has been recorded for this active job for{" "}
          <strong>{Math.max(alert.idleMinutes, 10)} minutes</strong>. The customer and
          operations team are waiting for an update.
        </p>

        <div className="wk-buzzer__job">
          <div>
            <span>{alert.job.service}</span>
            <strong>{alert.job.customerName || "EasyHome customer"}</strong>
          </div>
          <div>
            <span>
              <MapPin size={12} /> {alert.job.area}
            </span>
            <span>
              <Clock3 size={12} /> Last update{" "}
              {alert.last ? formatDateTime(alert.last) : "not recorded"}
            </span>
          </div>
        </div>

        <div className="wk-buzzer__phase">
          <span className={`wk-status-dot wk-status-dot--${alert.job.status}`} />
          Current phase: <strong>{trackingMeta(phaseOf(alert.job)).label}</strong>
          <span className={`wk-buzzer__gps wk-buzzer__gps--${gps?.status || "idle"}`}>
            <Radio size={12} /> {gps?.status === "sharing" ? "GPS live" : "GPS not live"}
          </span>
        </div>

        {gps?.error ? <p className="wk-buzzer__gps-error">{gps.error}</p> : null}

        <div className="wk-buzzer__actions">
          <button
            type="button"
            className="wk-buzzer__btn wk-buzzer__btn--primary"
            onClick={() => {
              setSuppressedUntil(Date.now() + 90_000);
              onUpdate?.(alert.job);
            }}
          >
            <CheckCircle2 size={18} /> Update status now
          </button>
          <button
            type="button"
            className="wk-buzzer__btn"
            onClick={() => {
              setMuted((value) => !value);
              if (muted) beep();
            }}
          >
            <Volume2 size={17} /> {muted ? "Sound alarm" : "Mute alarm"}
          </button>
          {supportPhone ? (
            <a className="wk-buzzer__btn" href={`tel:${supportPhone}`}>
              <Phone size={17} /> Call support
            </a>
          ) : (
            <button
              type="button"
              className="wk-buzzer__btn"
              onClick={gps?.sendNow}
            >
              <Navigation size={17} /> Refresh GPS
            </button>
          )}
        </div>

        {!audioReady && !muted ? (
          <button type="button" className="wk-buzzer__enable" onClick={beep}>
            <BellRing size={14} /> Enable buzzer sound
          </button>
        ) : null}

        <p className="wk-buzzer__fine">
          This alert repeats until a new status or GPS heartbeat is recorded.
        </p>
      </div>
    </div>
  );
}
