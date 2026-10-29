import { useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  EyeOff,
  Home,
  Plus,
  RefreshCw,
  Save,
} from "lucide-react";
import { ServiceIcon } from "../components/common";
import { Button } from "../components/ui";
import {
  invalidateCatalogueCache,
  useCatalogue,
} from "../context/CatalogueContext";
import { useToast } from "../context/ToastContext";
import { useAsync } from "../hooks/useAsync";
import { api } from "../lib/api";
import { homeFolderOrder, isFolderOnHome } from "../lib/serviceGroups";
import {
  AdminPage,
  EmptyBlock,
  LoadingBlock,
  PageError,
  Panel,
  StatusPill,
} from "./adminKit";

function selectedIdsFrom(folders = []) {
  return folders
    .filter(isFolderOnHome)
    .sort(
      (a, b) =>
        homeFolderOrder(a) - homeFolderOrder(b) ||
        String(a.name || a.id).localeCompare(String(b.name || b.id)),
    )
    .map((folder) => folder.id);
}

export default function AdminHomeFolders() {
  const toast = useToast();
  const { refreshCatalogue } = useCatalogue();
  const state = useAsync(async () => {
    const data = await api.get("/admin/folders");
    return data.folders || [];
  }, []);
  const folders = useMemo(() => state.data || [], [state.data]);
  const [draftIds, setDraftIds] = useState(null);
  const [busy, setBusy] = useState(false);

  const savedIds = useMemo(() => selectedIdsFrom(folders), [folders]);
  const selectedIds = draftIds ?? savedIds;

  const updateSelected = (updater) => {
    setDraftIds((current) => {
      const base = current ?? savedIds;
      return typeof updater === "function" ? updater(base) : updater;
    });
  };

  const folderById = useMemo(
    () => new Map(folders.map((folder) => [folder.id, folder])),
    [folders],
  );
  const selectedFolders = useMemo(
    () =>
      selectedIds
        .map((id) => folderById.get(id))
        .filter(Boolean),
    [folderById, selectedIds],
  );
  const availableFolders = useMemo(
    () =>
      folders
        .filter((folder) => !selectedIds.includes(folder.id))
        .slice()
        .sort(
          (a, b) =>
            (Number(a.order) || 0) - (Number(b.order) || 0) ||
            String(a.name || a.id).localeCompare(String(b.name || b.id)),
        ),
    [folders, selectedIds],
  );
  const dirty =
    draftIds !== null &&
    selectedIds.join("\u0000") !== savedIds.join("\u0000");

  const refresh = () => {
    setDraftIds(null);
    invalidateCatalogueCache();
    return state.run().catch(() => {});
  };

  const move = (folderId, direction) => {
    updateSelected((current) => {
      const index = current.indexOf(folderId);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= current.length) {
        return current;
      }
      const next = [...current];
      next.splice(index, 1);
      next.splice(nextIndex, 0, folderId);
      return next;
    });
  };

  const save = async () => {
    if (!dirty) return;
    setBusy(true);
    try {
      const data = await api.put("/admin/folders/home", {
        folderIds: selectedIds,
      });
      const nextFolders = data.folders || [];
      const nextSelectedIds = selectedIdsFrom(nextFolders);
      state.setData(nextFolders);
      setDraftIds(null);
      // The backend drops its bootstrap cache; clear the browser copy and
      // refresh the in-memory catalogue with a cache-busted request so a
      // client-side visit to the storefront shows the result immediately.
      invalidateCatalogueCache();
      await refreshCatalogue({ bust: true });
      toast.success(
        `Home page updated${nextSelectedIds.length ? ` with ${nextSelectedIds.length} folder${nextSelectedIds.length === 1 ? "" : "s"}` : ""}.`,
      );
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  const folderMeta = (folder) => {
    const count = Number(folder.servicesCount) || 0;
    return `${count} service${count === 1 ? "" : "s"}`;
  };

  return (
    <AdminPage
      eyebrow="Public site"
      title="Home folders"
      subtitle="Choose which service folders appear on the customer and guest home page, then arrange their order. Hiding a folder here does not delete it or remove it from the full services catalogue."
      actions={
        <>
          <Button
            variant="outline"
            icon={RefreshCw}
            loading={state.loading}
            onClick={refresh}
          >
            Refresh
          </Button>
          {dirty ? (
            <Button
              variant="ghost"
              onClick={() => setDraftIds(null)}
              disabled={busy}
            >
              Discard
            </Button>
          ) : null}
          <Button
            icon={Save}
            loading={busy}
            disabled={!state.data || !dirty}
            onClick={save}
          >
            Save changes
          </Button>
        </>
      }
    >
      <PageError error={state.error} onRetry={refresh} />
      {state.loading && !state.data ? (
        <LoadingBlock label="Loading service folders…" />
      ) : (
        <div className="adm-stack">
          <Panel
            title="Home page folders"
            subtitle="These folders appear in the order shown below."
            action={
              <StatusPill
                status={dirty ? "pending" : "active"}
                label={dirty ? "Unsaved changes" : "Published"}
              />
            }
          >
            {selectedFolders.length ? (
              <div className="adm-footer-links">
                {selectedFolders.map((folder, index) => (
                  <article className="adm-footer-link" key={folder.id}>
                    <span className="adm-footer-link__order">{index + 1}</span>
                    <ServiceIcon
                      icon={folder.icon || "layers"}
                      size={34}
                      iconSize={18}
                    />
                    <div className="grow">
                      <div className="adm-approval__title">
                        <strong>{folder.name}</strong>
                        {folder.isLive === false ? (
                          <StatusPill
                            status="expired"
                            label="Not public"
                          />
                        ) : (
                          <StatusPill status="active" label="On home" />
                        )}
                      </div>
                      <span
                        className="small muted"
                        style={{ display: "block", marginTop: 4 }}
                      >
                        {folderMeta(folder)} · opens the folder’s service list
                      </span>
                    </div>
                    <div className="adm-footer-link__actions">
                      <button
                        type="button"
                        className="adm-icon-action"
                        aria-label={`Move ${folder.name} up`}
                        disabled={index === 0 || busy}
                        onClick={() => move(folder.id, -1)}
                      >
                        <ArrowUp size={15} />
                      </button>
                      <button
                        type="button"
                        className="adm-icon-action"
                        aria-label={`Move ${folder.name} down`}
                        disabled={index === selectedFolders.length - 1 || busy}
                        onClick={() => move(folder.id, 1)}
                      >
                        <ArrowDown size={15} />
                      </button>
                      <button
                        type="button"
                        className="adm-text-action is-danger"
                        aria-label={`Hide ${folder.name} from the home page`}
                        disabled={busy}
                        onClick={() =>
                          updateSelected((current) =>
                            current.filter((id) => id !== folder.id),
                          )
                        }
                      >
                        <EyeOff size={14} /> Hide
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyBlock
                icon={Home}
                title="No folders on the home page"
                body="Add folders from the list below. The home page will show a general service list until at least one folder is selected."
              />
            )}
          </Panel>

          <Panel
            title="Available folders"
            subtitle="These folders are not featured on the home page. They remain available from the full services catalogue."
          >
            {availableFolders.length ? (
              <div className="adm-footer-links">
                {availableFolders.map((folder) => (
                  <article className="adm-footer-link" key={folder.id}>
                    <ServiceIcon
                      icon={folder.icon || "layers"}
                      size={34}
                      iconSize={18}
                    />
                    <div className="grow">
                      <div className="adm-approval__title">
                        <strong>{folder.name}</strong>
                        {folder.isLive === false ? (
                          <StatusPill status="expired" label="Not public" />
                        ) : null}
                      </div>
                      <span
                        className="small muted"
                        style={{ display: "block", marginTop: 4 }}
                      >
                        {folderMeta(folder)}
                      </span>
                    </div>
                    <div className="adm-footer-link__actions">
                      <button
                        type="button"
                        className="adm-text-action"
                        aria-label={`Add ${folder.name} to the home page`}
                        disabled={busy}
                        onClick={() =>
                          updateSelected((current) => [...current, folder.id])
                        }
                      >
                        <Plus size={14} /> Add to home
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyBlock
                icon={Home}
                title="All folders are on the home page"
                body="Create another folder in Catalogue → Folders if you want more categories."
              />
            )}
          </Panel>
        </div>
      )}
    </AdminPage>
  );
}
