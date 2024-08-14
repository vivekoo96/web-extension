const yourTripPalUrls = 'https://yourtrippal.com'
const logoUrl = chrome.runtime.getURL('icons/logo.png')
const apiUrl = 'https://dev.yourtrippal.com/api/extension/coupon'

// Function to extract defaultSearch from a script tag
function extractDefaultSearch() {
  const scriptTags = document.querySelectorAll('script')
  for (const script of scriptTags) {
    const textContent = script.textContent || ''
    if (textContent.includes('defaultSearch')) {
      // Extract the JSON-like string from the script content
      const match = textContent.match(/defaultSearch\s*=\s*('.*?');/)
      if (match && match[1]) {
        return match[1].replace(/'/g, '"')
      }
    }
  }
  return null
}

// Function to get pass amounts
function getPassAmounts() {
  console.log('Script Loaded')

  const dataString = extractDefaultSearch()
  console.log('Data String:', dataString)

  if (!dataString) {
    console.error('defaultSearch is not available.')
    return
  }

  try {
    // Parse the JSON string
    const data = JSON.parse(dataString)
    console.log('Parsed Data:', data)

    if (
      typeof data === 'object' &&
      data.searchedRouteList &&
      Array.isArray(data.searchedRouteList.list)
    ) {
      const passAmounts = data.searchedRouteList.list.map(
        (route) => route.pass_amount
      )
      console.log('Pass Amounts:', passAmounts)

      // Send the pass amounts to the background script
      chrome.runtime.sendMessage({
        action: 'passAmountData',
        passAmounts: passAmounts,
      })
    } else {
      console.error('Data structure is not available or invalid.')
    }
  } catch (error) {
    console.error('Error parsing JSON:', error)
  }
}

// Ensure the function runs when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
  getPassAmounts()
})

function fetchYourTripPalPrices(bookingDetails) {
  const yourTripPalApiUrl =
    'https://dev.yourtrippal.com/api/extension/getPrices'
  return fetch(
    `${yourTripPalApiUrl}?origin=${bookingDetails.origin}&destination=${bookingDetails.destination}&date=${bookingDetails.departureDate}`
  )
    .then((response) => response.json())
    .then((data) => data.prices)
    .catch((error) => {
      console.error('Error fetching YourTripPal prices:', error)
      return []
    })
}

// Function to compare prices
function comparePrices(ourBusPrices, yourTripPalPrices) {
  let result = []
  ourBusPrices.forEach((bus) => {
    const yourTripPalPrice = yourTripPalPrices.find(
      (price) => price.busId === bus.busId
    )
    if (yourTripPalPrice) {
      result.push({ ...bus, yourTripPalPrice: yourTripPalPrice.price })
    }
  })
  return result
}

// Function to show the popup
function showPopup(comparisonResults, couponCode) {
  // Create the container for the popup
  const popupDiv = document.createElement('div')
  popupDiv.style.position = 'fixed'
  popupDiv.style.top = '10px'
  popupDiv.style.right = '10px'
  popupDiv.style.width = '300px'
  popupDiv.style.height = '500px'
  popupDiv.style.border = '1px solid #ccc'
  popupDiv.style.zIndex = '10000'
  popupDiv.style.backgroundColor = '#ffffff'
  popupDiv.style.padding = '15px'
  popupDiv.style.fontFamily = 'Arial, sans-serif'
  popupDiv.style.textAlign = 'center'
  popupDiv.style.borderRadius = '10px'
  popupDiv.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.2)'
  popupDiv.style.overflow = 'auto'
  popupDiv.style.boxSizing = 'border-box'

  // Create the logo
  const logo = document.createElement('img')
  logo.src = 'https://www.yourtrippal.com/images/yourtrippal%20LOGO..-01@2x.png'
  logo.alt = 'YourTripPal Logo'
  logo.style.width = '100px'
  logo.style.margin = '15px 0'

  // Create the coupon code container
  const couponContainer = document.createElement('div')
  couponContainer.style.background =
    'linear-gradient(to top, #FF7F00 0%, #011950 70%, #011950 100%)'
  couponContainer.style.borderRadius = '10px'
  couponContainer.style.color = 'white'
  couponContainer.style.padding = '15px'
  couponContainer.innerHTML = `
      <h5>To get the cheapest price on YourTripPal, use Coupon Code "<span style="text-decoration: underline;">${couponCode}</span>" on YourTripPal!</h5>
      <a href="${yourTripPalUrls}?coupon=${couponCode}" target="_blank" class="text-dark fw-semibold w-100 rounded" style="background:orange; font-size: 18px; text-decoration:none; padding:7px 15px; color:white; display:inline-block; margin: 10px 0;">${couponCode}</a>
    `

  // Create the comparison container
  const comparisonContainer = document.createElement('div')
  comparisonContainer.className = 'container'
  let comparisonHTML =
    '<h5 class="text-warning">Price Comparison</h5><div style="display: flex; flex-wrap: wrap;">'

  comparisonResults.forEach((result) => {
    comparisonHTML += `
      <div style="flex: 1 1 100%; padding: 5px; background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 7px; box-sizing: border-box;">
        ${result.src} to ${result.dest} (${result.departureDate})
      </div>
      <div style="flex: 1 1 100%; padding: 5px; background: #343a40; color: white; border: 1px solid #dee2e6; border-radius: 7px; box-sizing: border-box;">
        OurBus: $${result.price.toFixed(
          2
        )} vs. YourTripPal: $${result.yourTripPalPrice.toFixed(2)}
      </div>
    `
  })

  comparisonHTML += `
      <div style="flex: 1 1 100%; padding: 10px; margin-top:10px; background: #011950; color: white; border-radius: 5px; box-sizing: border-box;">
        <a href="${yourTripPalUrls}?coupon=${couponCode}" target="_blank" style="color: white; text-decoration: none;">Book with YourTripPal</a>
      </div>
    </div>`

  comparisonContainer.innerHTML = comparisonHTML

  // Append elements to the popup div
  popupDiv.appendChild(logo)
  popupDiv.appendChild(couponContainer)
  popupDiv.appendChild(comparisonContainer)

  // Append the popup div to the body
  document.body.appendChild(popupDiv)
}

// Get booking details from the URL
function getBookingDetails() {
  const urlParams = new URLSearchParams(window.location.search)
  const origin = urlParams.get('origin')
  const destination = urlParams.get('destination')
  const departureDate = urlParams.get('departure_date')
  console.log(origin, destination, departureDate)

  return { origin, destination, departureDate }
}

// Fetch data and create the popup
fetchData().then((data) => {
  if (data && data.coupon) {
    const bookingDetails = getBookingDetails()
    const ourBusPrices = extractPricesFromPage()

    fetchYourTripPalPrices(bookingDetails).then((yourTripPalPrices) => {
      const comparisonResults = comparePrices(ourBusPrices, yourTripPalPrices)
      if (comparisonResults.length > 0) {
        showPopup(comparisonResults, data.coupon.code)
      }
    })
  } else {
    console.error('No coupon data available or API call failed.')
  }
})

// Function to fetch data from the API
function fetchData() {
  return fetch(apiUrl)
    .then((response) => {
      if (!response.ok) {
        throw new Error('Network response was not ok')
      }
      return response.json()
    })
    .then((data) => {
      return data
    })
    .catch((error) => {
      console.error('Failed to fetch data:', error)
      return null
    })
}
