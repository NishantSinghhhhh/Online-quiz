"use client";

import { useEffect, useState } from "react";

export interface Me {
  id: string;
  name: string;
  email: string;
  role: "admin" | "user";
}

let cached: Me | null | undefined = undefined; // module-scope cache (single fetch per page load)

/**
 * Returns the current signed-in user, fetched from /api/auth/me.
 * Module-cached so multiple components on the same page hit /api/auth/me at most once.
 *
 * `me.id` is the user's stable database id (cuid). Use it anywhere you used to
 * use a random localStorage UUID — it's the same across browsers / devices.
 */
export function useMe(): Me | null | undefined {
  const [me, setMe] = useState<Me | null | undefined>(cached);

  useEffect(() => {
    if (cached !== undefined) {
      setMe(cached);
      return;
    }
    fetch("/api/auth/me")
      .then(r => r.json())
      .then(d => {
        cached = d.user ?? null;
        setMe(cached);
      })
      .catch(() => { cached = null; setMe(null); });
  }, []);

  return me;
}

/** Reset the cached user — call after logout */
export function clearMeCache() {
  cached = undefined;
}
