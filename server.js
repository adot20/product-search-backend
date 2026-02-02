const express = require('express');
const cors = require('cors');

// Import all scrapers
const { scrapeAmazon } = require('./scrapers/amazon');
const { scrapeFlipkart } = require('./scrapers/flipkart');
const { scrapeMyntra } = require('./scrapers/myntra');
const { scrapeAjio } = require('./scrapers/ajio');
const { scrapeNykaa } = require('./scrapers/nykaa');
const { scrapeTira } = require('./scrapers/tira');

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

// Map site names to scraper functions
const scrapers = {
  amazon: scrapeAmazon,
  flipkart: scrapeFlipkart,
  myntra: scrapeMyntra,
  ajio: scrapeAjio,
  nykaa: scrapeNykaa,
  tira: scrapeTira
};

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
    
    // Search each site
    for (const site of sites) {
      const scraper = scrapers[site];
      
      if (!scraper) {
        console.log(`⚠️  No scraper for: ${site}`);
        results.push({
          site: site,
          error: true,
          message: 'Site not supported',
          searchUrl: getSearchUrl(site, query)
        });
        continue;
      }
      
      try {
        console.log(`  → Scraping ${site}...`);
        const productData = await scraper(query);
        
        if (productData) {
          results.push({
            site: site,
            ...productData
          });
          console.log(`  ✓ ${site}: Found product`);
        } else {
          // No product found, return search link
          const searchUrl = getSearchUrl(site, query);
          results.push({
            site: site,
            title: `Search "${query}" on ${site}`,
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
          site: site,
          error: true,
          message: 'Failed to fetch data',
          searchUrl: getSearchUrl(site, query)
        });
      }
      
      // Small delay between requests to be respectful
      await new Promise(resolve => setTimeout(resolve, 300));
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
  console.log(`🔍 Ready to scrape: ${Object.keys(scrapers).join(', ')}`);
});
