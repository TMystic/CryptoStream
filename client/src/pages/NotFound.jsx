import { Link } from "react-router-dom";
import EmptyState from "../components/ui/EmptyState.jsx";

export default function NotFound() {
  return (
    <div className="page">
      <EmptyState
        title="404 — Page not found"
        description="The page you're looking for doesn't exist or has moved."
        action={
          <Link className="btn btn--primary" to="/">
            Back to home
          </Link>
        }
      />
    </div>
  );
}
