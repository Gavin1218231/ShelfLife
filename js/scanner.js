/**
 * Scanner — Barcode scanning via device camera using QuaggaJS,
 * with product lookup via Open Food Facts API.
 */
const Scanner = (() => {
  let isRunning = false;

  function isAvailable() {
    return typeof Quagga !== 'undefined' && !!navigator.mediaDevices;
  }

  function start(viewportId, onDetected) {
    if (!isAvailable()) {
      onDetected({ error: 'Camera or barcode library not available.' });
      return;
    }

    if (isRunning) return;

    Quagga.init({
      inputStream: {
        name: 'Live',
        type: 'LiveStream',
        target: document.querySelector('#' + viewportId),
        constraints: {
          facingMode: 'environment',
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
      },
      decoder: {
        readers: [
          // Common grocery barcodes
          'ean_reader',           // EAN-13 (European Article Number)
          'ean_8_reader',         // EAN-8 (short form)
          'upc_reader',           // UPC-A (US/Canada)
          'upc_e_reader',         // UPC-E (compressed)
          // Industrial/logistics
          'code_128_reader',      // Code 128 (versatile)
          'code_39_reader',       // Code 39 (alphanumeric)
          'code_93_reader',       // Code 93 (compact Code 39)
          'codabar_reader',       // Codabar (libraries, blood banks)
          'i2of5_reader',         // Interleaved 2 of 5 (shipping)
          '2of5_reader',          // Industrial 2 of 5
        ],
      },
      locator: {
        patchSize: 'medium',
        halfSample: true,
      },
      locate: true,
      frequency: 10,
    }, (err) => {
      if (err) {
        onDetected({ error: 'Could not start camera: ' + err.message });
        return;
      }
      isRunning = true;
      Quagga.start();
    });

    // Collect multiple reads and use most frequent for accuracy
    const codeBuffer = [];
    const BUFFER_SIZE = 5;

    Quagga.onDetected((result) => {
      const code = result.codeResult.code;
      if (!code) return;

      codeBuffer.push(code);

      if (codeBuffer.length >= BUFFER_SIZE) {
        // Find most common code in buffer
        const freq = {};
        codeBuffer.forEach(c => { freq[c] = (freq[c] || 0) + 1; });
        const bestCode = Object.entries(freq).sort((a, b) => b[1] - a[1])[0][0];

        // Clear buffer and stop scanning temporarily
        codeBuffer.length = 0;
        stop();
        lookupProduct(bestCode, onDetected);
      }
    });
  }

  function stop() {
    if (isRunning) {
      Quagga.stop();
      isRunning = false;
    }
  }

  function getIsRunning() {
    return isRunning;
  }

  /**
   * Look up a barcode via Open Food Facts API.
   */
  async function lookupProduct(barcode, callback) {
    try {
      const response = await fetch(
        `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`
      );
      const data = await response.json();

      if (data.status === 1 && data.product) {
        const product = data.product;
        callback({
          barcode,
          name: product.product_name || product.product_name_en || 'Unknown Product',
          brand: product.brands || '',
          category: guessCategory(product),
          location: guessLocation(product),
          quantity: product.quantity || '',
          image: product.image_url || null,
        });
      } else {
        callback({
          barcode,
          error: `Product not found for barcode: ${barcode}`,
        });
      }
    } catch (err) {
      callback({
        barcode,
        error: 'Network error looking up product. Please enter details manually.',
      });
    }
  }

  /**
   * Try to map Open Food Facts categories to our category list.
   */
  function guessCategory(product) {
    const cats = (product.categories_tags || []).join(' ').toLowerCase();
    const name = (product.product_name || '').toLowerCase();
    const combined = cats + ' ' + name;

    // Order matters: more specific checks first
    if (/milk|cheese|yogurt|butter|cream|dairy/.test(combined)) return 'dairy';
    if (/egg/.test(combined)) return 'eggs';
    if (/meat|chicken|beef|pork|turkey|sausage|ham|bacon/.test(combined)) return 'meat';
    if (/fish|seafood|shrimp|salmon|tuna|crab|lobster/.test(combined)) return 'seafood';
    if (/canned|can |soup|tinned/.test(combined)) return 'canned';
    if (/fruit/.test(combined)) return 'fruits';
    if (/vegetable|lettuce|tomato|carrot|broccoli|spinach/.test(combined)) return 'vegetables';
    if (/herb|basil|oregano|parsley|cilantro|mint/.test(combined)) return 'herbs';
    if (/bread|bakery|baguette|roll|croissant|muffin/.test(combined)) return 'bread';
    if (/pasta|noodle|spaghetti|penne|rice|grain|quinoa/.test(combined)) return 'grains';
    if (/cereal|oat|breakfast|granola/.test(combined)) return 'cereal';
    if (/frozen|ice cream/.test(combined)) return 'frozen';
    if (/sauce|condiment|ketchup|mustard|mayo|dressing/.test(combined)) return 'condiments';
    if (/oil|vinegar|olive/.test(combined)) return 'oils';
    if (/spice|seasoning|pepper|salt|cumin|paprika/.test(combined)) return 'spices';
    if (/coffee|tea|espresso/.test(combined)) return 'coffee';
    if (/beverage|drink|juice|soda|water/.test(combined)) return 'beverages';
    if (/wine|beer|alcohol|spirit|liquor/.test(combined)) return 'alcohol';
    if (/snack|chip|cracker|pretzel|popcorn/.test(combined)) return 'snacks';
    if (/candy|chocolate|sweet|gummy/.test(combined)) return 'candy';
    if (/nut|seed|almond|cashew|peanut/.test(combined)) return 'nuts';
    if (/jam|jelly|spread|nutella|peanut butter/.test(combined)) return 'spreads';
    if (/baking|flour|sugar|yeast|baking powder/.test(combined)) return 'baking';
    if (/dried|legume|bean|lentil|chickpea/.test(combined)) return 'dried';
    if (/deli|prepared|ready to eat|meal/.test(combined)) return 'deli';
    if (/baby|infant/.test(combined)) return 'baby';
    if (/pet|dog|cat/.test(combined)) return 'pet';
    if (/vitamin|supplement/.test(combined)) return 'health';
    return 'other';
  }

  /**
   * Guess storage location based on product type.
   */
  function guessLocation(product) {
    const cats = (product.categories_tags || []).join(' ').toLowerCase();
    const name = (product.product_name || '').toLowerCase();
    const storage = (product.conservation_conditions || '').toLowerCase();
    const combined = cats + ' ' + name + ' ' + storage;

    if (/frozen|ice cream/.test(combined)) return 'freezer';
    if (/refrigerat|chill|cold|fresh|dairy|milk|cheese|yogurt|meat|chicken|fish|seafood|deli|egg/.test(combined)) return 'fridge';
    if (/wine|cellar/.test(combined)) return 'wineCellar';
    if (/spice|seasoning|herb/.test(combined)) return 'spiceRack';
    if (/room temperature|dry place|pantry|canned|dried|pasta|rice|cereal|snack|candy|baking/.test(combined)) return 'pantry';
    return 'pantry';
  }

  return {
    isAvailable,
    start,
    stop,
    getIsRunning,
    lookupProduct,
  };
})();
