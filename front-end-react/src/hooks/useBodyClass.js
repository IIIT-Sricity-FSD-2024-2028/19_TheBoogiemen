/**
 * The legacy app was one HTML file per page, each with its own fixed
 * <body class="..."> (login-body, dashboard-body, onboard-body) that
 * style.css's page-level rules key off. In a single-page app there's one
 * <body> for every route, so each top-level page sets its own class on
 * mount and removes it on unmount instead.
 */
import { useEffect } from 'react';

export default function useBodyClass(className) {
  useEffect(() => {
    document.body.classList.add(className);
    return () => document.body.classList.remove(className);
  }, [className]);
}
