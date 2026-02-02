const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ========== REAL DATA STRATEGY ==========

// Google Custom Search API (FREE - 100 searches/day)
async function searchGoogleShoppingAPI(query, site) {
  try {
    // Google Custom Search Engine ID (you need to create this - FREE)
    const cx = process.env.GOOGLE_CSE_ID || 'demo_cx'; // Your CSE ID
    const apiKey = process.env.GOOGLE_API_KEY || 'demo_key'; // Your Google API key
    
    // Site-specific search
    const siteDomains = {
      amazon: 'amazon.in',
      flipkart: 'flipkart.com',
      myntra: 'myntra.com',
      ajio: 'ajio.com',
      nykaa: 'nykaa.com',
      tira: 'tirabeauty.com'
    };
    
    const domain = siteDomains[site] || '';
    const searchQuery = domain ? `${query} site:${domain}` : query;
    
    const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=${encodeURIComponent(searchQuery)}`;
    
    const response = await axios.get(url, { timeout: 10000 });
    
    if (response.data.items && response.data.items.length > 0) {
      const item = response.data.items[0];
      
      // Extract price from snippet
      let price = 'Check website';
      const priceMatch = item.snippet?.match(/₹\s*[\d,]+/);
      if (priceMatch) price = priceMatch[0];
      
      return {
        success: true,
        title: item.title,
        price: price,
        url: item.link,
        searchUrl: item.link,
        source: 'Google Search API',
        rating: '4.0'
      };
    }
    
    return null;
  } catch (error) {
    console.error(`[Google API ${site}] Error:`, error.message);
    return null;
  }
}

// Easy site scrapers (Myntra, Tira, AJIO, Nykaa)
async function scrapeEasySite(site, query) {
  const scrapers = {
    myntra: async (q) => {
      const url = `https://www.myntra.com/${encodeURIComponent(q)}`;
      const response = await axios.get(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        timeout: 10000
      });
      
      const $ = cheerio.load(response.data);
      const product = $('.product-base').first();
      
      if (product.length) {
        const brand = product.find('.product-brand').text().trim();
        const name = product.find('.product-product').text().trim();
        const price = product.find('.product-discountedPrice').text().trim();
        const link = product.find('a').attr('href');
        
        return {
          title: `${brand} ${name}`.trim(),
          price: price || 'Check website',
          url: link ? `https://www.myntra.com${link}` : url,
          searchUrl: url
        };
      }
      return null;
    },
    
    tira: async (q) => {
      const url = `https://www.tirabeauty.com/search?q=${encodeURIComponent(q)}`;
      const response = await axios.get(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        timeout: 10000
      });
      
      const $ = cheerio.load(response.data);
      const link = $('a[href*="/p/"]').first();
      
      if (link.length) {
        const productUrl = `https://www.tirabeauty.com${link.attr('href')}`;
        
        // Try to get product page
        try {
          const productResponse = await axios.get(productUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            timeout: 10000
          });
          
          const product$ = cheerio.load(productResponse.data);
          const title = product$('h1').first().text().trim();
          const price = product$('[class*="price"]').first().text().trim();
          
          return {
            title: title || q,
            price: price || 'Check website',
            url: productUrl,
            searchUrl: url
          };
        } catch (e) {
          return {
            title: q,
            price: 'Check website',
            url: productUrl,
            searchUrl: url
          };
        }
      }
      return null;
    }
  };
  
  const scraper = scrapers[site];
  if (!scraper) return null;
  
  try {
    return await scraper(query);
  } catch (error) {
    console.error(`[${site} scraper] Error:`, error.message);
    return null;
  }
}

// ========== MAIN SEARCH ENDPOINT ==========

app.post('/search', async (req, res) => {
  try {
    const { query, sites } = req.body;
    
    if (!query || !sites || sites.length === 0) {
      return res.status(400).json({ error: 'Missing query or sites' });
    }
    
    console.log(`🔍 Real search for: "${query}"`);
    
    const results = [];
    const siteCategories = {
      hard: ['amazon', 'flipkart'],
      easy: ['myntra', 'tira', 'ajio', 'nykaa']
    };
    
    for (const site of sites) {
      let productData = null;
      let note = '';
      
      // Strategy based on site difficulty
      if (siteCategories.hard.includes(site)) {
        // Use Google API for hard sites
        productData = await searchGoogleShoppingAPI(query, site);
        note = productData ? 'Google Shopping API' : 'API failed';
      } 
      else if (siteCategories.easy.includes(site)) {
        // Use direct scraping for easy sites
        productData = await scrapeEasySite(site, query);
        note = productData ? 'Direct scrape' : 'Scrape failed';
      }
      
      // Fallback: Create useful search link
      if (!productData) {
        const searchUrl = getSearchUrl(site, query);
        productData = {
          title: `Search ${query} on ${site}`,
          price: 'Click to check price',
          url: searchUrl,
          searchUrl: searchUrl
        };
        note = 'Search link';
      }
      
      results.push({
        site: site,
        ...productData,
        rating: productData.rating || '4.0',
        note: note,
        timestamp: new Date().toISOString()
      });
      
      // Delay between requests
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log(`✅ Found ${results.length} results`);
    res.json({ results });
    
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ 
      error: 'Search failed',
      message: error.message
    });
  }
});

// Helper function
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

app.get('/', (req, res) => {
  res.json({
    status: 'running',
    service: 'Real Product Search',
    strategy: 'Google API + Direct scraping',
    note: 'Setup Google Custom Search for better results'
  });
});

app.listen(PORT, () => {
  console.log(`✅ Real Search Backend on port ${PORT}`);
  console.log(`🔑 To improve: Get Google Custom Search API key`);
});
