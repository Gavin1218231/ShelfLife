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
          'ean_reader',
          'ean_8_reader',
          'upc_reader',
          'upc_e_reader',
          'code_128_reader',
        ],
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

    if (/milk|cheese|yogurt|butter|cream|dairy/.test(combined)) return 'dairy';
    if (/meat|chicken|beef|pork|turkey|sausage|ham/.test(combined)) return 'meat';
    if (/fish|seafood|shrimp|salmon|tuna/.test(combined)) return 'seafood';
    if (/canned|can |soup/.test(combined)) return 'canned';
    if (/fruit|vegetable|produce|salad|lettuce|tomato|apple|banana/.test(combined)) return 'produce';
    if (/bread|grain|pasta|rice|cereal|flour|wheat/.test(combined)) return 'grains';
    if (/frozen|ice cream/.test(combined)) return 'frozen';
    if (/sauce|condiment|ketchup|mustard|mayo|dressing|oil|vinegar/.test(combined)) return 'condiments';
    if (/beverage|drink|juice|soda|water|tea|coffee/.test(combined)) return 'beverages';
    if (/snack|chip|cookie|candy|chocolate|cracker/.test(combined)) return 'snacks';
    return 'other';
  }

  return {
    isAvailable,
    start,
    stop,
    getIsRunning,
    lookupProduct,
  };
})();
