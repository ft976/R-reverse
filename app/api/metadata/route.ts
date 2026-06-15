import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'URL is required' }, { status: 400 });
  }

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      signal: AbortSignal.timeout(5000)
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch URL' }, { status: response.status });
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    let image = $('meta[property="og:image"]').attr('content') || 
                $('meta[name="twitter:image"]').attr('content') || 
                $('meta[itemprop="image"]').attr('content') ||
                $('link[rel="image_src"]').attr('href');

    // If no meta image, try to find the first large image on the page
    if (!image) {
      const firstImg = $('img').first().attr('src');
      if (firstImg) {
        image = firstImg;
      }
    }

    // Resolve relative URLs
    if (image && !image.startsWith('http')) {
      if (image.startsWith('//')) {
        image = `https:${image}`;
      } else {
        const baseUrl = new URL(url).origin;
        image = new URL(image, baseUrl).href;
      }
    }

    return NextResponse.json({ image: image || null });
  } catch (error: any) {
    console.error('Metadata fetch error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch metadata', 
      details: error.message,
      cause: error.cause ? String(error.cause) : undefined
    }, { status: 500 });
  }
}
