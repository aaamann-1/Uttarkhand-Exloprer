import SmartImage from "../../components/SmartImage";
import { prepareImage } from "../../utils/images";
import { isSupabaseConfigured, uploadImage } from "../../services/supabase";
import { useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";

export default function ImageUploadBox({ value, onChange, label = "Main Image", hint = "Recommended size 1200x800px", required = false, storageFolder = "content" }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const handleFile = async (file) => {
    if (!file) return;
    setError("");
    if (!file.type.startsWith("image/")) {
      setError("Choose an image file.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("Images must be 10 MB or smaller.");
      return;
    }
    setUploading(true);
    try {
      const image = isSupabaseConfigured
        ? await uploadImage(file, storageFolder)
        : await prepareImage(file);
      onChange(image);
    } catch (err) {
      setError(err.message || "Image upload failed. Please try again.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div>
      {label && (
        <p className="block text-mist-300 font-body text-sm mb-2">
          {label}
          {required && <span className="text-gold-400 ml-0.5" aria-hidden="true">*</span>}
        </p>
      )}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFile(e.dataTransfer.files?.[0]);
        }}
        onClick={() => !uploading && inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        role="button"
        tabIndex={0}
        aria-label={value ? `Change ${label || "image"}` : `Upload ${label || "image"}`}
        className={`relative rounded-xl border-2 border-dashed cursor-pointer overflow-hidden flex flex-col items-center justify-center text-center py-8 px-4 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-moss-500/70 ${
          dragging ? "border-moss-400 bg-moss-500/5" : "border-white/10 bg-ink-800 hover:border-white/20"
        }`}
      >
        {value ? (
          <>
            <SmartImage src={value} alt="" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-ink-950/50" />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange(null);
              }}
              className="absolute top-2 right-2 h-7 w-7 rounded-full bg-ink-950/80 text-mist-100 flex items-center justify-center z-10"
              aria-label="Remove image"
            >
              <X size={14} />
            </button>
            <span className="relative z-[1] text-mist-100 text-xs font-body font-semibold bg-ink-950/70 px-3 py-1.5 rounded-full">
              Click to change
            </span>
          </>
        ) : (
          <>
            <ImagePlus size={22} className="text-mist-400 mb-2" />
            <p className="text-mist-300 text-sm font-body">{uploading ? "Uploading…" : "Click to upload or drag and drop"}</p>
            {hint && <p className="text-mist-400 text-xs font-body mt-1">({hint})</p>}
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </div>
      {uploading && <p className="mt-2 text-mist-400 text-xs font-body" role="status">Uploading image…</p>}
      {error && <p className="mt-2 text-rose-300 text-xs font-body" role="alert">{error}</p>}
    </div>
  );
}
