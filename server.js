const express = require('express');
const cors = require('cors');
const { searchGoogleShopping } = require('./scrapers/googleShopping');
const { scrapeSimpleSite } = require('./scrapers/simpleScraper');
const { getFromCache, saveToCache } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ 
    status: 'running', 
    message: 'Product Search Backend API - Lightweight Version',
    version: '1.0.0',
    supported_sites: ['amazon', 'flipkart', 'myntra', 'ajio', 'nykaa', 'tira']
  });
});

app.post('/search', async (req, res) => {
  const { query, sites } = req.body;
  
  console.log(`Search request: "${query}" for sites:`, sites);
  
  if (!query || !sites || sites.length === 0) {
    return res.status(400).json({ 
      error: 'Missing query or sites' 
    });
  }
  
  try {
    const results = [];
    
    for (const site of sites) {
      // Try cache first
      const cached = await getFromCache(query, site);
      if (cached) {
        console.log(`[Cache] Hit for ${site}: ${query}`);
        results.push({
          site: site,
          title: cached.title,
          price: cached.price,
          rating: cached.rating,
          image: cached.image,
          url: cached.url,
          searchUrl: cached.search_url,
          cached: true
        });
        continue;
      }
      
      let productData = null;
      
      // Use Google Shopping for Amazon/Flipkart
      if (site === 'amazon' || site === 'flipkart') {
        productData = await searchGoogleShopping(query, site);
      } 
      // Use simple scraper for other sites
      else if (['myntra', 'ajio', 'nykaa', 'tira'].includes(site)) {
        productData = await scrapeSimpleSite(site, query);
      }
      
      if (productData) {
        // Save to cache
        await saveToCache(query, site, {
          ...productData,
          searchUrl: productData.searchUrl || productData.url
        });
        
        results.push({
          site: site,
          ...productData,
          cached: false
        });
      } else {
        results.push({
          site: site,
          error: true,
          message: `Could not find product on ${site}`,
          searchUrl: getSearchUrl(site, query)
        });
      }
      
      // Small delay between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log('Search completed with', results.length, 'results');
    
    res.json({ results });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
});

function getSearchUrl(site, query) {
  const urls = {
    amazon: `https://www.amazon.in/s?k=${encodeURIComponent(query)}`,
    flipkart: `https://www.flipkart.com/search?q=${encodeURIComponent(query)}`,
    myntra: `https://www.myntra.com/${encodeURIComponent(query)}`,
    ajio: `https://www.ajio.com/search/?text=${encodeURIComponent(query)}`,
    nykaa: `https://www.nykaa.com/search/result/?q=${encodeURIComponent(query)}`,
    tira: `https://www.tirabeauty.com/search?q=${encodeURIComponent(query)}`
  };
  return urls[site] || '';
}

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`📦 Lightweight backend - using Google Shopping + simple scrapers`);
});
