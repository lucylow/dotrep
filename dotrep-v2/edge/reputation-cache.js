/**
 * Cloudflare Worker for Edge Caching
 * Provides edge-optimized reputation data caching
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Handle reputation cache requests
    if (url.pathname.startsWith('/api/reputation/')) {
      const account = url.pathname.split('/').pop();
      
      // Edge-cached reputation data
      const cacheKey = `reputation:${account}`;
      let data = await env.EDGE_KV.get(cacheKey, { type: 'json' });
      
      if (!data) {
        // Fetch from origin API
        const originUrl = `https://api.dotrep.cloud/api/reputation/${account}`;
        const originResponse = await fetch(originUrl, {
          headers: {
            'Authorization': request.headers.get('Authorization') || '',
          }
        });
        
        if (originResponse.ok) {
          data = await originResponse.json();
          
          // Cache at edge for 5 minutes
          await env.EDGE_KV.put(cacheKey, JSON.stringify(data), { 
            expirationTtl: 300 
          });
        } else {
          return new Response('Not found', { 
            status: 404,
            headers: corsHeaders
          });
        }
      }
      
      return new Response(JSON.stringify(data), {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=300',
          ...corsHeaders
        }
      });
    }

    // Handle verification cache
    if (url.pathname.startsWith('/api/verification/')) {
      const contributionId = url.pathname.split('/').pop();
      const cacheKey = `verification:${contributionId}`;
      let data = await env.EDGE_KV.get(cacheKey, { type: 'json' });
      
      if (!data) {
        const originUrl = `https://api.dotrep.cloud/api/verification/${contributionId}`;
        const originResponse = await fetch(originUrl);
        
        if (originResponse.ok) {
          data = await originResponse.json();
          await env.EDGE_KV.put(cacheKey, JSON.stringify(data), { 
            expirationTtl: 3600 // 1 hour for verifications
          });
        } else {
          return new Response('Not found', { 
            status: 404,
            headers: corsHeaders
          });
        }
      }
      
      return new Response(JSON.stringify(data), {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=3600',
          ...corsHeaders
        }
      });
    }
    
    return new Response('Not found', { 
      status: 404,
      headers: corsHeaders
    });
  }
};


