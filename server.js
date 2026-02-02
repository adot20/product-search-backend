const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ========== GOOGLE SHOPPING SCRAPER ==========
async function searchGoogleShopping(query, siteFilter = '') {
  try {
    // Create Google Shopping search URL
    const searchQuery = siteFilter ? `${query} site:${siteFilter}.com` : query;
    const googleUrl = `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(searchQuery)}`;
    
    console.log(`[Google] Searching: ${searchQuery}`);
    
    const response = await axios.get(googleUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://www.google.com/'
      },
      timeout: 15000
    });
    
    const html = response.data;
    
    // Extract product data from Google Shopping results
    const products = [];
    
    // Method 1: Look for shopping result patterns
    const productPattern = /<div[^>]*class="[^"]*sh-dgr__grid-result[^"]*"[^>]*>([\s\S]*?)<\/div>/gi;
    let match;
    
    while ((match = productPattern.exec(html)) !== null && products.length < 10) {
      const productHtml = match[1];
      
      // Extract product link (Google redirect URL)
      const linkMatch = productHtml.match(/href="([^"]*)"/i);
      if (!linkMatch) continue;
      
      // Google redirect URL contains actual product URL
      const googleRedirectUrl = linkMatch[1];
      let productUrl = '';
      
      // Extract actual product URL from Google redirect
      if (googleRedirectUrl.includes('url=')) {
        const urlMatch = googleRedirectUrl.match(/url=([^&]+)/);
        if (urlMatch) {
          productUrl = decodeURIComponent(urlMatch[1]);
        }
      }
      
      // Extract title
      const titleMatch = productHtml.match(/<h3[^>]*>([^<]+)<\/h3>/i) || 
                        productHtml.match(/<div[^>]*role="heading"[^>]*>([^<]+)<\/div>/i);
      
      // Extract price
      const priceMatch = productHtml.match(/₹\s*[\d,]+(?:\.[\d]{2})?/);
      
      if (titleMatch && priceMatch && productUrl) {
        // Check which site this product belongs to
        const sitePatterns = {
          'amazon': /amazon\.in/i,
          'flipkart': /flipkart\.com/i,
          'myntra': /myntra\.com/i,
          'ajio': /ajio\.com/i,
          'nykaa': /nykaa\.com/i,
          'tira': /tirabeauty\.com/i
        };
        
        let productSite = '';
        for (const [site, pattern] of Object.entries(sitePatterns)) {
          if (pattern.test(productUrl)) {
            productSite = site;
            break;
          }
        }
        
        if (productSite) {
          products.push({
            site: productSite,
            title: titleMatch[1].trim(),
            price: priceMatch[0],
            url: productUrl,
            source: 'Google Shopping'
          });
        }
      }
    }
    
    // Method 2: Alternative pattern matching (fallback)
    if (products.length === 0) {
      const altPattern = /"(\/\/www\.google\.com\/shopping\/product\/[^"]+)"/g;
      const altMatches = html.match(altPattern);
      
      if (altMatches) {
        for (const match of altMatches.slice(0, 5)) {
          const productId = match.replace(/"/g, '');
          const productApiUrl = `https://www.google.com${productId}/about`;
          
          try {
            const productResponse = await axios.get(`https://www.google.com${productId}/about`, {
              headers: { 'User-Agent': 'Mozilla/5.0...' }
            });
            
            const productJsonMatch = productResponse.data.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/);
            if (productJsonMatch) {
              const productData = JSON.parse(productJsonMatch[1]);
              
              if (productData.url && productData.name && productData.offers?.price) {
                // Determine site from URL
                const url = productData.url;
                let site = '';
                
                if (url.includes('amazon.in')) site = 'amazon';
                else if (url.includes('flipkart.com')) site = 'flipkart';
                else if (url.includes('myntra.com')) site = 'myntra';
                else if (url.includes('ajio.com')) site = 'ajio';
                else if (url.includes('nykaa.com')) site = 'nykaa';
                else if (url.includes('tirabeauty.com')) site = 'tira';
                
                if (site) {
                  products.push({
                    site: site,
                    title: productData.name,
                    price: `₹${productData.offers.price}`,
                    url: url,
                    source: 'Google Shopping API'
                  });
                }
              }
            }
          } catch (e) {
            console.log('Product API fetch failed:', e.message);
          }
        }
      }
    }
    
    return products;
    
  } catch (error) {
    console.error('[Google Shopping] Error:', error.message);
    return [];
  }
}

// ========== HELPER FUNCTIONS ==========
function getSiteSearchUrl(site, query) {
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

// Site-specific search patterns for Google
function getSiteGoogleFilter(site) {
  const filters = {
    amazon: 'amazon.in',
    flipkart: 'flipkart.com',
    myntra: 'myntra.com',
    ajio: 'ajio.com',
    nykaa: 'nykaa.com',
    tira: 'tirabeauty.com'
  };
  return filters[site] || '';
}

// ========== ROUTES ==========
app.get('/', (req, res) => {
  res.json({ 
    status: 'running', 
    message: 'Product Search Backend - Google Shopping Edition',
    version: '3.0',
    features: ['Real product URLs', 'Actual prices from Google Shopping'],
    supported_sites: ['amazon', 'flipkart', 'myntra', 'ajio', 'nykaa', 'tira']
  });
});

app.post('/search', async (req, res) => {
  try {
    const { query, sites } = req.body;
    
    if (!query || !sites || sites.length === 0) {
      return res.status(400).json({ error: 'Missing query or sites' });
    }
    
    console.log(`🔍 Searching Google Shopping for: "${query}"`);
    
    // Get ALL products from Google Shopping
    const allProducts = await searchGoogleShopping(query);
    
    // Group products by site
    const productsBySite = {};
    allProducts.forEach(product => {
      if (!productsBySite[product.site]) {
        productsBySite[product.site] = [];
      }
      productsBySite[product.site].push(product);
    });
    
    // Prepare results for requested sites
    const results = [];
    
    for (const site of sites) {
      const siteProducts = productsBySite[site] || [];
      
      if (siteProducts.length > 0) {
        // Take the first (best matching) product for this site
        const bestProduct = siteProducts[0];
        
        results.push({
          site: site,
          title: bestProduct.title,
          price: bestProduct.price,
          rating: (Math.random() * 1.5 + 3.5).toFixed(1), // Random rating for now
          image: null,
          url: bestProduct.url, // ACTUAL PRODUCT URL!
          searchUrl: getSiteSearchUrl(site, query),
          source: bestProduct.source,
          note: '✅ Real product link'
        });
      } else {
        // Fallback: No product found on this site via Google Shopping
        results.push({
          site: site,
          title: `${query} on ${site}`,
          price: 'Check website',
          rating: null,
          url: getSiteSearchUrl(site, query), // Search URL as fallback
          searchUrl: getSiteSearchUrl(site, query),
          note: 'Search page (no specific product found)'
        });
      }
    }
    
    console.log(`✅ Found products for ${results.filter(r => r.note.includes('Real')).length} sites`);
    res.json({ results });
    
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ 
      error: 'Server error', 
      details: error.message,
      suggestion: 'Try a different search term'
    });
  }
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🔗 Google Shopping integration active`);
  console.log(`📊 Will fetch REAL product URLs and prices`);
});
