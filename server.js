const express = require('express');
const cors = require('cors');

// Import all scrapers
const { scrapeAmazon } = require('./scrapers/amazon');
const { scrapeFlipkart } = require('./scrapers/flipkart');
const { scrapeMyntra } = require('./scrapers/myntra');
const { scrapeAjio } = require('./scrapers/ajio');
const { scrapeNykaa } = require('./scrapers/nykaa');

let scrapeTira;
try {
  const tiraModule = require('./scrapers/tira');
  scrapeTira = tiraModule.scrapeTira;
  if (typeof scrapeTira !== 'function') {
    console.warn('⚠️  Tira scraper not a function (scrapers/tira.js must export: module.exports = { scrapeTira }; ). Got:', typeof scrapeTira);
    scrapeTira = undefined;
  }
} catch (e) {
  console.error('⚠️  Tira scraper failed to load:', e.message);
  scrapeTira = undefined;
}

const app = express();
const PORT = process.env.PORT || 3000;

// FIXED CORS - Allow Chrome extensions
app.use(cors({
  origin: '*',  // Allow all origins (including chrome-extension://)
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false
}));

// Handle preflight requests
app.options('*', cors());

app.use(express.json());

// Map site names to scraper functions (keys must be lowercase)
const scrapers = {
  amazon: scrapeAmazon,
  flipkart: scrapeFlipkart,
  myntra: scrapeMyntra,
  ajio: scrapeAjio,
  nykaa: scrapeNykaa,
  tira: scrapeTira
};
if (!scrapers.tira) {
  console.warn('⚠️  Tira will show "Site not supported" until scrapers/tira.js is fixed and redeployed.');
}

// Helper function to generate search URLs
function getSearchUrl(site, query) {
  const encoded = encodeURIComponent(query);
  const urls = {
    amazon: `https://www.amazon.in/s?k=${encoded}`,
    flipkart: `https://www.flipkart.com/search?q=${encoded}`,
    myntra: `https://www.myntra.com/${encoded}`,
    ajio: `https://www.ajio.com/search/?text=${encoded}`,
    nykaa: `https://www.nykaa.com/search/result/?q=${encoded}`,
    tira: `https://www.tirabeauty.com/search?q=${encoded}`
  };
  return urls[site] || '';
}

// Main search endpoint
app.post('/search', async (req, res) => {
  try {
    const { query, sites } = req.body;
    
    // Validation
    if (!query || !sites || sites.length === 0) {
      return res.status(400).json({ 
        error: 'Missing query or sites',
        message: 'Please provide both query and sites array' 
      });
    }
    
    console.log(`🔍 Searching for: "${query}" on ${sites.join(', ')}`);
    
    const results = [];
    
    // Search each site (normalize key: extension may send "tira" or "Tira")
    for (const site of sites) {
      const siteKey = typeof site === 'string' ? site.toLowerCase() : site;
      const scraper = scrapers[siteKey];
      
      if (!scraper) {
        console.log(`⚠️  No scraper for: ${site}`);
        results.push({
          site: siteKey,
          error: true,
          message: 'Site not supported',
          searchUrl: getSearchUrl(siteKey, query)
        });
        continue;
      }
      
      try {
        console.log(`  → Scraping ${site}...`);
        console.log(`  → Calling ${site} scraper...`);
        
        const productData = await scraper(query);
        console.log(`  → ${site} returned:`, productData ? 'DATA' : 'NULL');

        if (productData) {
          results.push({
            site: siteKey,
              ...productData
          });
          console.log(`  ✓ ${site}: Found product - ${productData.title}`);
      } else {
          // No product found, return search link
          const searchUrl = getSearchUrl(siteKey, query);
          results.push({
            site: siteKey,
            title: `Search "${query}" on ${siteKey}`,
            price: 'Click to search',
            url: searchUrl,
            searchUrl: searchUrl,
            rating: null,
            image: null
          });
          console.log(`  ⚠️  ${site}: No product found, returning search link`);
        }
      } catch (error) {
        console.error(`  ✗ ${site}: Error -`, error.message);
        results.push({
          site: siteKey,
          error: true,
          message: 'Failed to fetch data',
          searchUrl: getSearchUrl(siteKey, query)
        });
      }
      
      // Small delay between requests to be respectful and avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, Math.random() * 500 + 500));
    }
    
    console.log(`✅ Completed search with ${results.length} results`);
    res.json({ 
      results: results,
      query: query,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Search endpoint error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message
    });
  }
});

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    status: 'running',
    service: 'Product Search Backend',
    version: '2.0 - Modular',
    architecture: 'Modular scrapers',
    cors: 'Enabled for all origins (including Chrome extensions)',
    endpoints: {
      search: 'POST /search',
      health: 'GET /'
    },
    supportedSites: Object.keys(scrapers)
  });
});

app.listen(PORT, () => {
  console.log(`✅ Product Search Backend running on port ${PORT}`);
  console.log(`🔓 CORS enabled for Chrome extensions`);
  console.log(`📁 Using modular scraper architecture`);
  const loaded = Object.keys(scrapers).map(s => scrapers[s] ? `${s} ✓` : `${s} ✗`).join(', ');
  console.log(`🔍 Scrapers: ${loaded}`);
});
