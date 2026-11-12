import { useEffect, useState } from 'react';
import { getRole } from '../services/session';

// The role of the person logged in ('owner', 'staff' or 'admin'). It is
// null for a moment while it loads, so buttons that only owners may use
// stay hidden until the role is known.
export default function useRole() {
  const [role, setRole] = useState(null);

  useEffect(() => {
    getRole().then(setRole);
  }, []);

  return role;
}
