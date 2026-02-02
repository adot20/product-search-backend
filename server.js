const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ==================== SITE SCRAPERS ====================

// Amazon India scraper
async function scrapeAmazon(query) {
  const searchUrl = `https://www.amazon.in/s?k=${encodeURIComponent(query)}`;
  
  try {
    const response = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
      },
      timeout: 10000
    });
    
    const $ = cheerio.load(response.data);
    const firstProduct = $('[data-component-type="s-search-result"]').first();
    
    if (firstProduct.length) {
      const title = firstProduct.find('h2 a span').text().trim();
      const priceWhole = firstProduct.find('.a-price-whole').first().text().trim();
      const priceFraction = firstProduct.find('.a-price-fraction').first().text().trim();
      const price = priceWhole ? `₹${priceWhole}${priceFraction}` : null;
      const rating = firstProduct.find('.a-icon-star-small span').first().text().trim();
      const image = firstProduct.find('img').first().attr('src');
      const link = firstProduct.find('h2 a').attr('href');
      const productUrl = link ? `https://www.amazon.in${link}` : searchUrl;
      
      return {
        title: title || query,
        price: price || 'Check website',
        rating: rating || null,
        image: image || null,
        url: productUrl,
        searchUrl: searchUrl
      };
    }
    
    return null;
  } catch (error) {
    console.error('[Amazon] Error:', error.message);
    return null;
  }
}

// Flipkart scraper
async function scrapeFlipkart(query) {
  const searchUrl = `https://www.flipkart.com/search?q=${encodeURIComponent(query)}`;
  
  try {
    const response = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      },
      timeout: 10000
    });
    
    const $ = cheerio.load(response.data);
    const firstProduct = $('[data-id]').first();
    
    if (firstProduct.length) {
      const title = firstProduct.find('a[title]').first().attr('title') || 
                    firstProduct.find('[class*="title"]').first().text().trim();
      const price = firstProduct.find('[class*="price"]').first().text().trim();
      const rating = firstProduct.find('[class*="rating"]').first().text().trim();
      const image = firstProduct.find('img').first().attr('src');
      const link = firstProduct.find('a').first().attr('href');
      const productUrl = link ? `https://www.flipkart.com${link}` : searchUrl;
      
      return {
        title: title || query,
        price: price || 'Check website',
        rating: rating || null,
        image: image || null,
        url: productUrl,
        searchUrl: searchUrl
      };
    }
    
    return null;
  } catch (error) {
    console.error('[Flipkart] Error:', error.message);
    return null;
  }
}

// Myntra scraper
async function scrapeMyntra(query) {
  const searchUrl = `https://www.myntra.com/${encodeURIComponent(query)}`;
  
  try {
    const response = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      timeout: 10000
    });
    
    const $ = cheerio.load(response.data);
    const product = $('.product-base').first();
    
    if (product.length) {
      const brand = product.find('.product-brand').text().trim();
      const name = product.find('.product-product').text().trim();
      const price = product.find('.product-discountedPrice').text().trim();
      const image = product.find('img').attr('src');
      const link = product.find('a').attr('href');
      const productUrl = link ? `https://www.myntra.com${link}` : searchUrl;
      
      return {
        title: `${brand} ${name}`.trim() || query,
        price: price || 'Check website',
        rating: '4.0',
        image: image || null,
        url: productUrl,
        searchUrl: searchUrl
      };
    }
    
    return null;
  } catch (error) {
    console.error('[Myntra] Error:', error.message);
    return null;
  }
}

// AJIO scraper
async function scrapeAjio(query) {
  const searchUrl = `https://www.ajio.com/search/?text=${encodeURIComponent(query)}`;
  
  try {
    const response = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      timeout: 10000
    });
    
    const $ = cheerio.load(response.data);
    const product = $('.item').first();
    
    if (product.length) {
      const brand = product.find('.brand').text().trim();
      const name = product.find('.name').text().trim();
      const price = product.find('.price').text().trim();
      const image = product.find('img').attr('src');
      const link = product.find('a').attr('href');
      const productUrl = link ? `https://www.ajio.com${link}` : searchUrl;
      
      return {
        title: `${brand} ${name}`.trim() || query,
        price: price || 'Check website',
        rating: '4.0',
        image: image || null,
        url: productUrl,
        searchUrl: searchUrl
      };
    }
    
    return null;
  } catch (error) {
    console.error('[AJIO] Error:', error.message);
    return null;
  }
}

// Nykaa scraper
async function scrapeNykaa(query) {
  const searchUrl = `https://www.nykaa.com/search/result/?q=${encodeURIComponent(query)}`;
  
  try {
    const response = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      timeout: 10000
    });
    
    const $ = cheerio.load(response.data);
    const product = $('.product-item, .productCard').first();
    
    if (product.length) {
      const title = product.find('[class*="title"], [class*="name"]').first().text().trim();
      const price = product.find('[class*="price"]').first().text().trim();
      const rating = product.find('[class*="rating"]').first().text().trim();
      const image = product.find('img').attr('src') || product.find('img').attr('data-src');
      const link = product.find('a').attr('href');
      const productUrl = link ? (link.startsWith('http') ? link : `https://www.nykaa.com${link}`) : searchUrl;
      
      return {
        title: title || query,
        price: price || 'Check website',
        rating: rating || '4.0',
        image: image || null,
        url: productUrl,
        searchUrl: searchUrl
      };
    }
    
    return null;
  } catch (error) {
    console.error('[Nykaa] Error:', error.message);
    return null;
  }
}

// Tira scraper
async function scrapeTira(query) {
  const searchUrl = `https://www.tirabeauty.com/search?q=${encodeURIComponent(query)}`;
  
  try {
    const response = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      timeout: 10000
    });
    
    const $ = cheerio.load(response.data);
    const product = $('.product-card, [class*="product"]').first();
    
    if (product.length) {
      const title = product.find('[class*="title"], [class*="name"], h3, h4').first().text().trim();
      const price = product.find('[class*="price"]').first().text().trim();
      const image = product.find('img').attr('src') || product.find('img').attr('data-src');
      const link = product.find('a').attr('href');
      const productUrl = link ? `https://www.tirabeauty.com${link}` : searchUrl;
      
      return {
        title: title || query,
        price: price || 'Check website',
        rating: '4.0',
        image: image || null,
        url: productUrl,
        searchUrl: searchUrl
      };
    }
    
    return null;
  } catch (error) {
    console.error('[Tira] Error:', error.message);
    return null;
  }
}

// ==================== MAIN SEARCH ENDPOINT ====================

app.post('/search', async (req, res) => {
  try {
    const { query, sites } = req.body;
    
    if (!query || !sites || sites.length === 0) {
      return res.status(400).json({ 
        error: 'Missing query or sites',
        message: 'Please provide both query and sites array' 
      });
    }
    
    console.log(`🔍 Searching for: "${query}" on ${sites.join(', ')}`);
    
    const scrapers = {
      amazon: scrapeAmazon,
      flipkart: scrapeFlipkart,
      myntra: scrapeMyntra,
      ajio: scrapeAjio,
      nykaa: scrapeNykaa,
      tira: scrapeTira
    };
    
    const results = [];
    
    for (const site of sites) {
      const scraper = scrapers[site];
      
      if (!scraper) {
        console.log(`⚠️ No scraper for: ${site}`);
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
          console.log(`  ⚠️ ${site}: No product found, returning search link`);
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

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    status: 'running',
    service: 'Product Search Backend',
    version: '2.0',
    endpoints: {
      search: 'POST /search',
      health: 'GET /'
    },
    supportedSites: ['amazon', 'flipkart', 'myntra', 'ajio', 'nykaa', 'tira']
  });
});

app.listen(PORT, () => {
  console.log(`✅ Product Search Backend running on port ${PORT}`);
  console.log(`🔍 Ready to scrape: Amazon, Flipkart, Myntra, AJIO, Nykaa, Tira`);
});
