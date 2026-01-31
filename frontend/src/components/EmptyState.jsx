import React from 'react';
import { Link } from 'react-router-dom';

const ICONS = {
  events: '📅',
  clubs: '👥',
  resources: '📦',
  notifications: '🔔',
  bookings: '📋',
  registrations: '📝',
  calendar: '🗓️',
  default: '✨',
};

export default function EmptyState({ icon = 'default', title, subtitle, actionLabel, actionTo }) {
  const iconChar = ICONS[icon] || ICONS.default;
  return (
    <div className="card py-12 px-6 text-center shadow-card empty-state">
      <span className="empty-state-icon" aria-hidden>{iconChar}</span>
      <h3 className="empty-state-title">{title}</h3>
      {subtitle && <p className="empty-state-subtitle">{subtitle}</p>}
      {actionLabel && actionTo && (
        <Link
          to={actionTo}
          className="mt-4 btn-primary inline-flex items-center gap-2"
        >
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
