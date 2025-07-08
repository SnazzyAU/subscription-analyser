import { useEffect } from "react";

export default function AdsenseAd({ slot }) {
  useEffect(() => {
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (e) {
      console.error(e);
    }
  }, []);

  return (
    <ins className="adsbygoogle"
         style={{ display: 'block', width: '160px', height: '300px' }}
         data-ad-client="ca-pub-9027885309204643"
         data-ad-slot={slot}
         data-ad-format="auto"
         data-full-width-responsive="true"></ins>
  );
}
