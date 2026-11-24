import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/** Route changes start at the masthead instead of preserving the old page's scroll. */
export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
