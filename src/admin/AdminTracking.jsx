import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowUpRight,
  BellRing,
  Clock3,
  MapPin,
  Navigation,
  Phone,
  Radio,
  RefreshCw,
  Satellite,
  SearchX,
  ShieldAlert,
  Timer,
  UserRound,
  Users,
} from "lucide-react";
import { useToast } from "../context/ToastContext";
import { useAsync } from "../hooks/useAsync";
import { api } from "../lib/api";
import { distanceLabel, mapsUrl } from "../lib/geo";
import { formatDateTime, timeAgo } from "../lib/format";
import { Button } from "../components/ui";
import {
  AdminPage,
  CoverageMap,
  EmptyBlock,
  LoadingBlock,
  PageError,
  Panel,
  SearchField,
  SegTabs,
  StatCard,
  StatusPill,
} from "./adminKit";

const FILTERS = [
  { id: "all", label: "All active" },
  { id: "inactive", label: "Needs attention" },
  { id: "alerts", label: "Alerted" },
];

const PHASE_TONES = {
  assigned: "blue",
  en_route: "blue",
  arrived: "yellow",
  working: "purple",
  completed: "green",
};

function updatedAt(job) {
  return job.tracker?.lastUpdatedAt || job.lastUpdatedTimestamp || job.lastLocationAt || job.acceptedAt;
}

export default function AdminTracking() {
  const toast = useToast();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [selectedId, setSelectedId] = useState("");
  const [busy, setBusy] = useState("");

  const trackingState = useAsync(() => api.get("/admin/live-tracking"), []);
  const jobs = trackingState.data?.jobs || [];
  const stats = trackingState.data?.stats || {};

  useEffect(() => {
    const timer = window.setInterval(() => {
      trackingState.run().catch(() => {});
    }, 15_000);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!jobs.length) return;
    if (jobs.some((job) => job.id === selectedId)) return;
    setSelectedId(jobs[0].id);
  }, [jobs, selectedId]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return jobs.filter((job) => {
      if (filter === "inactive" && !job.tracker?.inactive) return false;
      if (filter === "alerts" && !job.tracker?.alert) return false;
      if (!term) return true;
      return [
        job.service,
        job.customerName,
        job.workerName,
        job.area,
        job.phaseLabel,
        job.id,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term));
    });
  }, [jobs, query, filter]);

  const selected = jobs.find((job) => job.id === selectedId) || filtered[0] || null;

  const refresh = () => trackingState.run().catch(() => {});

  const nudge = async (job) => {
    setBusy(`nudge:${job.id}`);
    try {
      await api.post(`/admin/tracking/${job.id}/nudge`);
      toast.success(`Reminder sent to ${job.workerName || "the worker"}.`);
      await refresh();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy("");
    }
  };

  const trackerPoint = selected?.tracker
    ? {
        lat: selected.tracker.currentLat,
        lng: selected.tracker.currentLng,
        name: selected.workerName || selected.area,
      }
    : null;
  const customerPoint = selected?.tracker
    ? { lat: selected.tracker.customerLat, lng: selected.tracker.customerLng }
    : null;
  const distanceMeters = Number.isFinite(Number(selected?.tracker?.distanceMeters))
    ? Number(selected.tracker.distanceMeters)
    : null;

  return (
    <AdminPage
      eyebrow="Field operations"
      title="Live field tracking"
      subtitle="Real-time worker GPS, job phase and 10-minute accountability checks across every active job."
      actions={
        <>
          <span className="adm-live-indicator">
            <i /> Auto-refresh 15s
          </span>
          <Button
            variant="outline"
            icon={RefreshCw}
            onClick={refresh}
            loading={trackingState.loading}
          >
            Refresh now
          </Button>
        </>
      }
    >
      <div className="adm-stat-grid adm-stat-grid--4">
        <StatCard
          label="Active jobs"
          value={stats.active || 0}
          hint="Workers on a live job"
          icon={Navigation}
          tone="blue"
        />
        <StatCard
          label="En route"
          value={stats.enRoute || 0}
          hint="Workers travelling to customers"
          icon={Satellite}
          tone="purple"
        />
        <StatCard
          label="On site"
          value={(stats.arrived || 0) + (stats.working || 0)}
          hint="Arrived or working now"
          icon={UserRound}
          tone="green"
        />
        <StatCard
          label="Needs attention"
          value={(stats.inactive || 0) + (stats.alerts || 0)}
          hint="No update for 10+ minutes"
          icon={AlertTriangle}
          tone={stats.inactive || stats.alerts ? "red" : "plain"}
        />
      </div>

      <PageError error={trackingState.error} onRetry={refresh} />

      <div className="adm-track-layout">
        <Panel
          title="Active field jobs"
          subtitle="Sorted with delayed and alerted jobs first."
          className="adm-track-main"
          action={
            <div className="adm-toolbar adm-toolbar--compact">
              <SegTabs
                items={FILTERS.map((item) => ({
                  ...item,
                  count:
                    item.id === "inactive"
                      ? stats.inactive || 0
                      : item.id === "alerts"
                        ? stats.alerts || 0
                        : stats.active || 0,
                }))}
                value={filter}
                onChange={setFilter}
              />
            </div>
          }
        >
          <SearchField
            value={query}
            onChange={setQuery}
            onClear={() => setQuery("")}
            placeholder="Search worker, customer, service or area…"
          />

          {trackingState.loading && !trackingState.data ? (
            <LoadingBlock label="Connecting to field tracking…" />
          ) : filtered.length ? (
            <div className="adm-track-list">
              {filtered.map((job) => {
                const tracker = job.tracker || {};
                const attention = tracker.inactive || tracker.alert;
                const age = updatedAt(job);
                return (
                  <article
                    key={job.id}
                    className={`adm-track-card${selected?.id === job.id ? " is-selected" : ""}${
                      attention ? " is-attention" : ""
                    }`}
                    onClick={() => setSelectedId(job.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setSelectedId(job.id);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="adm-track-card__top">
                      <span className={`adm-track-card__pulse${attention ? " is-alert" : ""}`}>
                        <Radio size={15} />
                      </span>
                      <div className="grow">
                        <div className="adm-track-card__title">
                          <strong>{job.service}</strong>
                          <StatusPill
                            status={job.phase}
                            label={job.phaseLabel}
                            tone={PHASE_TONES[job.phase] || "blue"}
                          />
                          {attention ? (
                            <StatusPill
                              status="alert"
                              label={tracker.inactive ? "Inactive" : "Alerted"}
                              tone="red"
                            />
                          ) : null}
                        </div>
                        <span>
                          {job.workerName || "Unassigned worker"} →{" "}
                          {job.customerName || "Customer"} · {job.area}
                        </span>
                      </div>
                      <div className="adm-track-card__eta">
                        <strong>
                          {tracker.distanceMeters !== null && tracker.distanceMeters !== undefined
                            ? distanceLabel(Number(tracker.distanceMeters) / 1000)
                            : "No GPS"}
                        </strong>
                        <span>
                          {tracker.etaMinutes !== null && tracker.etaMinutes !== undefined
                            ? `${tracker.etaMinutes} min ETA`
                            : "ETA waiting"}
                        </span>
                      </div>
                    </div>

                    <div className="adm-track-card__meta">
                      <span>
                        <Clock3 size={12} /> Updated{" "}
                        {age ? timeAgo(age) : "never"}
                      </span>
                      <span>
                        <Timer size={12} /> {tracker.idleMinutes || 0} min idle
                      </span>
                      <span className="adm-mono">
                        <MapPin size={12} />
                        {Number.isFinite(Number(tracker.currentLat))
                          ? `${Number(tracker.currentLat).toFixed(4)}, ${Number(
                              tracker.currentLng,
                            ).toFixed(4)}`
                          : "No coordinates"}
                      </span>
                      {job.workerOnline === false ? (
                        <span className="adm-track-card__offline">
                          <ShieldAlert size={12} /> Worker offline
                        </span>
                      ) : null}
                    </div>

                    {attention ? (
                      <div className="adm-track-card__alert">
                        <BellRing size={14} />
                        <span>
                          No status or GPS update for {tracker.idleMinutes || 0} minutes. Nudge
                          the worker or call to confirm.
                        </span>
                      </div>
                    ) : null}

                    <div className="adm-track-card__actions" onClick={(event) => event.stopPropagation()}>
                      <Button
                        size="sm"
                        variant="outline"
                        icon={BellRing}
                        loading={busy === `nudge:${job.id}`}
                        onClick={() => nudge(job)}
                      >
                        Nudge worker
                      </Button>
                      {job.workerPhone ? (
                        <a className="adm-icon-link" href={`tel:${job.workerPhone}`} title="Call worker">
                          <Phone size={15} />
                        </a>
                      ) : null}
                      <a
                        className="adm-icon-link"
                        href={mapsUrl(tracker.currentLat, tracker.currentLng, job.area)}
                        target="_blank"
                        rel="noreferrer"
                        title="Open worker location"
                      >
                        <Navigation size={15} />
                      </a>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <EmptyBlock
              icon={jobs.length ? SearchX : Users}
              title={
                jobs.length
                  ? filter === "inactive" || filter === "alerts"
                    ? "No jobs need attention"
                    : "No matching jobs"
                  : "No active field jobs"
              }
              body={
                jobs.length
                  ? "Try another filter or clear the search."
                  : "Assigned and ongoing jobs will appear here with live GPS."
              }
            />
          )}
        </Panel>

        <aside className="adm-track-side">
          <Panel title="Selected worker" subtitle="Live location and accountability snapshot.">
            {selected ? (
              <>
                <CoverageMap
                  center={
                    trackerPoint && Number.isFinite(Number(trackerPoint.lat))
                      ? trackerPoint
                      : customerPoint
                  }
                  radiusKm={2}
                  jobs={[]}
                />
                <div className="adm-track-side__facts">
                  <div>
                    <span>Worker</span>
                    <strong>{selected.workerName || "Unassigned"}</strong>
                  </div>
                  <div>
                    <span>Customer</span>
                    <strong>{selected.customerName || "—"}</strong>
                  </div>
                  <div>
                    <span>Phase</span>
                    <strong>{selected.phaseLabel}</strong>
                  </div>
                  <div>
                    <span>Distance</span>
                    <strong>
                      {distanceMeters !== null
                        ? distanceLabel(Number(distanceMeters) / 1000)
                        : "—"}
                    </strong>
                  </div>
                  <div>
                    <span>Last update</span>
                    <strong>
                      {updatedAt(selected)
                        ? formatDateTime(updatedAt(selected))
                        : "Never"}
                    </strong>
                  </div>
                  <div>
                    <span>Worker phone</span>
                    <strong>{selected.workerPhone || "—"}</strong>
                  </div>
                </div>

                <div className="adm-track-side__coords">
                  <div>
                    <span>Worker coordinates</span>
                    <code>
                      {Number.isFinite(Number(selected.tracker?.currentLat))
                        ? `${Number(selected.tracker.currentLat).toFixed(5)}, ${Number(
                            selected.tracker.currentLng,
                          ).toFixed(5)}`
                        : "Waiting for GPS"}
                    </code>
                  </div>
                  <div>
                    <span>Customer coordinates</span>
                    <code>
                      {Number.isFinite(Number(selected.tracker?.customerLat))
                        ? `${Number(selected.tracker.customerLat).toFixed(5)}, ${Number(
                            selected.tracker.customerLng,
                          ).toFixed(5)}`
                        : "No pinned location"}
                    </code>
                  </div>
                </div>

                <div className="adm-track-side__actions">
                  <Button
                    size="sm"
                    icon={BellRing}
                    loading={busy === `nudge:${selected.id}`}
                    onClick={() => nudge(selected)}
                  >
                    Send reminder
                  </Button>
                  <Link
                    to={`/admin/bookings?booking=${selected.id}`}
                    className="adm-view-link"
                  >
                    Open booking <ArrowUpRight size={13} />
                  </Link>
                </div>
              </>
            ) : (
              <EmptyBlock
                icon={MapPin}
                title="Select a job"
                body="Choose an active job to inspect its live location and worker snapshot."
              />
            )}
          </Panel>
        </aside>
      </div>
    </AdminPage>
  );
}
