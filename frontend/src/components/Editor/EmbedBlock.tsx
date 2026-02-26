import { useMemo } from 'react';

interface EmbedBlockProps {
  url: string;
}

type EmbedType = 'youtube' | 'vimeo' | 'twitter' | 'figma' | 'codepen' | 'unknown';

export function EmbedBlock({ url }: EmbedBlockProps) {
  const embedType = useMemo<EmbedType>(() => {
    if (!url) return 'unknown';
    const lowerUrl = url.toLowerCase();
    if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be')) return 'youtube';
    if (lowerUrl.includes('vimeo.com')) return 'vimeo';
    if (lowerUrl.includes('twitter.com') || lowerUrl.includes('x.com')) return 'twitter';
    if (lowerUrl.includes('figma.com')) return 'figma';
    if (lowerUrl.includes('codepen.io')) return 'codepen';
    return 'unknown';
  }, [url]);

  const renderEmbed = () => {
    if (!url) return null;

    switch (embedType) {
      case 'youtube': {
        const videoId = extractYouTubeId(url);
        if (!videoId) return <div className="p-4 text-red-500">Invalid YouTube URL</div>;
        return (
          <div className="relative pt-[56.25%] bg-black rounded overflow-hidden">
            <iframe
              className="absolute top-0 left-0 w-full h-full"
              src={`https://www.youtube.com/embed/${videoId}`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title="YouTube embed"
            />
          </div>
        );
      }
      case 'vimeo': {
        const videoId = extractVimeoId(url);
        if (!videoId) return <div className="p-4 text-red-500">Invalid Vimeo URL</div>;
        return (
          <div className="relative pt-[56.25%] bg-black rounded overflow-hidden">
            <iframe
              className="absolute top-0 left-0 w-full h-full"
              src={`https://player.vimeo.com/video/${videoId}`}
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
              title="Vimeo embed"
            />
          </div>
        );
      }
      case 'twitter': {
        return (
          <div className="bg-white rounded p-4 border border-border">
            <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
              {url}
            </a>
            <p className="text-sm text-text-secondary mt-2">
              Twitter embeds require Twitter Widgets JS. For now, showing link.
            </p>
          </div>
        );
      }
      case 'figma': {
        return (
          <div className="relative pt-[56.25%] bg-gray-100 rounded border border-border">
            <iframe
              className="absolute top-0 left-0 w-full h-full"
              src={url.replace('figma.com/file/', 'figma.com/embed?embed_host=share&url=')}
              allowFullScreen
              title="Figma embed"
            />
          </div>
        );
      }
      case 'codepen': {
        const embedUrl = url.replace('codepen.io/', 'codepen.io/embed/pen/');
        return (
          <div className="relative pt-[60%] bg-gray-100 rounded border border-border">
            <iframe
              className="absolute top-0 left-0 w-full h-full"
              src={embedUrl}
              title="CodePen embed"
              allowTransparency
              allowFullScreen
            />
          </div>
        );
      }
      default:
        return (
          <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
            {url}
          </a>
        );
    }
  };

  return (
    <div className="w-full rounded overflow-hidden">
      {renderEmbed()}
    </div>
  );
}

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

function extractVimeoId(url: string): string | null {
  const match = url.match(/vimeo\.com\/(\d+)/);
  return match ? match[1] : null;
}
