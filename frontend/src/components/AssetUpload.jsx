import { useRef, useState, useEffect } from "react";
import { companyApi, assetUrl } from "@/lib/api";
import { useCompany } from "@/context/CompanyContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Upload, Trash2, ImageIcon, RefreshCw } from "lucide-react";

const MAX_SIZE = 2 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/jpg", "image/png", "image/svg+xml"];

/**
 * Reusable asset uploader for company logo / signature / stamp.
 * Handles: file picker, validation (JPG/PNG/SVG · 2 MB), live preview, save, cancel, remove.
 */
export const AssetUpload = ({ assetType, title, help, testIdPrefix, previewHeight = 160 }) => {
  const { company, refresh } = useCompany();
  const inputRef = useRef(null);
  const [pending, setPending] = useState(null);
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const currentSrc = assetUrl(company, assetType);
  const shownSrc = preview || currentSrc;

  const handleFile = (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (!ALLOWED.includes(f.type)) return toast.error("Only JPG, PNG or SVG allowed.");
    if (f.size > MAX_SIZE)
      return toast.error(`File too large (${(f.size / 1024 / 1024).toFixed(2)} MB). Max 2 MB.`);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(f));
    setPending(f);
  };

  const save = async () => {
    if (!pending) return;
    setUploading(true);
    try {
      await companyApi.uploadAsset(assetType, pending);
      toast.success(`${title} saved successfully.`);
      if (preview) URL.revokeObjectURL(preview);
      setPreview(null); setPending(null);
      await refresh();
    } catch (err) {
      toast.error(err?.response?.data?.detail || `Failed to save ${title.toLowerCase()}.`);
    } finally { setUploading(false); }
  };

  const cancel = () => {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null); setPending(null);
  };

  const remove = async () => {
    if (!company?.[assetType]) return;
    if (!window.confirm(`Remove the current ${title.toLowerCase()}?`)) return;
    try {
      await companyApi.removeAsset(assetType);
      toast.success(`${title} removed.`);
      await refresh();
    } catch { toast.error(`Failed to remove ${title.toLowerCase()}.`); }
  };

  const exists = Boolean(company?.[assetType]);

  return (
    <div data-testid={`${testIdPrefix}-card`} className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-heading text-base font-medium tracking-tight">{title}</h3>
        <span className="text-[10px] text-slate-500 uppercase tracking-widest">JPG · PNG · SVG · 2 MB</span>
      </div>
      <div
        className="relative flex items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 overflow-hidden"
        style={{ height: previewHeight }}
        data-testid={`${testIdPrefix}-preview`}
      >
        {shownSrc ? (
          <img src={shownSrc} alt={title} data-testid={`${testIdPrefix}-image`} className="max-h-[85%] max-w-[85%] object-contain" />
        ) : (
          <div className="flex flex-col items-center text-slate-400">
            <ImageIcon className="h-7 w-7" />
            <span className="mt-1 text-xs">No {title.toLowerCase()}</span>
          </div>
        )}
        {preview && (
          <div className="absolute top-2 left-2 text-[10px] tracking-[0.15em] uppercase font-semibold bg-amber-100 text-amber-800 px-2 py-1 rounded">
            Preview
          </div>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/svg+xml"
        onChange={handleFile}
        className="hidden"
        data-testid={`${testIdPrefix}-input`}
      />
      <div className="flex flex-wrap gap-2">
        {!pending ? (
          <>
            <Button type="button" size="sm" onClick={() => inputRef.current?.click()} data-testid={`${testIdPrefix}-btn`}>
              {exists ? (<><RefreshCw className="h-4 w-4" /> Replace</>) : (<><Upload className="h-4 w-4" /> Upload</>)}
            </Button>
            {exists && (
              <Button
                type="button" size="sm" variant="outline"
                onClick={remove}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                data-testid={`${testIdPrefix}-remove-btn`}
                aria-label={`Remove ${title}`}
              >
                <Trash2 className="h-4 w-4" /> Remove
              </Button>
            )}
          </>
        ) : (
          <>
            <Button type="button" size="sm" onClick={save} disabled={uploading} data-testid={`${testIdPrefix}-save-btn`}>
              {uploading ? "Saving…" : "Save"}
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={cancel} data-testid={`${testIdPrefix}-cancel-btn`}>
              Cancel
            </Button>
          </>
        )}
      </div>
      {help && <p className="text-xs text-slate-500">{help}</p>}
    </div>
  );
};
