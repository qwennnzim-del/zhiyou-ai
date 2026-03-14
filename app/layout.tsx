import type {Metadata} from 'next';
import './globals.css'; // Global styles

export const metadata: Metadata = {
  title: 'Zhiyou AI | Developed by M Fariz Alfauzi at Zent Technology GH',
  description: 'Zhiyou AI adalah asisten kecerdasan buatan canggih yang didirikan oleh M Fariz Alfauzi (AI Engineer) dan dikembangkan di Zent Technology GH, Karawang, Central Jawa Barat.',
  keywords: ['Zhiyou AI', 'M Fariz Alfauzi', 'AI Engineer', 'Zent Technology GH', 'Karawang', 'Jawa Barat', 'Artificial Intelligence', 'Chatbot', 'Zent Inc'],
  authors: [{ name: 'M Fariz Alfauzi', url: 'https://zent.technology' }],
  creator: 'M Fariz Alfauzi',
  publisher: 'Zent Technology GH',
  openGraph: {
    title: 'Zhiyou AI - Smart Assistant by M Fariz Alfauzi',
    description: 'Zhiyou AI adalah asisten kecerdasan buatan canggih yang didirikan oleh M Fariz Alfauzi (AI Engineer) dan dikembangkan di Zent Technology GH, Karawang, Central Jawa Barat.',
    siteName: 'Zhiyou AI',
    locale: 'id_ID',
    type: 'website',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
