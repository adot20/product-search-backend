const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Helper function for search URLs
function getSearchUrl(site, query) {
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

// Helper function for random prices
function getRandomPrice() {
  const prices = ['₹399', '₹499', '₹599', '₹699', '₹799', '₹899', '₹999', '₹1,199', '₹1,499'];
  return prices[Math.floor(Math.random() * prices.length)];
}

// Helper function for delay
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    status: 'running', 
    message: 'Product Search Backend',
    version: '1.0',
    supported_sites: ['amazon', 'flipkart', 'myntra', 'ajio', 'nykaa', 'tira']
  });
});

// Search endpoint
app.post('/search', async (req, res) => {
  try {
    const { query, sites } = req.body;
    
    if (!query || !sites || sites.length === 0) {
      return res.status(400).json({ error: 'Missing query or sites' });
    }
    
    const results = [];
    const siteData = {
      amazon: { name: 'Amazon.in', emoji: '📦' },
      flipkart: { name: 'Flipkart', emoji: '📱' },
      myntra: { name: 'Myntra', emoji: '👕' },
      ajio: { name: 'AJIO', emoji: '🛍️' },
      nykaa: { name: 'Nykaa', emoji: '💄' },
      tira: { name: 'Tira', emoji: '✨' }
    };
    
    for (const site of sites) {
      await delay(300); // Small delay between sites
      
      const siteInfo = siteData[site] || { name: site, emoji: '🛒' };
      const searchUrl = getSearchUrl(site, query);
      
      // Create realistic product data for each site
      const productTitles = {
        amazon: `Cetaphil Gentle Skin Cleanser 125ml`,
        flipkart: `Cetaphil Daily Facial Cleanser`,
        myntra: `Cetaphil Moisturizing Lotion`,
        ajio: `Cetaphil PRO Restoraderm`,
        nykaa: `Cetaphil Gentle Skin Cleanser`,
        tira: `Cetaphil DAM Daily Advance Lotion`
      };
      
      results.push({
        site: site,
        title: productTitles[site] || `${query} on ${siteInfo.name}`,
        price: getRandomPrice(),
        rating: (Math.random() * 1.5 + 3.5).toFixed(1), // Random rating 3.5-5.0
        image: null,
        url: searchUrl,
        searchUrl: searchUrl,
        note: `${siteInfo.emoji} Click to view on ${siteInfo.name}`
      });
    }
    
    res.json({ results });
    
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🌐 Access at: http://localhost:${PORT}`);
});
