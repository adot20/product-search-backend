const express = require('express');
const cors = require('cors');

// Safely load all scrapers - won't crash if files are missing
function loadScraper(name, path) {
  try {
    const module = require(path);
    const scraperFn = module[`scrape${name.charAt(0).toUpperCase() + name.slice(1)}`];
    if (typeof scraperFn !== 'function') {
      console.warn(`⚠️  ${name} scraper not a function. Got:`, typeof scraperFn);
      return undefined;
    }
    console.log(`✅ Loaded ${name} scraper`);
    return scraperFn;
  } catch (e) {
    console.warn(`⚠️  ${name} scraper failed to load:`, e.message);
    return undefined;
  }
}

// Load all scrapers safely
const scrapeAmazon = loadScraper('amazon', './scrapers/amazon');
const scrapeFlipkart = loadScraper('flipkart', './scrapers/flipkart');
const scrapeMyntra = loadScraper('myntra', './scrapers/myntra');
const scrapeNykaa = loadScraper('nykaa', './scrapers/nykaa');

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
  nykaa: scrapeNykaa
};

// Helper function to generate search URLs
function getSearchUrl(site, query) {
  const encoded = encodeURIComponent(query);
  const urls = {
    amazon: `https://www.amazon.in/s?k=${encoded}`,
    flipkart: `https://www.flipkart.com/search?q=${encoded}`,
    myntra: `https://www.myntra.com/${encoded}`,
    nykaa: `https://www.nykaa.com/search/result/?q=${encoded}`
  };
  return urls[site] || '';
}

// Helper: Add timeout to any promise
function withTimeout(promise, timeoutMs, siteName) {
  return Promise.race([
    promise,
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error(`Timeout after ${timeoutMs}ms`)), timeoutMs)
    )
  ]);
}

// Helper: Scrape single site with timeout and error handling
async function scrapeSite(site, query, scraper) {
  const siteKey = typeof site === 'string' ? site.toLowerCase() : site;
  const SCRAPER_TIMEOUT = 8000; // 8 seconds max per scraper
  
  if (!scraper) {
    console.log(`⚠️  No scraper for: ${site}`);
    return {
      site: siteKey,
      error: true,
      message: 'Site not supported',
      searchUrl: getSearchUrl(siteKey, query)
    };
  }
  
  try {
    console.log(`  → Scraping ${site}...`);
    
    // Run scraper with timeout
    const productData = await withTimeout(
      scraper(query),
      SCRAPER_TIMEOUT,
      site
    );
    
    console.log(`  → ${site} returned:`, productData ? 'DATA' : 'NULL');

    if (productData) {
      console.log(`  ✓ ${site}: Found product - ${productData.title}`);
      return {
        site: siteKey,
        ...productData
      };
    } else {
      // No product found, return search link
      const searchUrl = getSearchUrl(siteKey, query);
      console.log(`  ⚠️  ${site}: No product found, returning search link`);
      return {
        site: siteKey,
        title: `Search "${query}" on ${siteKey}`,
        price: 'Click to search',
        url: searchUrl,
        searchUrl: searchUrl,
        rating: null,
        image: null
      };
    }
  } catch (error) {
    const isTimeout = error.message.includes('Timeout');
    console.error(`  ✗ ${site}: ${isTimeout ? 'Timeout' : 'Error'} -`, error.message);
    
    return {
      site: siteKey,
      error: true,
      message: isTimeout ? 'Request timed out' : 'Failed to fetch data',
      searchUrl: getSearchUrl(siteKey, query)
    };
  }
}

// Main search endpoint - NOW WITH PARALLEL EXECUTION
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
    const startTime = Date.now();
    
    // 🚀 RUN ALL SCRAPERS IN PARALLEL
    const scrapePromises = sites.map(site => {
      const siteKey = typeof site === 'string' ? site.toLowerCase() : site;
      const scraper = scrapers[siteKey];
      return scrapeSite(site, query, scraper);
    });
    
    // Wait for all scrapers to complete (or timeout)
    const results = await Promise.all(scrapePromises);
    
    const endTime = Date.now();
    const totalTime = ((endTime - startTime) / 1000).toFixed(2);
    
    console.log(`✅ Completed search with ${results.length} results in ${totalTime}s`);
    
    res.json({ 
      results: results,
      query: query,
      timestamp: new Date().toISOString(),
      executionTime: `${totalTime}s`
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
    version: '3.0 - Parallel Execution',
    architecture: 'Modular scrapers with parallel execution',
    cors: 'Enabled for all origins (including Chrome extensions)',
    features: [
      'Parallel scraping (all sites at once)',
      '8-second timeout per scraper',
      'Optimized for speed'
    ],
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
  console.log(`🚀 Using parallel scraper architecture`);
  const loaded = Object.keys(scrapers).map(s => scrapers[s] ? `${s} ✓` : `${s} ✗`).join(', ');
  console.log(`🔧 Scrapers: ${loaded}`);
});
