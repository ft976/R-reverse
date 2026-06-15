'use client';

import React, { useState, useEffect } from 'react';
import { ExternalLink, Image as ImageIcon } from 'lucide-react';

export default function WebSourceCard({ webData }: { webData: any }) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const res = await fetch(`/api/metadata?url=${encodeURIComponent(webData.uri)}`);
        if (res.ok) {
          const contentType = res.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const data = await res.json();
            if (data.image) {
              setImageUrl(data.image);
              return;
            }
          } else {
            console.warn('Metadata API returned non-JSON response for', webData.uri);
          }
        }
        // Fallback to website screenshot
        setImageUrl(`https://image.thum.io/get/width/400/crop/600/${webData.uri}`);
      } catch (e) {
        console.warn('Failed to fetch metadata for', webData.uri, e);
        setImageUrl(`https://image.thum.io/get/width/400/crop/600/${webData.uri}`);
      } finally {
        setLoading(false);
      }
    };

    fetchMetadata();
  }, [webData.uri]);

  const getHostname = (uri: string) => {
    try {
      return new URL(uri).hostname;
    } catch {
      return uri;
    }
  };

  return (
    <a 
      href={webData.uri}
      target="_blank"
      rel="noopener noreferrer"
      className="flex flex-col overflow-hidden rounded-lg border border-zinc-800 bg-[#141414] hover:bg-zinc-800 hover:border-blue-500/50 transition-all group h-full"
    >
      <div className="h-32 w-full bg-zinc-900/50 relative overflow-hidden flex items-center justify-center border-b border-zinc-800">
        {loading ? (
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin opacity-50"></div>
        ) : imageUrl ? (
          <img 
            src={imageUrl} 
            alt={webData.title || 'Web source image'} 
            className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
            onError={() => setImageUrl(null)}
          />
        ) : (
          <ImageIcon className="w-8 h-8 text-zinc-700" />
        )}
      </div>
      <div className="p-3 flex flex-col flex-1">
        <h4 className="text-sm font-medium text-zinc-200 line-clamp-2 group-hover:text-blue-400 transition-colors">
          {webData.title || getHostname(webData.uri)}
        </h4>
        <div className="mt-auto pt-2 flex items-center justify-between">
          <p className="text-xs text-zinc-500 truncate max-w-[80%]">
            {getHostname(webData.uri)}
          </p>
          <ExternalLink className="w-3 h-3 text-zinc-600 group-hover:text-blue-400" />
        </div>
      </div>
    </a>
  );
}
