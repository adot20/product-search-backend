const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ========== WORKING SCRAPERS ONLY ==========

// 1. MYNTRA - Usually works
async function scrapeMyntra(query) {
  try {
    const searchUrl = `https://www.myntra.com/${encodeURIComponent(query)}`;
    console.log(`[Myntra] Fetching: ${searchUrl}`);
    
    const response = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html',
        'Accept-Language': 'en-US,en;q=0.9'
      },
      timeout: 15000
    });
    
    const $ = cheerio.load(response.data);
    
    // Find first product
    const productElement = $('.product-base').first();
    
    if (productElement.length === 0) {
      throw new Error('No products found');
    }
    
    // Extract details
    const brand = productElement.find('.product-brand').text().trim();
    const name = productElement.find('.product-product').text().trim();
    const price = productElement.find('.product-discountedPrice').text().trim() || 
                  productElement.find('.product-price').text().trim();
    
    const linkElement = productElement.find('a').first();
    const productPath = linkElement.attr('href');
    const productUrl = productPath ? `https://www.myntra.com${productPath}` : searchUrl;
    
    // Get image
    const imgElement = productElement.find('img').first();
    const imageUrl = imgElement.attr('src') || imgElement.attr('data-src');
    
    return {
      success: true,
      title: `${brand} ${name}`.trim(),
      price: price,
      rating: productElement.find('.product-ratingsContainer').text().trim() || '4.0',
      image: imageUrl,
      url: productUrl,
      searchUrl: searchUrl
    };
    
  } catch (error) {
    console.error('[Myntra] Failed:', error.message);
    return {
      success: false,
      searchUrl: `https://www.myntra.com/${encodeURIComponent(query)}`
    };
  }
}

// 2. TIRA - Usually works
async function scrapeTira(query) {
  try {
    const searchUrl = `https://www.tirabeauty.com/search?q=${encodeURIComponent(query)}`;
    console.log(`[Tira] Fetching: ${searchUrl}`);
    
    const response = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html',
        'Accept-Language': 'en-US,en;q=0.9'
      },
      timeout: 15000
    });
    
    const $ = cheerio.load(response.data);
    
    // Find product link
    const productLink = $('a[href*="/p/"]').first();
    
    if (productLink.length === 0) {
      throw new Error('No product links found');
    }
    
    const productPath = productLink.attr('href');
    const productUrl = productPath ? `https://www.tirabeauty.com${productPath}` : searchUrl;
    
    // Get product page for details
    const productResponse = await axios.get(productUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 15000
    });
    
    const product$ = cheerio.load(productResponse.data);
    
    const title = product$('h1').first().text().trim() || 
                  product$('[class*="product-title"]').first().text().trim();
    
    const price = product$('[class*="price"]').first().text().trim() ||
                  product$('[class*="selling-price"]').first().text().trim();
    
    const image = product$('img[class*="product-image"]').first().attr('src') ||
                  product$('img[alt*="product"]').first().attr('src');
    
    return {
      success: true,
      title: title || query,
      price: price || 'Price not available',
      rating: '4.0',
      image: image,
      url: productUrl,
      searchUrl: searchUrl
    };
    
  } catch (error) {
    console.error('[Tira] Failed:', error.message);
    return {
      success: false,
      searchUrl: `https://www.tirabeauty.com/search?q=${encodeURIComponent(query)}`
    };
  }
}

// 3. AJIO - Try simple approach
async function scrapeAjio(query) {
  try {
    const searchUrl = `https://www.ajio.com/search/?text=${encodeURIComponent(query)}`;
    console.log(`[AJIO] Fetching: ${searchUrl}`);
    
    const response = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://www.ajio.com/'
      },
      timeout: 15000
    });
    
    const $ = cheerio.load(response.data);
    
    // Find product
    const productElement = $('[class*="product"]').first() || $('.item').first();
    
    if (productElement.length === 0) {
      throw new Error('No products found');
    }
    
    const title = productElement.find('[class*="name"]').text().trim() ||
                  productElement.find('[class*="title"]').text().trim();
    
    const price = productElement.find('[class*="price"]').text().trim();
    
    const linkElement = productElement.find('a').first();
    const productPath = linkElement.attr('href');
    const productUrl = productPath ? `https://www.ajio.com${productPath}` : searchUrl;
    
    const image = productElement.find('img').first().attr('src') ||
                  productElement.find('img').first().attr('data-src');
    
    return {
      success: true,
      title: title || query,
      price: price || 'Check website',
      rating: null,
      image: image,
      url: productUrl,
      searchUrl: searchUrl
    };
    
  } catch (error) {
    console.error('[AJIO] Failed:', error.message);
    return {
      success: false,
      searchUrl: `https://www.ajio.com/search/?text=${encodeURIComponent(query)}`
    };
  }
}

// 4. NYKAA - Try simple approach
async function scrapeNykaa(query) {
  try {
    const searchUrl = `https://www.nykaa.com/search/result/?q=${encodeURIComponent(query)}`;
    console.log(`[Nykaa] Fetching: ${searchUrl}`);
    
    const response = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html',
        'Accept-Language': 'en-US,en;q=0.9'
      },
      timeout: 15000
    });
    
    const $ = cheerio.load(response.data);
    
    // Find product
    const productElement = $('[class*="product"]').first() || 
                          $('.product-item').first();
    
    if (productElement.length === 0) {
      throw new Error('No products found');
    }
    
    const title = productElement.find('[class*="title"]').text().trim() ||
                  productElement.find('[class*="name"]').text().trim();
    
    const price = productElement.find('[class*="price"]').text().trim();
    
    const linkElement = productElement.find('a').first();
    const productPath = linkElement.attr('href');
    const productUrl = productPath ? `https://www.nykaa.com${productPath}` : searchUrl;
    
    const image = productElement.find('img').first().attr('src');
    
    return {
      success: true,
      title: title || query,
      price: price || 'Check website',
      rating: productElement.find('[class*="rating"]').text().trim(),
      image: image,
      url: productUrl,
      searchUrl: searchUrl
    };
    
  } catch (error) {
    console.error('[Nykaa] Failed:', error.message);
    return {
      success: false,
      searchUrl: `https://www.nykaa.com/search/result/?q=${encodeURIComponent(query)}`
    };
  }
}

// ========== ROUTES ==========

app.get('/', (req, res) => {
  res.json({ 
    status: 'running',
    service: 'Easy Sites Scraper',
    sites_supported: ['myntra', 'tira', 'ajio', 'nykaa'],
    note: 'Amazon/Flipkart handled by Chrome extension directly'
  });
});

app.post('/search-easy-sites', async (req, res) => {
  try {
    const { query, sites } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'Query required' });
    }
    
    // Only process easy sites
    const easySites = ['myntra', 'tira', 'ajio', 'nykaa'];
    const sitesToProcess = sites.filter(site => easySites.includes(site));
    
    if (sitesToProcess.length === 0) {
      return res.json({ results: [] });
    }
    
    const scrapers = {
      myntra: scrapeMyntra,
      tira: scrapeTira,
      ajio: scrapeAjio,
      nykaa: scrapeNykaa
    };
    
    const results = [];
    
    for (const site of sitesToProcess) {
      const scraper = scrapers[site];
      if (scraper) {
        const result = await scraper(query);
        results.push({
          site: site,
          ...result
        });
        
        // Be polite - delay between requests
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    res.json({ results });
    
  } catch (error) {
    console.error('Easy sites search error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Easy Sites Backend running on port ${PORT}`);
  console.log(`🎯 Supported: Myntra, Tira, AJIO, Nykaa`);
  console.log(`⚡ Amazon/Flipkart: Use Chrome extension directly`);
});
