import React, { useEffect, useState } from 'react';

/**
 * The user's profile photo (GET /api/uploads/me/photo), or their initial when
 * no photo is set or it fails to load. `version` changes after an upload so the
 * browser fetches the new image.
 */
export default function Avatar({ user, large, version }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [user?.photo_file_id, version]);
  const initial = (user?.first_name || user?.name || 'U').charAt(0).toUpperCase();
  const className = `sp-avatar${large ? ' is-large' : ''}`;

  if (user?.photo_file_id && !failed) {
    return (
      <img
        className={className}
        src={`/api/uploads/me/photo?v=${encodeURIComponent(version || user.photo_file_id)}`}
        alt=""
        onError={() => setFailed(true)}
      />
    );
  }
  return <span className={className} aria-hidden="true">{initial}</span>;
}
