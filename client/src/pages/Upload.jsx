import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { uploadFile, videoApi } from "../api/client.js";
import { useWallet } from "../context/WalletContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import EmptyState from "../components/ui/EmptyState.jsx";
import Spinner from "../components/ui/Spinner.jsx";
import "./upload.css";

export default function Upload() {
  const navigate = useNavigate();
  const { account, sponsorUpload, busy } = useWallet();
  const { success: toastSuccess, error: toastError } = useToast();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [phase, setPhase] = useState(null); // "registering" | "uploading"
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!account) setPhase(null);
  }, [account]);

  const handleFile = (selected) => {
    if (!selected) return;
    if (!selected.type.startsWith("video/")) {
      toastError("Please choose a video file");
      return;
    }
    setFile(selected);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!account) {
      toastError("Connect your wallet to upload");
      return;
    }

    let registration;
    setPhase("registering");
    try {
      registration = await sponsorUpload(title.trim(), description.trim());
    } catch (err) {
      console.error(err);
      toastError(err.message || "Sponsored registration failed. Please try again.");
      setPhase(null);
      return;
    }

    setPhase("uploading");
    setProgress(15);
    try {
      const request = await videoApi.requestUpload({
        title: title.trim(),
        description: description.trim(),
        number: registration.number,
        uploader: account,
        transactionHash: registration.transactionHash,
        originalName: file.name,
        contentType: file.type,
        fileSize: file.size,
      });
      await uploadFile(request.uploadUrl, file, setProgress);
      await videoApi.finalizeUpload(registration.transactionHash);
      setProgress(100);

      toastSuccess("Video uploaded successfully!");
      setTitle("");
      setDescription("");
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setTimeout(() => navigate("/"), 900);
    } catch (err) {
      console.error(err);
      toastError(`Upload failed: ${err.message}`);
      setPhase(null);
      setProgress(0);
    }
  };

  if (!account) {
    return (
      <div className="page">
        <h1 className="page-heading">Upload Video</h1>
        <p className="page-subheading">Register your content on-chain and share it with the world.</p>
        <EmptyState
          title="Wallet required"
          description="Connect your MetaMask wallet to upload videos. The uploader address becomes the on-chain owner."
        />
      </div>
    );
  }

  return (
    <div className="page">
      <h1 className="page-heading">Upload Video</h1>
      <p className="page-subheading">
        Uploading costs 100 credits. Your wallet signs for free while the platform sponsors the blockchain gas.
      </p>

      <form className="upload-form card" onSubmit={handleSubmit}>
        <div
          className={`upload-form__dropzone ${dragging ? "upload-form__dropzone--active" : ""} ${
            file ? "upload-form__dropzone--has-file" : ""
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            handleFile(e.dataTransfer.files[0]);
          }}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            hidden
            onChange={(e) => handleFile(e.target.files[0])}
          />
          {file ? (
            <>
              <div className="upload-form__file-icon">▶</div>
              <p className="upload-form__file-name">{file.name}</p>
              <p className="upload-form__file-meta">
                {(file.size / (1024 * 1024)).toFixed(1)} MB
              </p>
            </>
          ) : (
            <>
              <div className="upload-form__drop-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </div>
              <p className="upload-form__drop-title">
                {dragging ? "Drop it!" : "Drag & drop your video here"}
              </p>
              <p className="upload-form__drop-meta">or click to browse — video files up to 1 GB</p>
            </>
          )}
        </div>

        <div className="field">
          <label className="field__label" htmlFor="title">Title</label>
          <input
            id="title"
            className="field__input"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Give your video a catchy title"
            maxLength={120}
            required
            disabled={!!phase}
          />
        </div>

        <div className="field">
          <label className="field__label" htmlFor="description">Description</label>
          <textarea
            id="description"
            className="field__input"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What is this video about?"
            maxLength={2000}
            required
            disabled={!!phase}
          />
        </div>

        {phase && (
          <div className="upload-form__progress">
            <div className="upload-form__progress-head">
              <span>
                {phase === "registering"
                  ? "Registering on the blockchain…"
                  : "Uploading video to storage…"}
              </span>
              <span>{phase === "uploading" ? `${progress}%` : ""}</span>
            </div>
            <div className="upload-form__progress-bar">
              <div
                className="upload-form__progress-fill"
                style={{ width: `${phase === "registering" ? 10 : progress}%` }}
              />
            </div>
          </div>
        )}

        <button
          type="submit"
          className="btn btn--primary btn--block"
          disabled={!title.trim() || !description.trim() || !file || !!phase || busy}
        >
          {phase ? (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <Spinner size={16} /> Working…
            </span>
          ) : (
            "Upload Video"
          )}
        </button>
      </form>
    </div>
  );
}
