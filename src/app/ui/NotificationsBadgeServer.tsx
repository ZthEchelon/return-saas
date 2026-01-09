import NotificationsBadge from "./NotificationsBadge";

export default function NotificationsBadgeServer() {
  // Render client component inside a server wrapper to use in layout
  return <NotificationsBadge />;
}
