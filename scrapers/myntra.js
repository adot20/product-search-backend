const axios = require('axios');

async function scrapeMyntra(query) {
  // Skip API (returns 401), go straight to HTML scraping
  const cheerio = require('cheerio');
  const htmlUrl = `https://www.myntra.com/${encodeURIComponent(query)}`;
  
  try {
    const response = await axios.get(htmlUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Referer': 'https://www.google.com/',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'cross-site',
        'Sec-Fetch-User': '?1',
        'Cache-Control': 'max-age=0'
      },
      timeout: 20000 // Increased to 20 seconds
    });
    
    const $ = cheerio.load(response.data);
    
    // Try to find product data in script tags (Myntra embeds JSON)
    const scripts = $('script').toArray();
    for (const script of scripts) {
      const content = $(script).html();
      if (content && (content.includes('searchData') || content.includes('pdpData'))) {
        try {
          // Extract JSON from window.__myx = {...}
          const match = content.match(/window\.__myx\s*=\s*({.+?});/s);
          if (match) {
            const data = JSON.parse(match[1]);
            if (data.searchData && data.searchData.results && data.searchData.results.products) {
              const products = data.searchData.results.products;
              if (products.length > 0) {
                const product = products[0];
                return {
                  title: `${product.brand} ${product.product}`.trim(),
                  price: product.price ? `₹${product.price}` : product.discountedPrice ? `₹${product.discountedPrice}` : 'Check website',
                  rating: product.rating ? product.rating.toString() : '4.0',
                  image: product.searchImage || product.images?.[0]?.src || null,
                  url: `https://www.myntra.com/${product.landingPageUrl || product.productId}`,
                  searchUrl: htmlUrl
                };
              }
            }
          }
        } catch (e) {
          // Continue to next script
        }
      }
    }
    
    // Fallback: HTML scraping
    const product = $('.product-base, .product-productMetaInfo, li[class*="product-"]').first();
    if (product.length) {
      const brand = product.find('.product-brand, h3[class*="brand"], .brand-name').text().trim();
      const name = product.find('.product-product, h4[class*="product"], .product-name').text().trim();
      const price = product.find('.product-discountedPrice, .product-price, [class*="discountedPrice"]').text().trim();
      const image = product.find('img').attr('src') || product.find('img').attr('data-src');
      const link = product.find('a').attr('href');
      
      if (brand || name || price) {
        return {
          title: `${brand} ${name}`.trim() || query,
          price: price || 'Check website',
          rating: '4.0',
          image: image || null,
          url: link ? (link.startsWith('http') ? link : `https://www.myntra.com${link}`) : htmlUrl,
          searchUrl: htmlUrl
        };
      }
    }
    
    return null;
  } catch (error) {
    console.error('[Myntra] Error:', error.message);
    return null;
  }
}

module.exports = { scrapeMyntra };
