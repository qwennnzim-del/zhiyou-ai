import type {Metadata, Viewport} from 'next';
import './globals.css'; // Global styles
import { Providers } from './providers';

export const viewport: Viewport = {
  themeColor: '#ffffff',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: 'Zhiyou AI | Developed by M Fariz Alfauzi at Zent Technology GH',
  description: 'Zhiyou AI adalah asisten kecerdasan buatan canggih yang didirikan oleh M Fariz Alfauzi (AI Engineer) dan dikembangkan di Zent Technology GH, Karawang, Central Jawa Barat.',
  keywords: ['Zhiyou AI', 'M Fariz Alfauzi', 'AI Engineer', 'Zent Technology GH', 'Karawang', 'Jawa Barat', 'Artificial Intelligence', 'Chatbot', 'Zent Inc'],
  authors: [{ name: 'M Fariz Alfauzi', url: 'https://zent.technology' }],
  creator: 'M Fariz Alfauzi',
  publisher: 'Zent Technology GH',
  metadataBase: new URL('https://ais-pre-q52xbbhqheaysryy45fgkk-108471728467.asia-east1.run.app'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Zhiyou AI - Smart Assistant by M Fariz Alfauzi',
    description: 'Zhiyou AI adalah asisten kecerdasan buatan canggih yang didirikan oleh M Fariz Alfauzi (AI Engineer) dan dikembangkan di Zent Technology GH, Karawang, Central Jawa Barat.',
    siteName: 'Zhiyou AI',
    locale: 'id_ID',
    type: 'website',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Zhiyou AI',
  },
  formatDetection: {
    telephone: false,
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(function(registration) {
                    console.log('ServiceWorker registration successful with scope: ', registration.scope);
                  }, function(err) {
                    console.log('ServiceWorker registration failed: ', err);
                  });
                });
              }
            `,
          }}
        />
      </head>
      <body suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
