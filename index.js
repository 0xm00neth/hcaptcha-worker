addEventListener('fetch', (event) => {
  event.respondWith(handleRequest(event.request))
})

/**
 * Respond to the request
 * @param {Request} request
 */
async function handleRequest(request) {
  const corsHeaders = setCorsHeaders(new Headers())

  try {
    const requestMethod = request.method

    // Allow CORS
    if (requestMethod === 'OPTIONS') {
      return new Response('', { headers: corsHeaders })
    }

    // Ensure POST request
    if (requestMethod !== 'POST') {
      return new Response('Invalid request method', {
        status: 400,
        headers: corsHeaders,
      })
    }

    // Ensure hcaptcha token given
    const hCaptchaToken = request.body['h-captcha-response']
    if (!hCaptchaToken) {
      return new Response('Invalid hCaptcha Response', {
        status: 400,
        headers: corsHeaders,
      })
    }

    if (typeof HCAPTCHA_SECRET === 'undefined') {
      throw new Error('HCAPTCHA_SECRET secret not set')
    }

    const formData = new FormData()
    formData.append('response', hCaptchaToken)
    formData.append('secret', HCAPTCHA_SECRET)

    // Verify token
    const hCaptchaResponse = await fetch(`https://hcaptcha.com/siteverify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData,
    })
    const hCaptchaBody = await hCaptchaResponse.json()

    // Handle failure
    if (!hCaptchaBody.success) {
      return new Response(
        {
          code: 400,
          message: 'hcaptcha verify faild',
        },
        {
          status: 400,
          headers: corsHeaders,
        },
      )
    }

    const proxyResponse = await fetch(
      `https://${request.body.service}.hjcore.io/credit`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request.body.payload),
      },
    )
    const proxyBody = await proxyResponse.json()

    // Success
    if (proxyBody.code === 200) {
      return new Response(proxyBody, {
        status: 200,
        headers: corsHeaders,
      })
    }
    return new Response(proxyBody, {
      status: 400,
      headers: corsHeaders,
    })
  } catch (err) {
    // Handle unexpected errors
    console.error(err)
    return new Response(err.stack, { status: 500, headers: corsHeaders })
  }
}

// Set the required CORS headers
function setCorsHeaders(headers) {
  headers.set('Access-Control-Allow-Origin', '*')
  headers.set('Access-Control-Allow-Methods', 'POST')
  headers.set('Access-Control-Allow-Headers')
  headers.set('Access-Control-Max-Age', 1728185)
  return headers
}
