import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = { title: 'Storyforge — Create your own adventure', description: 'Create, save and share interactive story games.' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
