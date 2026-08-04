import { useWallet } from "../context/WalletContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { useNavigate } from "react-router-dom";
import { VIDEO_COST_CREDITS } from "../config.js";
import Modal from "./ui/Modal.jsx";
import "./purchase-modal.css";

export default function PurchaseModal({ video, onClose }) {
  const navigate = useNavigate();
  const { account, busy, buyVideo } = useWallet();
  const { info: toastInfo } = useToast();

  if (!video) return null;

  const handleConfirm = async () => {
    if (!account) {
      toastInfo("Connect your wallet to buy videos");
      onClose();
      return;
    }
    const success = await buyVideo(video.number);
    if (success) {
      onClose();
      navigate(`/video/${video.number}`);
    }
  };

  return (
    <Modal open={!!video} onClose={onClose} title="Unlock this video">
      <div className="purchase">
        <div className="purchase__video">
          <video src={video.videoPath} muted playsInline preload="metadata" />
        </div>
        <h3 className="purchase__title">{video.title}</h3>
        <p className="purchase__text">
          You don't have access to this video yet. Unlock it permanently with your credits — the
          access right is stored on the blockchain.
        </p>

        <div className="purchase__price">
          <span className="purchase__price-label">Price</span>
          <span className="purchase__price-value">{VIDEO_COST_CREDITS.toLocaleString()} credits</span>
        </div>

        <div className="purchase__actions">
          <button className="btn btn--ghost" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button className="btn btn--primary" onClick={handleConfirm} disabled={busy}>
            {busy ? "Confirming…" : "Confirm purchase"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
