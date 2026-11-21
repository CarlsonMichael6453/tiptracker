import { ScrollViewStyleReset } from "expo-router/html";
import type { PropsWithChildren } from "react";

const theme = "#1A1E16";

/** Document shell for the GitHub Pages build, including Add to Home Screen tags. */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover" />
        <title>Tip Tracker</title>
        <meta name="description" content="A personal record of restaurant shifts, tips, and tip-out. It stays in this browser." />
        <meta name="theme-color" content={theme} />
        <meta name="application-name" content="Tip Tracker" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Tip Tracker" />
        <link rel="manifest" href="/tiptracker/manifest.webmanifest" />
        <link rel="apple-touch-icon" href="/tiptracker/icon.png" />
        <link rel="icon" href="/tiptracker/favicon.png" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function () {
              var build = "tiptracker-build-id";
              try {
                if ("serviceWorker" in navigator) {
                  navigator.serviceWorker.getRegistrations().then(function (regs) {
                    regs.forEach(function (reg) { reg.unregister(); });
                  });
                }
                if (window.caches && caches.keys) {
                  caches.keys().then(function (keys) {
                    keys.forEach(function (key) { caches.delete(key); });
                  });
                }
                var seen = localStorage.getItem("tiptracker.build");
                if (seen !== build) {
                  localStorage.setItem("tiptracker.build", build);
                  var url = new URL(window.location.href);
                  if (url.searchParams.get("b") !== build) {
                    url.searchParams.set("b", build);
                    window.location.replace(url.toString());
                  }
                }
                fetch("/tiptracker/version.json?t=" + Date.now(), { cache: "no-store" }).then(function (res) {
                  return res.json();
                }).then(function (data) {
                  if (!data || data.build === build) return;
                  var next = new URL(window.location.href);
                  next.searchParams.set("b", data.build);
                  window.location.replace(next.toString());
                }).catch(function () {});
              } catch (e) {}
            })();`,
          }}
        />
        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
