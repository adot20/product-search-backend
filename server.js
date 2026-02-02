const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// REAL search URLs that actually work
function getRealSearchUrl(site, query) {
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

// Realistic mock data based on actual shopping patterns
function getSmartMockData(query, site) {
  const products = {
    'cetaphil cleanser': {
      amazon: { price: '₹499', title: 'Cetaphil Gentle Skin Cleanser 125ml' },
      flipkart: { price: '₹459', title: 'Cetaphil Daily Facial Cleanser' },
      myntra: { price: '₹599', title: 'Cetaphil Moisturizing Cream' },
      ajio: { price: '₹899', title: 'Cetaphil PRO Restoraderm' },
      nykaa: { price: '₹425', title: 'Cetaphil Gentle Skin Cleanser' },
      tira: { price: '₹675', title: 'Cetaphil DAM Daily Advance Lotion' }
    },
    'iphone 15': {
      amazon: { price: '₹79,900', title: 'Apple iPhone 15 (128 GB)' },
      flipkart: { price: '₹78,999', title: 'Apple iPhone 15' },
      myntra: { price: 'Not available', title: 'Phones not sold on Myntra' },
      ajio: { price: 'Not available', title: 'Phones not sold on AJIO' },
      nykaa: { price: 'Not available', title: 'Phones not sold on Nykaa' },
      tira: { price: 'Not available', title: 'Phones not sold on Tira' }
    }
  };
  
  const queryLower = query.toLowerCase();
  let matchedProduct = null;
  
  // Find best matching product
  for (const [key, data] of Object.entries(products)) {
    if (queryLower.includes(key)) {
      matchedProduct = data[site];
      break;
    }
  }
  
  // Default if no match
  if (!matchedProduct) {
    matchedProduct = {
      title: `Search results for ${query}`,
      price: 'Click to check price',
      rating: '4.0'
    };
  }
  
  return {
    title: matchedProduct.title,
    price: matchedProduct.price,
    rating: matchedProduct.rating || '4.0',
    url: getRealSearchUrl(site, query),
    searchUrl: getRealSearchUrl(site, query),
    note: matchedProduct.price === 'Not available' ? '❌ Not sold here' : '🔍 Click to view search'
  };
}

app.get('/', (req, res) => {
  res.json({ 
    status: 'running', 
    message: 'Product Search Assistant',
    version: '1.0',
    what_it_does: 'Opens real searches on shopping sites with estimated prices'
  });
});

app.post('/search', (req, res) => {
  const { query, sites } = req.body;
  
  if (!query) return res.status(400).json({ error: 'Need search query' });
  
  const results = sites.map(site => ({
    site: site,
    ...getSmartMockData(query, site)
  }));
  
  res.json({ results });
});

app.listen(PORT, () => {
  console.log(`✅ Search Assistant running on port ${PORT}`);
});
