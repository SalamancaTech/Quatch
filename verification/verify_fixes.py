
from playwright.sync_api import sync_playwright
import os

def run():
    file_path = os.path.abspath('index.html')
    url = f'file://{file_path}'

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto(url)

        # Dismiss initial modal
        page.click('#modal-btn')
        page.wait_for_selector('#game-modal', state='hidden')

        # Open Menu
        page.click('#menu-btn')
        page.wait_for_selector('#menu-dropdown', state='visible')
        print('Menu opened')

        # Click outside (e.g., on the opponent area which is on the left)
        # We force the click to avoid any interception issues if elements overlap strangely,
        # but standard click should work if layout is correct.
        page.click('#opponent-area', position={'x': 10, 'y': 10})

        # Verify menu closed
        page.wait_for_selector('#menu-dropdown', state='hidden')
        print('Menu closed by clicking outside')

        # --- Test 2: Button Disappearance ---

        # Verify button exists initially
        page.wait_for_selector('#action-button', state='visible')
        print('Action button visible')

        # Click Finish Swap
        page.click('#action-button')

        # Verify button hidden
        page.wait_for_selector('#action-button', state='hidden')
        print('Action button hidden after swap')

        browser.close()

if __name__ == '__main__':
    run()
