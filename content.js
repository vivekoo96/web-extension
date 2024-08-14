const yourTripPalUrls = 'https://yourtrippal.com';
const apiUrl = 'https://dev.yourtrippal.com/api/extension/coupon';

// Function to send POST request and get data
async function sendPostRequest(url, variable) {
  try {
    const formData = new FormData();
    formData.append('url', url);
    formData.append('variable', variable);

    const response = await fetch('https://dev.yourtrippal.com/api/fetch-variable', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      throw new Error(`Network response was not ok. Status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error:', error);
  }
}

// Function to get booking details from the URL
function getBookingDetails() {
  const urlParams = new URLSearchParams(window.location.search);
  const origin = urlParams.get('origin');
  const destination = urlParams.get('destination');
  const departureDate = urlParams.get('departure_date');
  return { origin, destination, departureDate };
}

// Function to fetch coupon data from API
async function fetchData() {
  try {
    const response = await fetch(apiUrl);
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch data:', error);
    return null;
  }
}

// Function to find minimum pass amount from the bus list
async function processData() {
  try {
    const url = window.location.href;
    const variable = 'defaultSearch';
    const data = await sendPostRequest(url, variable);

    if (data && data.defaultSearch && data.defaultSearch.searchedRouteList && data.defaultSearch.searchedRouteList.list) {
      const busList = data.defaultSearch.searchedRouteList.list;

      // Assuming we take the first item if there's a list
      const minBusPrice = busList.reduce((min, bus) => bus.pass_amount < min ? bus.pass_amount : min, Infinity);
      return { price: minBusPrice };
    } else {
      console.log('No data available or data structure is different');
      return null;
    }
  } catch (error) {
    console.error('Failed to fetch data:', error);
  }
}

// Function to compare prices
function comparePrices(ourBusPrice, yourTripPalPrice) {
  return {
    ourBusPrice: ourBusPrice.price,
    yourTripPalPrice: yourTripPalPrice.price
  };
}

// Function to fetch YourTripPal prices
function fetchYourTripPalPrices(bookingDetails) {
  const yourTripPalApiUrl = 'https://dev.yourtrippal.com/api/extension/getPrices';
  return fetch(
      `${yourTripPalApiUrl}?origin=${bookingDetails.origin}&destination=${bookingDetails.destination}&date=${bookingDetails.departureDate}`
  )
      .then(response => response.json())
      .then(data => data.prices) // Assume you get one price object
      .catch(error => {
        console.error('Error fetching YourTripPal prices:', error);
        return null;
      });
}

// Function to show the popup
function showPopup(comparisonResults, couponCode) {
  const popupDiv = document.createElement('div');
  popupDiv.style.position = 'fixed';
  popupDiv.style.top = '10px';
  popupDiv.style.right = '10px';
  popupDiv.style.width = '300px';
  popupDiv.style.height = '500px';
  popupDiv.style.border = '1px solid #ccc';
  popupDiv.style.zIndex = '10000';
  popupDiv.style.backgroundColor = '#ffffff';
  popupDiv.style.padding = '15px';
  popupDiv.style.fontFamily = 'Arial, sans-serif';
  popupDiv.style.textAlign = 'center';
  popupDiv.style.borderRadius = '10px';
  popupDiv.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.2)';
  popupDiv.style.overflow = 'auto';
  popupDiv.style.boxSizing = 'border-box';

  const logo = document.createElement('img');
  logo.src = 'https://www.yourtrippal.com/images/yourtrippal%20LOGO..-01@2x.png';
  logo.alt = 'YourTripPal Logo';
  logo.style.width = '100px';
  logo.style.margin = '15px 0';

  const couponContainer = document.createElement('div');
  couponContainer.style.background =
      'linear-gradient(to top, #FF7F00 0%, #011950 70%, #011950 100%)';
  couponContainer.style.borderRadius = '10px';
  couponContainer.style.color = 'white';
  couponContainer.style.padding = '15px';
  couponContainer.innerHTML = `
    <h5>To get the cheapest price on YourTripPal, use Coupon Code "<span style="text-decoration: underline;">${couponCode}</span>" on YourTripPal!</h5>
    <a href="${yourTripPalUrls}?coupon=${couponCode}" target="_blank" class="text-dark fw-semibold w-100 rounded" style="background:orange; font-size: 18px; text-decoration:none; padding:7px 15px; color:white; display:inline-block; margin: 10px 0;">${couponCode}</a>
  `;

  const comparisonContainer = document.createElement('div');
  comparisonContainer.className = 'container';
  comparisonContainer.innerHTML = `
    <h5 class="text-warning">Price Comparison with YourTrippal</h5>
    <div style="display: flex; flex-wrap: wrap;">
     <div style="flex: 1 1 100%; padding: 5px; background: #343a40; color: white; margin-bottom: 4px; border: 1px solid #dee2e6; border-radius: 7px; box-sizing: border-box;">
        YourTripPal Price: $${comparisonResults.yourTripPalPrice.toFixed(2)}
      </div>
      <div style="flex: 1 1 100%; padding: 5px; background: #f8f9fa; border: 1px solid #dee2e6; margin-bottom: 4px; border-radius: 7px; box-sizing: border-box;">
        OurBus Price: $${comparisonResults.ourBusPrice.toFixed(2)}
      </div>
     
      <div style="flex: 1 1 100%; padding: 10px; margin-top:10px; background: orange; color: white; border-radius: 5px; box-sizing: border-box;">
        <a href="${yourTripPalUrls}?coupon=${couponCode}" target="_blank" style="color: white; text-decoration: none;">Book with YourTripPal</a>
      </div>
    </div>
  `;

  popupDiv.appendChild(logo);
  popupDiv.appendChild(couponContainer);
  popupDiv.appendChild(comparisonContainer);

  document.body.appendChild(popupDiv);
}

// Main function to fetch data and create the popup
(async () => {
  try {
    const bookingDetails = getBookingDetails();
    const ourBusPrice = await processData();
    const couponData = await fetchData();

    if (ourBusPrice && couponData && couponData.coupon) {
      const yourTripPalPrice = await fetchYourTripPalPrices(bookingDetails);
      if (yourTripPalPrice) {
        const comparisonResults = comparePrices(ourBusPrice, yourTripPalPrice);
        showPopup(comparisonResults, couponData.coupon.code);
      } else {
        console.error('Failed to fetch YourTripPal price.');
      }
    } else {
      console.error('No coupon data available or API call failed.');
    }
  } catch (error) {
    console.error('Failed to process data:', error);
  }
})();
