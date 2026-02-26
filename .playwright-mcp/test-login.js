const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();

  // Collect console messages and network errors for debugging
  const consoleLogs = [];
  const networkErrors = [];
  page.on('console', msg => consoleLogs.push(`[${msg.type()}] ${msg.text()}`));
  page.on('requestfailed', req => networkErrors.push(`FAILED: ${req.method()} ${req.url()} - ${req.failure()?.errorText}`));

  try {
    // Step 1: Clear state by navigating to blank page
    console.log('=== Step 1: Navigating to blank page to clear state ===');
    await page.goto('about:blank');

    // Step 2: Navigate to login page
    console.log('=== Step 2: Navigating to https://ayomagic.com/login ===');
    const loginResponse = await page.goto('https://ayomagic.com/login', {
      waitUntil: 'networkidle',
      timeout: 30000
    });
    console.log(`Login page status: ${loginResponse.status()}`);
    console.log(`Login page URL: ${page.url()}`);

    await page.screenshot({ path: '.playwright-mcp/step1-login-page.png', fullPage: false });
    console.log('Screenshot: step1-login-page.png');

    // Check what's on the page
    const pageTitle = await page.title();
    console.log(`Page title: ${pageTitle}`);

    // Look for the login form elements
    const emailInput = await page.$('input[name="email"], input[type="email"], #email');
    const passwordInput = await page.$('input[name="password"], input[type="password"], #password');
    console.log(`Email input found: ${!!emailInput}`);
    console.log(`Password input found: ${!!passwordInput}`);

    if (!emailInput || !passwordInput) {
      // Try to find any inputs on the page
      const allInputs = await page.$$('input');
      console.log(`Total input elements on page: ${allInputs.length}`);
      for (const input of allInputs) {
        const type = await input.getAttribute('type');
        const name = await input.getAttribute('name');
        const id = await input.getAttribute('id');
        const placeholder = await input.getAttribute('placeholder');
        console.log(`  Input: type=${type}, name=${name}, id=${id}, placeholder=${placeholder}`);
      }
    }

    // Step 3: Fill email
    console.log('=== Step 3: Filling email ===');
    if (emailInput) {
      await emailInput.click();
      await emailInput.fill('admin@ayomagic.com');
      console.log('Email filled via direct element');
    } else {
      // Try various selectors
      try {
        await page.fill('input[name="email"]', 'admin@ayomagic.com');
        console.log('Email filled via name selector');
      } catch {
        try {
          await page.fill('input[type="email"]', 'admin@ayomagic.com');
          console.log('Email filled via type selector');
        } catch {
          await page.fill('#email', 'admin@ayomagic.com');
          console.log('Email filled via id selector');
        }
      }
    }

    // Step 4: Fill password
    console.log('=== Step 4: Filling password ===');
    if (passwordInput) {
      await passwordInput.click();
      await passwordInput.fill('admin123');
      console.log('Password filled via direct element');
    } else {
      try {
        await page.fill('input[name="password"]', 'admin123');
        console.log('Password filled via name selector');
      } catch {
        await page.fill('input[type="password"]', 'admin123');
        console.log('Password filled via type selector');
      }
    }

    await page.screenshot({ path: '.playwright-mcp/step2-form-filled.png', fullPage: false });
    console.log('Screenshot: step2-form-filled.png');

    // Step 5: Click Sign In
    console.log('=== Step 5: Clicking Sign In button ===');
    // Try multiple selectors for the sign-in button
    let clicked = false;
    const buttonSelectors = [
      'button:has-text("Sign In")',
      'button:has-text("Sign in")',
      'button:has-text("Login")',
      'button:has-text("Log in")',
      'button:has-text("Log In")',
      'input[type="submit"]',
      'button[type="submit"]',
      'form button',
    ];

    for (const sel of buttonSelectors) {
      try {
        await page.click(sel, { timeout: 2000 });
        console.log(`Clicked button with selector: ${sel}`);
        clicked = true;
        break;
      } catch {
        // try next selector
      }
    }

    if (!clicked) {
      // List all buttons for debugging
      const allButtons = await page.$$('button, input[type="submit"], a.btn');
      console.log(`Total button-like elements: ${allButtons.length}`);
      for (const btn of allButtons) {
        const text = await btn.textContent();
        const tag = await btn.evaluate(el => el.tagName);
        console.log(`  ${tag}: "${text.trim()}"`);
      }
      console.log('WARNING: Could not click any sign-in button!');
    }

    // Step 6: Wait up to 10 seconds for navigation
    console.log('=== Step 6: Waiting for navigation (up to 10s) ===');
    try {
      await page.waitForURL('**/dashboard**', { timeout: 10000 });
      console.log('Successfully navigated to dashboard!');
    } catch {
      console.log('Did NOT navigate to dashboard within 10 seconds.');
      // Wait a bit more and check anyway
      await page.waitForTimeout(2000);
    }

    // Step 7: Report final state
    console.log('=== Step 7: Final state ===');
    const finalUrl = page.url();
    console.log(`Final URL: ${finalUrl}`);
    console.log(`Final page title: ${await page.title()}`);

    // Get visible text content
    const bodyText = await page.evaluate(() => {
      // Get visible text, limited to first 2000 chars
      return document.body?.innerText?.substring(0, 2000) || 'No body text';
    });
    console.log(`\n--- Visible page text (first 2000 chars) ---`);
    console.log(bodyText);
    console.log(`--- End of visible text ---\n`);

    // Check for error messages
    const errorMessages = await page.$$eval(
      '.alert, .error, .text-danger, .invalid-feedback, [role="alert"], .notification',
      els => els.map(el => el.textContent.trim()).filter(t => t.length > 0)
    );
    if (errorMessages.length > 0) {
      console.log('Error/alert messages found on page:');
      errorMessages.forEach(msg => console.log(`  - ${msg}`));
    }

    // Step 8: Take final screenshot
    console.log('=== Step 8: Taking final screenshot ===');
    await page.screenshot({ path: '.playwright-mcp/step3-final-state.png', fullPage: false });
    console.log('Screenshot saved: step3-final-state.png');

    await page.screenshot({ path: '.playwright-mcp/step3-final-state-fullpage.png', fullPage: true });
    console.log('Full-page screenshot saved: step3-final-state-fullpage.png');

    // Summary
    console.log('\n========== SUMMARY ==========');
    if (finalUrl.includes('/dashboard')) {
      console.log('RESULT: LOGIN SUCCESSFUL - Redirected to dashboard');
    } else if (finalUrl.includes('/login')) {
      console.log('RESULT: LOGIN FAILED - Still on login page');
    } else {
      console.log(`RESULT: UNCLEAR - Ended up at ${finalUrl}`);
    }

    if (consoleLogs.length > 0) {
      console.log(`\nBrowser console messages (${consoleLogs.length}):`);
      consoleLogs.slice(0, 20).forEach(log => console.log(`  ${log}`));
    }
    if (networkErrors.length > 0) {
      console.log(`\nNetwork errors (${networkErrors.length}):`);
      networkErrors.forEach(err => console.log(`  ${err}`));
    }

  } catch (err) {
    console.error('FATAL ERROR:', err.message);
    await page.screenshot({ path: '.playwright-mcp/error-state.png', fullPage: true }).catch(() => {});
  } finally {
    await browser.close();
  }
})();
