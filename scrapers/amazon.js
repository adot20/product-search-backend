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
        '--disable-gpu',
        '--disable-software-rasterizer',
        '--disable-dev-tools',
        '--no-first-run',
        '--no-zygote',
        '--single-process'
      ]
    });
    

    const page = await browser.newPage();
    
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    const searchUrl = `https://www.amazon.in/s?k=${encodeURIComponent(query)}`;
    console.log(`[Amazon] Navigating to: ${searchUrl}`);
    
    await page.goto(searchUrl, { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    await page.waitForSelector('[data-component-type="s-search-result"]', { timeout: 10000 });
    
    const productData = await page.evaluate(() => {
      const items = document.querySelectorAll('[data-component-type="s-search-result"]');
      
      for (let i = 0; i < items.length && i < 10; i++) {
        const item = items[i];
        
        if (item.textContent.toLowerCase().includes('sponsored')) {
          continue;
        }
        
        const link = item.querySelector('h2 a') || 
                     item.querySelector('a.a-link-normal[href*="/dp/"]') ||
                     item.querySelector('a[href*="/dp/"]');
        
        if (!link) continue;
        
        const titleSpan = link.querySelector('span.a-text-normal') || 
                         link.querySelector('h2 span') ||
                         link.querySelector('span');
        
        const title = titleSpan ? titleSpan.textContent.trim() : '';
        
        if (!title || title.length < 10) continue;
        
        let price = null;
        const priceWhole = item.querySelector('.a-price-whole');
        if (priceWhole) {
          const priceFrac = item.querySelector('.a-price-fraction');
          price = `₹${priceWhole.textContent.trim()}${priceFrac ? priceFrac.textContent.trim() : ''}`;
        }
        
        const ratingEl = item.querySelector('.a-icon-alt');
        const rating = ratingEl ? ratingEl.textContent.split(' ')[0] : null;
        
        const img = item.querySelector('img.s-image');
        const image = img ? img.src : null;
        
        const url = link.href;
        
        return { title, price, rating, image, url };
      }
      
      return null;
    });
    
    if (!productData) {
      console.log('[Amazon] No product found');
      return {
        site: 'amazon',
        error: true,
        message: 'No products found',
        searchUrl
      };
    }
    
    console.log('[Amazon] Product found:', productData.title.substring(0, 50));
    
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

