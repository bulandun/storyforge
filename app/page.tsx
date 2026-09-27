import Script from 'next/script';
export default function Home() { return <><div id="app"/><Script type="module" src="/assets/story.js" strategy="afterInteractive" /></>; }
