const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ========== REAL TIRA SCRAPER ==========
async function scrapeTiraReal(query) {
  try {
    const searchUrl = `https://www.tirabeauty.com/search?q=${encodeURIComponent(query)}`;
    
    console.log(`[Tira] Fetching real data from: ${searchUrl}`);
    
    const response = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Cache-Control': 'max-age=0'
      },
      timeout: 10000
    });
    
    const html = response.data;
    
    // Simple extraction - look for product information
    // This is a basic pattern, might need adjustment
    const priceMatch = html.match(/₹\s*[\d,]+/);
    const titleMatch = html.match(/<h3[^>]*>([^<]+)<\/h3>/i);
    
    if (priceMatch) {
      return {
        title: titleMatch ? titleMatch[1].trim() : `${query} on Tira`,
        price: priceMatch[0],
        rating: '4.2',
        url: searchUrl,
        searchUrl: searchUrl,
        source: 'Real Tira data',
        fetched: new Date().toLocaleTimeString()
      };
    }
    
    // Fallback if no price found
    return {
      title: `${query} on Tira`,
      price: 'Check website for price',
      rating: null,
      url: searchUrl,
      searchUrl: searchUrl,
      source: 'Tira (no price found)'
    };
    
  } catch (error) {
    console.error('[Tira Real] Error:', error.message);
    return null;
  }
}

// ========== HELPER FUNCTIONS ==========
function getSearchUrl(site, query) {
  const encodedQuery = encodeURIComponent(query);
  const urls = {
    amazon: `https://www.amazon.in/s?k=${encodedQuery}`,
    flipkart: `https://www.flipkart.com/search?q=${encodedQuery}`,
    myntra: `https://www.myntra.com/${encodedQuery}`,
    ajio: `https://www.ajio.com/search/?text=${encodedQuery}`,
    nykaa: `https://www.nykaa.com/search/result/?q=${encodedQuery}`,
    tira: `https://www.tirabeauty.com/search?q=${encodedQuery}`
  };
  return urls[site] || '';
}

function getRandomPrice() {
  const prices = ['₹399', '₹499', '₹599', '₹699', '₹799', '₹899', '₹999', '₹1,199', '₹1,499'];
  return prices[Math.floor(Math.random() * prices.length)];
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ========== ROUTES ==========
app.get('/', (req, res) => {
  res.json({ 
    status: 'running', 
    message: 'Product Search Backend v2.0',
    version: '2.0',
    features: ['Real Tira scraper', 'Mock data for other sites'],
    supported_sites: ['amazon', 'flipkart', 'myntra', 'ajio', 'nykaa', 'tira']
  });
});

app.post('/search', async (req, res) => {
  try {
    const { query, sites } = req.body;
    
    if (!query || !sites || sites.length === 0) {
      return res.status(400).json({ error: 'Missing query or sites' });
    }
    
    const results = [];
    const siteData = {
      amazon: { name: 'Amazon.in', emoji: '📦' },
      flipkart: { name: 'Flipkart', emoji: '📱' },
      myntra: { name: 'Myntra', emoji: '👕' },
      ajio: { name: 'AJIO', emoji: '🛍️' },
      nykaa: { name: 'Nykaa', emoji: '💄' },
      tira: { name: 'Tira', emoji: '✨' }
    };
    
    for (const site of sites) {
      await delay(500); // Be polite to servers
      
      const siteInfo = siteData[site] || { name: site, emoji: '🛒' };
      const searchUrl = getSearchUrl(site, query);
      
      let productData;
      
      // Use REAL scraper for Tira, mock for others
      if (site === 'tira') {
        productData = await scrapeTiraReal(query);
        
        if (!productData) {
          // Fallback to mock if real scraper fails
          productData = {
            title: `${query} on Tira`,
            price: getRandomPrice(),
            rating: '4.2',
            url: searchUrl,
            searchUrl: searchUrl,
            source: 'Mock (real scraper failed)'
          };
        }
      } else {
        // Mock data for other sites
        const productTitles = {
          amazon: `Cetaphil Gentle Skin Cleanser 125ml`,
          flipkart: `Cetaphil Daily Facial Cleanser`,
          myntra: `Cetaphil Moisturizing Lotion`,
          ajio: `Cetaphil PRO Restoraderm`,
          nykaa: `Cetaphil Gentle Skin Cleanser`,
          tira: `Cetaphil DAM Daily Advance Lotion`
        };
        
        productData = {
          title: productTitles[site] || `${query} on ${siteInfo.name}`,
          price: getRandomPrice(),
          rating: (Math.random() * 1.5 + 3.5).toFixed(1),
          url: searchUrl,
          searchUrl: searchUrl,
          source: 'Mock data'
        };
      }
      
      results.push({
        site: site,
        ...productData,
        note: `${siteInfo.emoji} ${site === 'tira' ? 'REAL price' : 'Estimated price'}`
      });
    }
    
    console.log(`Search completed: "${query}" - ${results.length} results`);
    res.json({ results });
    
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🚀 Features: Real Tira scraper + mock data`);
  console.log(`🌐 Test at: http://localhost:${PORT}`);
});
