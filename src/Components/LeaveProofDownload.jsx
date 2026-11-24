import { useState } from "react";
import { Download } from "lucide-react";
import { downloadLeaveProof } from "../lib/api";

export default function LeaveProofDownload({ entry }) {
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  if (!entry.proof_name) return null;
  const download = async () => {
    setBusy(true); setError("");
    try {
      const blob = await downloadLeaveProof(entry.id);
      const url = URL.createObjectURL(blob), link = document.createElement("a");
      link.href = url; link.download = entry.proof_name; document.body.appendChild(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (failure) { setError(failure.message || "Unable to download attachment."); }
    finally { setBusy(false); }
  };
  return <div className="leave-proof-download"><button type="button" className="filter-btn" disabled={busy} onClick={download}><Download size={14}/>{busy ? "Downloading…" : entry.proof_name}</button>{error && <p role="alert">{error}</p>}</div>;
}
