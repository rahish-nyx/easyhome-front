import { useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  BadgeCheck,
  BriefcaseBusiness,
  CalendarCheck,
  CheckCircle2,
  Crown,
  Gift,
  Headphones,
  Home,
  MapPin,
  Pencil,
  Plus,
  Shield,
  ShieldCheck,
  Smartphone,
  Trash2,
  UserRound,
  Wallet,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { useLiveQuery } from "../hooks/useLive";
import { qBookingsForCustomer } from "../lib/queries";
import { api } from "../lib/api";
import { compressImage } from "../lib/image";
import {
  daysLeft,
  formatDate,
  isActiveUntil,
  planLabel,
} from "../lib/format";
import { usePageMeta } from "../lib/usePageMeta";
import {
  Avatar,
  Badge,
  Button,
  Card,
  Divider,
  EmptyState,
  Field,
  Input,
  ListRow,
  Modal,
  Select,
  Spinner,
} from "../components/ui";
import { InstallCard } from "../components/common";

export default function Profile() {
  usePageMeta("My profile", "Manage your EasyHome account, addresses and membership.");

  const {
    profile,
    user,
    isAdmin,
    isWorker,
    isPremium,
    premiumUntil,
    emailVerified,
    resendVerification,
    refreshProfile,
    logout,
  } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resending, setResending] = useState(false);
  const [addressModal, setAddressModal] = useState(null);

  const [name, setName] = useState(profile?.name || "");
  const [phone, setPhone] = useState(profile?.phone || "");
  const [city, setCity] = useState(profile?.city || "");

  const bookingsQuery = useMemo(
    () => (user ? qBookingsForCustomer(user.uid) : null),
    [user],
  );
  const { data: bookings } = useLiveQuery(bookingsQuery);

  const completed = bookings.filter((booking) => booking.status === "completed").length;
  const active = bookings.filter((booking) =>
    ["pending", "accepted", "ongoing"].includes(booking.status),
  ).length;
  const addresses = profile?.addresses || [];

  const uploadAvatar = async (file) => {
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      toast.error("Choose an image under 4 MB.");
      return;
    }
    setUploading(true);
    try {
      const compressed = await compressImage(file, { maxSize: 1024, quality: 0.82 });
      if (compressed.size > 4 * 1024 * 1024) {
        throw new Error("That image is still too large after compression. Try a smaller photo.");
      }
      const form = new FormData();
      form.append("image", compressed, compressed.name);
      await api.upload("/auth/avatar", form);
      await refreshProfile();
      toast.success("Profile photo updated.");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    if (name.trim().length < 2) {
      toast.error("Enter your full name.");
      return;
    }
    if (phone && !/^[6-9]\d{9}$/.test(phone)) {
      toast.error("Enter a valid 10-digit Indian mobile number.");
      return;
    }
    setSaving(true);
    try {
      await api.patch("/auth/me", {
        name: name.trim(),
        ...(phone ? { phone } : {}),
        city: city.trim(),
      });
      await refreshProfile();
      toast.success("Profile saved.");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const saveAddresses = async (next) => {
    try {
      await api.patch("/auth/me", {
        addresses: next.map(({ id, ...rest }) => ({ ...rest, ...(id ? { id } : {}) })),
      });
      await refreshProfile();
      toast.success("Addresses updated.");
    } catch (error) {
      toast.error(error.message);
    }
  };

  const resend = async () => {
    setResending(true);
    try {
      await resendVerification();
      toast.success("Verification email sent.");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <p className="eyebrow">Account</p>
          <h1>My profile</h1>
          <p>Keep your contact details and saved addresses up to date.</p>
        </div>
        <Link to="/bookings" className="btn btn--outline btn--sm">
          <CalendarCheck size={15} /> My bookings
        </Link>
      </div>

      <div className="profile-layout">
        <div className="stack">
          <div className="card profile-card">
            <div className="profile-card__avatar">
              <Avatar name={profile?.name} path={profile?.photoPath} size={92} ring={isPremium} />
              <button
                type="button"
                className="profile-card__edit"
                onClick={() => fileRef.current?.click()}
                aria-label="Upload profile photo"
                disabled={uploading}
              >
                {uploading ? <Spinner size={14} /> : <Pencil size={14} />}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(event) => uploadAvatar(event.target.files?.[0])}
              />
            </div>
            <h2>{profile?.name || "EasyHome member"}</h2>
            <p className="profile-card__email">{profile?.email || user?.email}</p>

            <div className="profile-card__badges">
              {emailVerified ? (
                <Badge tone="green">
                  <BadgeCheck size={11} /> Verified email
                </Badge>
              ) : (
                <Badge tone="amber">Email unverified</Badge>
              )}
              {isPremium ? (
                <Badge tone="yellow">
                  <Crown size={11} /> Verified Pro
                </Badge>
              ) : null}
              {isWorker ? <Badge tone="blue">EasyHome Pro</Badge> : null}
              {profile?.disabled ? <Badge tone="red">Account restricted</Badge> : null}
            </div>

            <div className="profile-card__stats">
              <div className="profile-card__stat">
                <strong>{active}</strong>
                <small>Active</small>
              </div>
              <div className="profile-card__stat">
                <strong>{completed}</strong>
                <small>Completed</small>
              </div>
              <div className="profile-card__stat">
                <strong>{addresses.length}</strong>
                <small>Addresses</small>
              </div>
            </div>

            {isPremium ? (
              <div style={{ marginTop: 16 }}>
                <Badge tone="yellow">
                  <Crown size={11} /> {daysLeft(premiumUntil)} days of Pro left
                </Badge>
              </div>
            ) : (
              <Link
                to="/subscription"
                className="btn btn--primary btn--sm"
                style={{ marginTop: 16, width: "100%" }}
              >
                <Crown size={15} /> Upgrade to Pro
              </Link>
            )}

            <p className="tiny muted" style={{ marginTop: 10 }}>
              Member since {formatDate(profile?.createdAt)}
            </p>
          </div>

          <InstallCard />

          <Card className="profile-section">
            <div className="profile-section__head">
              <h3>Quick links</h3>
            </div>
            <div className="stack stack--sm">
              <ListRow
                icon={CalendarCheck}
                title="My bookings"
                subtitle="Track visits and payments"
                onClick={() => navigate("/bookings")}
              />
              <ListRow
                icon={Crown}
                title="Membership"
                subtitle={isPremium ? "Manage your Pro plan" : "Priority pros, better prices"}
                onClick={() => navigate("/subscription")}
              />
              <ListRow
                icon={Headphones}
                title="Help & support"
                subtitle="Chat with the EasyHome team"
                onClick={() => navigate("/chat")}
              />
              {isWorker ? (
                <ListRow
                  icon={BriefcaseBusiness}
                  title="Worker dashboard"
                  subtitle="Jobs, earnings and availability"
                  onClick={() => navigate("/worker")}
                />
              ) : (
                <ListRow
                  icon={BriefcaseBusiness}
                  title="Become a pro"
                  subtitle="Earn on your own schedule"
                  onClick={() => navigate("/auth?role=worker")}
                />
              )}
              {isAdmin ? (
                <ListRow
                  icon={Shield}
                  title="Admin console"
                  subtitle="Operations, revenue and approvals"
                  onClick={() => navigate("/admin")}
                />
              ) : null}
            </div>
          </Card>

          <Button
            variant="ghost"
            className="btn--block"
            onClick={async () => {
              await logout();
              navigate("/");
            }}
          >
            Sign out
          </Button>
        </div>

        <div className="stack">
          <Card className="profile-section">
            <div className="profile-section__head">
              <h3>Personal information</h3>
              {emailVerified ? (
                <Badge tone="green">
                  <CheckCircle2 size={11} /> Verified
                </Badge>
              ) : (
                <Button size="sm" variant="outline" loading={resending} onClick={resend}>
                  Verify email
                </Button>
              )}
            </div>

            <form onSubmit={saveProfile} className="stack">
              <div className="form-grid">
                <Field label="Full name" htmlFor="profile-name" required>
                  <Input
                    id="profile-name"
                    value={name}
                    maxLength={80}
                    onChange={(event) => setName(event.target.value)}
                  />
                </Field>
                <Field label="Mobile number" htmlFor="profile-phone" hint="Shown only to your assigned pro.">
                  <Input
                    id="profile-phone"
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    value={phone}
                    onChange={(event) =>
                      setPhone(event.target.value.replace(/\D/g, "").slice(0, 10))
                    }
                  />
                </Field>
                <Field label="City" htmlFor="profile-city">
                  <Input
                    id="profile-city"
                    value={city}
                    maxLength={80}
                    onChange={(event) => setCity(event.target.value)}
                    placeholder="e.g. Bengaluru"
                  />
                </Field>
                <Field label="Email" htmlFor="profile-email" hint="Contact support to change your login email.">
                  <Input id="profile-email" value={profile?.email || user?.email || ""} disabled />
                </Field>
              </div>
              <div className="row" style={{ justifyContent: "flex-end" }}>
                <Button type="submit" loading={saving}>
                  Save details
                </Button>
              </div>
            </form>

            {!emailVerified ? (
              <div className="auth-note">
                Verify <strong>{user?.email}</strong> to create bookings and receive job
                updates. Check spam if you do not see the message.
              </div>
            ) : null}
          </Card>

          <Card className="profile-section">
            <div className="profile-section__head">
              <h3>Saved addresses</h3>
              {addresses.length < 5 ? (
                <Button
                  size="sm"
                  variant="outline"
                  icon={Plus}
                  onClick={() => setAddressModal({ mode: "add" })}
                >
                  Add
                </Button>
              ) : (
                <span className="tiny muted">Limit 5</span>
              )}
            </div>

            {addresses.length ? (
              <div className="stack stack--sm">
                {addresses.map((address) => (
                  <div className="address-card" key={address.id}>
                    <span className="address-card__icon">
                      {address.label === "Work" ? <BriefcaseBusiness size={17} /> : <Home size={17} />}
                    </span>
                    <div className="address-card__copy">
                      <strong>
                        {address.label || "Home"}
                        {address.pincode ? <span className="tiny muted">· {address.pincode}</span> : null}
                      </strong>
                      <p>
                        {address.line}
                        {address.area ? `, ${address.area}` : ""}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="icon-btn icon-btn--sm"
                      aria-label="Edit address"
                      onClick={() => setAddressModal({ mode: "edit", address })}
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      type="button"
                      className="icon-btn icon-btn--sm"
                      aria-label="Delete address"
                      onClick={() => saveAddresses(addresses.filter((item) => item.id !== address.id))}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={MapPin}
                title="No saved addresses"
                body="Add home and work addresses for faster booking."
                action={
                  <Button size="sm" onClick={() => setAddressModal({ mode: "add" })}>
                    Add an address
                  </Button>
                }
              />
            )}
          </Card>

          <Card className="profile-section">
            <div className="profile-section__head">
              <h3>Membership & billing</h3>
              <Link to="/subscription" className="btn btn--ghost btn--sm">
                Manage
              </Link>
            </div>
            <div
              className="row row--between"
              style={{ flexWrap: "wrap", gap: 12, padding: "12px 0" }}
            >
              <div className="row" style={{ gap: 10 }}>
                <span className="stat__icon">
                  <Wallet size={18} />
                </span>
                <div>
                  <strong style={{ fontSize: 13.5 }}>
                    {isActiveUntil(profile?.subscription?.endAt)
                      ? `${planLabel(profile?.subscription?.plan)} active`
                      : profile?.subscription?.status === "pending"
                        ? "Payment under review"
                        : "Free account"}
                  </strong>
                  <p className="tiny muted">
                    {isActiveUntil(profile?.subscription?.endAt)
                      ? `Ends ${formatDate(profile.subscription.endAt)}`
                      : "Upgrade for active priority matching, no 10% urgent-job extra charge and 24×7 priority support."}
                  </p>
                </div>
              </div>
              {!isPremium ? (
                <Link to="/subscription" className="btn btn--primary btn--sm">
                  <Crown size={14} /> Go Pro
                </Link>
              ) : null}
            </div>

            <Divider />

            <div className="row row--between" style={{ flexWrap: "wrap", gap: 12 }}>
              <div className="row" style={{ gap: 10 }}>
                <span className="stat__icon">
                  <Gift size={18} />
                </span>
                <div>
                  <strong style={{ fontSize: 13.5 }}>Refer &amp; Earn</strong>
                  <p className="tiny muted">
                    Share your code. You and your friend can each get ₹51 approved after their first service.
                  </p>
                </div>
              </div>
              <Link to="/refer" className="btn btn--outline btn--sm">
                View referrals
              </Link>
            </div>

            <Divider />

            <div className="row row--between" style={{ flexWrap: "wrap", gap: 12 }}>
              <div className="row" style={{ gap: 10 }}>
                <span className="stat__icon">
                  <ShieldCheck size={18} />
                </span>
                <div>
                  <strong style={{ fontSize: 13.5 }}>Account & privacy</strong>
                  <p className="tiny muted">Your phone is shared only after price confirmation.</p>
                </div>
              </div>
              <Link to="/legal/privacy" className="btn btn--outline btn--sm">
                Privacy policy
              </Link>
            </div>

            <Divider />

            <div className="row row--between" style={{ flexWrap: "wrap", gap: 12 }}>
              <div className="row" style={{ gap: 10 }}>
                <span className="stat__icon">
                  <Smartphone size={18} />
                </span>
                <div>
                  <strong style={{ fontSize: 13.5 }}>Notifications</strong>
                  <p className="tiny muted">Booking updates arrive in-app and by email.</p>
                </div>
              </div>
              <Badge tone="green" dot>
                Enabled
              </Badge>
            </div>
          </Card>
        </div>
      </div>

      <AddressModal
        state={addressModal}
        onClose={() => setAddressModal(null)}
        onSave={async (address) => {
          const exists = addresses.some((item) => item.id === address.id);
          const next = exists
            ? addresses.map((item) => (item.id === address.id ? address : item))
            : [...addresses, address];
          await saveAddresses(next);
          setAddressModal(null);
        }}
        count={addresses.length}
      />
    </div>
  );
}

function AddressModal({ state, onClose, onSave, count }) {
  const open = Boolean(state);
  const editing = state?.mode === "edit";
  const initial = state?.address || {
    label: "Home",
    line: "",
    area: "",
    pincode: "",
  };
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);

  // Reset form when a different address is opened.
  const key = `${state?.mode || "closed"}-${initial.id || ""}`;
  const [lastKey, setLastKey] = useState(key);
  if (key !== lastKey) {
    setLastKey(key);
    setForm(initial);
  }

  const set = (field) => (event) => setForm((prev) => ({ ...prev, [field]: event.target.value }));

  const capture = async () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        });
      });
      setForm((prev) => ({
        ...prev,
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      }));
    } catch {
      /* user can still save without coordinates */
    } finally {
      setLocating(false);
    }
  };

  const submit = async () => {
    if (form.line.trim().length < 3) return;
    if (form.pincode && !/^\d{6}$/.test(form.pincode)) return;
    setSaving(true);
    try {
      await onSave({
        ...form,
        id: form.id || `addr_${Date.now().toString(36)}`,
        line: form.line.trim(),
        area: form.area.trim(),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? "Edit address" : "Add an address"}
      subtitle={`${count} of 5 saved`}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={saving} onClick={submit} disabled={form.line.trim().length < 3}>
            Save address
          </Button>
        </>
      }
    >
      <div className="stack">
        <div className="form-grid">
          <Field label="Label" htmlFor="addr-label">
            <Select id="addr-label" value={form.label} onChange={set("label")}>
              <option value="Home">Home</option>
              <option value="Work">Work</option>
              <option value="Other">Other</option>
            </Select>
          </Field>
          <Field label="Pincode" htmlFor="addr-pin">
            <Input
              id="addr-pin"
              inputMode="numeric"
              maxLength={6}
              value={form.pincode}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  pincode: event.target.value.replace(/\D/g, "").slice(0, 6),
                }))
              }
              placeholder="560001"
            />
          </Field>
          <Field label="Address" htmlFor="addr-line" required className="span-2">
            <Input
              id="addr-line"
              value={form.line}
              maxLength={200}
              onChange={set("line")}
              placeholder="Flat / house, building, street"
            />
          </Field>
          <Field label="Area / locality" htmlFor="addr-area" className="span-2">
            <Input
              id="addr-area"
              value={form.area}
              maxLength={80}
              onChange={set("area")}
              placeholder="Indiranagar"
            />
          </Field>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          loading={locating}
          onClick={capture}
          icon={MapPin}
        >
          {form.lat ? "Location pinned" : "Pin precise location"}
        </Button>
      </div>
    </Modal>
  );
}
