const puppeteer = require('puppeteer');

async function scrapeAmazon(query) {
  console.log(`[Amazon] Scraping for: ${query}`);
  
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
    });
    
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    const searchUrl = `https://www.amazon.in/s?k=${encodeURIComponent(query)}`;
    console.log(`[Amazon] Navigating to: ${searchUrl}`);
    
    await page.goto(searchUrl, { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    });
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // More flexible extraction - try multiple strategies
    const productData = await page.evaluate(() => {
      // Strategy 1: Look for any product link with /dp/ in href
      const allLinks = Array.from(document.querySelectorAll('a[href*="/dp/"]'));
      
      for (const link of allLinks) {
        // Skip if it's just a tiny link
        const rect = link.getBoundingClientRect();
        if (rect.width < 100 || rect.height < 50) continue;
        
        // Get all text in this link area
        const fullText = link.textContent || '';
        
        // Skip if no substantial text
        if (fullText.length < 20) continue;
        
        // Try to find title - look for any span with substantial text
        const spans = link.querySelectorAll('span');
        let title = '';
        
        for (const span of spans) {
          const text = span.textContent.trim();
          // Look for the longest meaningful text
          if (text.length > title.length && text.length > 15 && text.length < 200) {
            // Avoid price-like text
            if (!text.startsWith('₹') && !text.startsWith('$')) {
              title = text;
            }
          }
        }
        
        if (!title || title.length < 10) continue;
        
        // Find price in the parent container
        const parent = link.closest('[data-component-type="s-search-result"]') || link.parentElement;
        
        let price = null;
        if (parent) {
          const priceWhole = parent.querySelector('.a-price-whole');
          if (priceWhole) {
            const priceFrac = parent.querySelector('.a-price-fraction');
            price = `₹${priceWhole.textContent.trim()}${priceFrac ? priceFrac.textContent.trim() : ''}`;
          }
        }
        
        // Rating
        let rating = null;
        if (parent) {
          const ratingEl = parent.querySelector('.a-icon-alt');
          if (ratingEl) {
            rating = ratingEl.textContent.split(' ')[0];
          }
        }
        
        // Image
        const img = link.querySelector('img') || (parent ? parent.querySelector('img') : null);
        const image = img ? img.src : null;
        
        // URL
        const url = link.href;
        
        // Return first valid product
        return { title, price, rating, image, url };
      }
      
      return null;
    });
    
    if (!productData) {
      return {
        site: 'amazon',
        error: true,
        message: 'Could not extract product data',
        searchUrl
      };
    }
    
    console.log('[Amazon] Found:', productData.title.substring(0, 50));
    
    return {
      site: 'amazon',
      ...productData,
      searchUrl
    };
    
  } catch (error) {
    console.error('[Amazon] Error:', error.message);
    return {
      site: 'amazon',
      error: true,
      message: error.message,
      searchUrl: `https://www.amazon.in/s?k=${encodeURIComponent(query)}`
    };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

module.exports = scrapeAmazon;
