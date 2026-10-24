import { Link } from "react-router-dom";
import { useAuth } from "../context/auth-context.js";
import Avatar from "./Avatar.jsx";

export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <header className="topbar">
      <div className="topbar-inner">
        <Link to="/" className="wordmark">
          <span className="wordmark-mark" aria-hidden="true" />
          TaskFlow
        </Link>
        <div className="topbar-user">
          <Avatar name={user.name} size="sm" />
          <span className="topbar-name">{user.name}</span>
          <button type="button" className="btn btn-quiet" onClick={logout}>
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
